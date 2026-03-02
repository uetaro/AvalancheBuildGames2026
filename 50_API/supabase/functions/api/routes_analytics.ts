// Analytics routes: aggregated company & individual analytics from real DB data
import { Hono } from "npm:hono";
import { authAndAuthorize, ROUTE_PREFIX } from "./_shared.ts";

const analytics = new Hono();

// ─── ops-analytics ─────────────────────────────────────────
// POST /make-server-20781d19/ops-analytics
// Returns aggregated analytics data: company-wide + per-member.
analytics.post(`${ROUTE_PREFIX}/ops-analytics`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, days = 30 } = body ?? {};

    const authResult = await authAndAuthorize(access_token, company_id, "ops-analytics");
    if (!authResult.ok) {
      return c.json(authResult.body, authResult.status as any);
    }
    const { svc } = authResult;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);
    const sinceISO = sinceDate.toISOString();

    // ── Fetch all kudos in period ──
    const { data: kudosList, error: kudosErr } = await svc
      .from("kudos")
      .select("kudos_id, stay_id, receiver_company_member_id, category, message_text, points_awarded, kudos_status, created_at")
      .eq("company_id", company_id)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });

    if (kudosErr) {
      console.log("[ops-analytics] Kudos query error:", kudosErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Kudos query failed: ${kudosErr.message}` }, 500);
    }

    // ── Fetch all stays in period ──
    const { data: staysList, error: staysErr } = await svc
      .from("stay")
      .select("stay_id, room_id, stay_status, checkin_at, checkout_at, created_by_company_member_id, created_at")
      .eq("company_id", company_id)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false });

    if (staysErr) {
      console.log("[ops-analytics] Stays query error:", staysErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Stays query failed: ${staysErr.message}` }, 500);
    }

    // ── Fetch all active members ──
    const { data: membersList, error: membersErr } = await svc
      .from("company_member")
      .select("company_member_id, user_id, member_role, job_title, display_name_override, member_status")
      .eq("company_id", company_id)
      .eq("member_status", "active");

    if (membersErr) {
      console.log("[ops-analytics] Members query error:", membersErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Members query failed: ${membersErr.message}` }, 500);
    }

    // Fetch user display names
    const userIds = (membersList || []).map((m: any) => m.user_id);
    const { data: usersList } = await svc
      .from("user")
      .select("user_id, display_name, email")
      .in("user_id", userIds);

    const userMap: Record<string, { display_name: string; email: string | null }> = {};
    for (const u of (usersList || [])) {
      userMap[u.user_id] = { display_name: u.display_name || "Unknown", email: u.email };
    }

    const kudos = kudosList || [];
    const stays = staysList || [];
    const members = membersList || [];

    // ── Aggregate company-level stats ──
    const confirmedKudos = kudos.filter((k: any) => k.kudos_status === "confirmed");
    const totalKudos = confirmedKudos.length;
    const totalPoints = confirmedKudos.reduce((s: number, k: any) => s + (k.points_awarded || 0), 0);
    const totalStays = stays.length;
    const completedStays = stays.filter((s: any) => s.stay_status === "completed").length;
    const activeStays = stays.filter((s: any) => s.stay_status === "active").length;

    // Daily kudos trend
    const dailyKudos: Record<string, number> = {};
    const dailyStays: Record<string, number> = {};
    for (let d = 0; d < days; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - d));
      const key = date.toISOString().slice(0, 10);
      dailyKudos[key] = 0;
      dailyStays[key] = 0;
    }
    for (const k of confirmedKudos) {
      const key = k.created_at.slice(0, 10);
      if (dailyKudos[key] !== undefined) dailyKudos[key]++;
    }
    for (const s of stays) {
      const key = s.created_at.slice(0, 10);
      if (dailyStays[key] !== undefined) dailyStays[key]++;
    }

    const kudosTrend = Object.entries(dailyKudos).map(([date, count]) => ({ date, count }));
    const staysTrend = Object.entries(dailyStays).map(([date, count]) => ({ date, count }));

    // Category breakdown
    const categoryMap: Record<string, { count: number; points: number }> = {};
    for (const k of confirmedKudos) {
      if (!categoryMap[k.category]) categoryMap[k.category] = { count: 0, points: 0 };
      categoryMap[k.category].count++;
      categoryMap[k.category].points += k.points_awarded || 0;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, stats]) => ({ category, count: stats.count, points: stats.points }))
      .sort((a, b) => b.count - a.count);

    // Recent kudos messages (last 10)
    const recentKudos = confirmedKudos.slice(0, 10).map((k: any) => ({
      kudos_id: k.kudos_id,
      category: k.category,
      message_text: k.message_text,
      receiver_company_member_id: k.receiver_company_member_id,
      points_awarded: k.points_awarded,
      created_at: k.created_at,
    }));

    // ── Per-member analytics ──
    const memberAnalytics = members.map((m: any) => {
      const user = userMap[m.user_id] || { display_name: "Unknown", email: null };
      const memberKudos = confirmedKudos.filter((k: any) => k.receiver_company_member_id === m.company_member_id);
      const memberStays = stays.filter((s: any) => s.created_by_company_member_id === m.company_member_id);
      const memberPoints = memberKudos.reduce((s: number, k: any) => s + (k.points_awarded || 0), 0);

      // Daily trend for this member
      const memberDailyKudos: Record<string, number> = {};
      for (const key of Object.keys(dailyKudos)) {
        memberDailyKudos[key] = 0;
      }
      for (const k of memberKudos) {
        const key = k.created_at.slice(0, 10);
        if (memberDailyKudos[key] !== undefined) memberDailyKudos[key]++;
      }
      const memberTrend = Object.entries(memberDailyKudos).map(([date, count]) => ({ date, count }));

      // Category breakdown per member
      const memberCatMap: Record<string, number> = {};
      for (const k of memberKudos) {
        memberCatMap[k.category] = (memberCatMap[k.category] || 0) + 1;
      }
      const memberCategoryBreakdown = Object.entries(memberCatMap)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count);

      // Category scores (normalized to 0-100 scale based on max possible)
      const allCategories = ["Service", "Cleanliness", "Dining", "Amenities", "Communication", "Friendliness"];
      const maxPerCategory = Math.max(1, Math.ceil(memberKudos.length / allCategories.length) * 2);
      const categoryScores = allCategories.map(cat => {
        const count = memberCatMap[cat] || 0;
        // Score: base 50 + up to 50 based on kudos in this category relative to expected
        const score = Math.min(100, Math.round(50 + (count / Math.max(1, maxPerCategory)) * 50));
        return { category: cat, score, count };
      });

      // Week-over-week growth
      const thisWeekKudos = memberKudos.filter((k: any) => {
        const d = new Date(k.created_at);
        const now = new Date();
        return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
      }).length;
      const lastWeekKudos = memberKudos.filter((k: any) => {
        const d = new Date(k.created_at);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return diff >= 7 * 24 * 60 * 60 * 1000 && diff < 14 * 24 * 60 * 60 * 1000;
      }).length;
      const weekGrowth = lastWeekKudos > 0
        ? Math.round(((thisWeekKudos - lastWeekKudos) / lastWeekKudos) * 100 * 10) / 10
        : (thisWeekKudos > 0 ? 100 : 0);

      // Recent kudos for this member
      const memberRecentKudos = memberKudos.slice(0, 5).map((k: any) => ({
        category: k.category,
        message_text: k.message_text,
        points_awarded: k.points_awarded,
        created_at: k.created_at,
      }));

      return {
        company_member_id: m.company_member_id,
        display_name: m.display_name_override || user.display_name,
        email: user.email,
        job_title: m.job_title,
        member_role: m.member_role,
        total_kudos: memberKudos.length,
        total_points: memberPoints,
        total_stays_created: memberStays.length,
        avg_daily: Math.round((memberKudos.length / days) * 10) / 10,
        week_growth: weekGrowth,
        kudos_trend: memberTrend,
        category_breakdown: memberCategoryBreakdown,
        category_scores: categoryScores,
        recent_kudos: memberRecentKudos,
      };
    }).sort((a: any, b: any) => b.total_kudos - a.total_kudos);

    // Avg kudos per day
    const avgKudosPerDay = Math.round((totalKudos / Math.max(1, days)) * 10) / 10;

    // Company category scores (aggregated)
    const allCategories = ["Service", "Cleanliness", "Dining", "Amenities", "Communication", "Friendliness"];
    const companyCategoryScores = allCategories.map(cat => {
      const memberScores = memberAnalytics.map((m: any) => {
        const cs = m.category_scores.find((c: any) => c.category === cat);
        return cs ? cs.score : 50;
      });
      const avgScore = memberScores.length > 0
        ? Math.round(memberScores.reduce((a: number, b: number) => a + b, 0) / memberScores.length)
        : 50;
      return { category: cat, score: avgScore, count: categoryMap[cat]?.count || 0 };
    });

    console.log(`[ops-analytics] OK: ${totalKudos} kudos, ${totalStays} stays, ${members.length} members`);

    return c.json({
      period_days: days,
      since: sinceISO,
      company: {
        total_kudos: totalKudos,
        total_points: totalPoints,
        total_stays: totalStays,
        completed_stays: completedStays,
        active_stays: activeStays,
        avg_kudos_per_day: avgKudosPerDay,
        kudos_trend: kudosTrend,
        stays_trend: staysTrend,
        category_breakdown: categoryBreakdown,
        category_scores: companyCategoryScores,
        recent_kudos: recentKudos,
      },
      members: memberAnalytics,
    });
  } catch (e) {
    console.log("[ops-analytics] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Analytics failed: ${e}` }, 500);
  }
});

export default analytics;
