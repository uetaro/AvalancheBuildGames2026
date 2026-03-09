// Kudos routes (staff receiving kudos) — from staff_mobile
import { Hono } from "npm:hono";
import { getAuthUser, createServiceClient } from "./_shared.ts";

const kudosStaff = new Hono();

// GET /my-kudos — list Kudos received by the current user
kudosStaff.get("/my-kudos", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id, company_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    if (!members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const statusParam = c.req.query("status") || "";
    const fromParam = c.req.query("from") || "";
    const toParam = c.req.query("to") || "";
    const limitParam = parseInt(c.req.query("limit") || "30", 10);
    const cursorParam = c.req.query("cursor") || "";
    const limit = Math.min(Math.max(limitParam || 30, 1), 100);

    const validStatuses = ["pending", "confirmed", "rejected"];
    let statusFilter: string[] = [];
    if (statusParam) {
      statusFilter = statusParam.split(",").map((s) => s.trim()).filter(Boolean);
      const invalid = statusFilter.find((s) => !validStatuses.includes(s));
      if (invalid)
        return c.json({ error_code: "VALIDATION_ERROR", message: `Invalid status: ${invalid}` }, 400);
    }

    let query = supabase
      .from("kudos")
      .select(`
        kudos_id, kudos_status, category, message_text, points_awarded,
        created_at, confirmed_at, stay_id, company_id,
        company:company_id ( company_name )
      `)
      .eq("receiver_company_member_id", myMemberId)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (statusFilter.length > 0) query = query.in("kudos_status", statusFilter);
    if (fromParam) query = query.gte("created_at", fromParam);
    if (toParam) {
      const toDate = new Date(toParam);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lt("created_at", toDate.toISOString());
    }
    if (cursorParam) query = query.lt("created_at", cursorParam);

    const { data: kudosData, error: kudosErr } = await query;
    if (kudosErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Kudos query error: ${kudosErr.message}` }, 500);

    const items = (kudosData || []).slice(0, limit).map((k: any) => ({
      kudos_id: k.kudos_id,
      kudos_status: k.kudos_status,
      category: k.category || "Other",
      message_preview: k.message_text ? k.message_text.substring(0, 80) : "",
      points_awarded: k.points_awarded || 0,
      created_at: k.created_at,
      confirmed_at: k.confirmed_at,
      stay_id: k.stay_id,
      company_name: k.company?.company_name || null,
    }));

    const hasMore = (kudosData || []).length > limit;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    const summaryPromises = validStatuses.map(async (status) => {
      const { count, error } = await supabase
        .from("kudos")
        .select("*", { count: "exact", head: true })
        .eq("receiver_company_member_id", myMemberId)
        .eq("kudos_status", status);
      return { status, count: error ? 0 : (count || 0) };
    });
    const summaryResults = await Promise.all(summaryPromises);
    const summary: Record<string, number> = {};
    for (const r of summaryResults) summary[r.status] = r.count;

    return c.json({ items, next_cursor: nextCursor, summary }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-kudos/:id — single Kudos detail
kudosStaff.get("/my-kudos/:id", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const kudosId = c.req.param("id");
    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr || !members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const { data: kudos, error: kudosErr } = await supabase
      .from("kudos")
      .select(`
        kudos_id, kudos_status, category, message_text, points_awarded,
        created_at, confirmed_at, stay_id, company_id, receiver_company_member_id,
        company:company_id ( company_name )
      `)
      .eq("kudos_id", kudosId)
      .maybeSingle();

    if (kudosErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Query error: ${kudosErr.message}` }, 500);
    if (!kudos)
      return c.json({ error_code: "NOT_FOUND", message: "Kudos not found" }, 404);
    if (kudos.receiver_company_member_id !== myMemberId)
      return c.json({ error_code: "FORBIDDEN", message: "This kudos does not belong to you" }, 403);

    const { data: receipt } = await supabase
      .from("chain_receipt")
      .select("receipt_status, tx_hash, anchor_hash, created_at")
      .eq("kudos_id", kudosId)
      .maybeSingle();

    const proof = receipt
      ? {
          receipt_status: receipt.receipt_status,
          tx_hash: receipt.tx_hash,
          anchor_hash: receipt.anchor_hash,
          created_at: receipt.created_at,
        }
      : null;

    return c.json({
      kudos_id: kudos.kudos_id,
      kudos_status: kudos.kudos_status,
      category: kudos.category || "Other",
      message_text: kudos.message_text || "",
      points_awarded: kudos.points_awarded || 0,
      created_at: kudos.created_at,
      confirmed_at: kudos.confirmed_at,
      stay_id: kudos.stay_id,
      company_name: kudos.company?.company_name || null,
      proof,
    }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-kudos-stats — dashboard aggregate data
kudosStaff.get("/my-kudos-stats", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id, company_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr || !members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership" }, 403);

    const { company_member_id: myMemberId, company_id: companyId } = members[0];

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    // Run queries in parallel
    const [totalRes, thisMonthRes, lastMonthRes, allKudosRes, recentKudosRes, companyKudosRes] =
      await Promise.all([
        supabase
          .from("kudos")
          .select("*", { count: "exact", head: true })
          .eq("receiver_company_member_id", myMemberId),
        supabase
          .from("kudos")
          .select("*", { count: "exact", head: true })
          .eq("receiver_company_member_id", myMemberId)
          .gte("created_at", thisMonthStart),
        supabase
          .from("kudos")
          .select("*", { count: "exact", head: true })
          .eq("receiver_company_member_id", myMemberId)
          .gte("created_at", lastMonthStart)
          .lt("created_at", thisMonthStart),
        supabase
          .from("kudos")
          .select("category, created_at")
          .eq("receiver_company_member_id", myMemberId),
        supabase
          .from("kudos")
          .select("category, created_at")
          .eq("receiver_company_member_id", myMemberId)
          .gte("created_at", sixMonthsAgo),
        supabase
          .from("kudos")
          .select("receiver_company_member_id, category")
          .eq("company_id", companyId),
      ]);

    const total = totalRes.count ?? 0;
    const thisMonth = thisMonthRes.count ?? 0;
    const lastMonth = lastMonthRes.count ?? 0;
    const allKudos = allKudosRes.data ?? [];
    const recentKudos = recentKudosRes.data ?? [];
    const companyKudos = companyKudosRes.data ?? [];

    // ── Monthly trend (last 6 months) ──
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const monthBuckets: Record<string, { total: number; by_category: Record<string, number> }> = {};
    for (const key of monthKeys) monthBuckets[key] = { total: 0, by_category: {} };

    for (const k of recentKudos) {
      const d = new Date(k.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthBuckets[key]) {
        monthBuckets[key].total++;
        const cat = k.category || "Other";
        monthBuckets[key].by_category[cat] = (monthBuckets[key].by_category[cat] || 0) + 1;
      }
    }

    const monthlyTrend = monthKeys.map((key) => {
      const [yr, mo] = key.split("-");
      const d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
      return {
        month: d.toLocaleString("en-US", { month: "short" }),
        total: monthBuckets[key].total,
        by_category: monthBuckets[key].by_category,
      };
    });

    // ── Category totals (all-time) & prev-month breakdown ──
    const prevMonthStart = lastMonthStart;
    const catTotals: Record<string, number> = {};
    const prevMonthCats: Record<string, number> = {};

    for (const k of allKudos) {
      const cat = k.category || "Other";
      catTotals[cat] = (catTotals[cat] || 0) + 1;
      if (k.created_at >= prevMonthStart && k.created_at < thisMonthStart) {
        prevMonthCats[cat] = (prevMonthCats[cat] || 0) + 1;
      }
    }

    const categoryTotals = Object.entries(catTotals)
      .map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
        prev_month_count: prevMonthCats[category] || 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Best month (all-time) ──
    const monthCounts: Record<string, number> = {};
    for (const k of allKudos) {
      const d = new Date(k.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthCounts[key] = (monthCounts[key] || 0) + 1;
    }
    let bestMonthCount = 0;
    let bestMonthLabel = "";
    for (const [key, cnt] of Object.entries(monthCounts)) {
      if (cnt > bestMonthCount) {
        bestMonthCount = cnt;
        const [yr, mo] = key.split("-");
        bestMonthLabel = new Date(parseInt(yr), parseInt(mo) - 1, 1).toLocaleString("en-US", {
          month: "short",
        });
      }
    }

    // ── Hotel ranking & category distribution ──
    const staffCounts: Record<string, number> = {};
    const hotelCatCounts: Record<string, number> = {};
    for (const k of companyKudos) {
      staffCounts[k.receiver_company_member_id] =
        (staffCounts[k.receiver_company_member_id] || 0) + 1;
      const cat = k.category || "Other";
      hotelCatCounts[cat] = (hotelCatCounts[cat] || 0) + 1;
    }

    const sortedStaff = Object.entries(staffCounts).sort((a, b) => b[1] - a[1]);
    const hotelTotalStaff = sortedStaff.length;
    const myRankIdx = sortedStaff.findIndex(([id]) => id === myMemberId);
    const hotelRank = myRankIdx >= 0 ? myRankIdx + 1 : hotelTotalStaff + 1;

    const hotelTotalKudos = companyKudos.length;
    const hotelCategoryDistribution: Record<string, number> = {};
    for (const [cat, cnt] of Object.entries(hotelCatCounts)) {
      hotelCategoryDistribution[cat] =
        hotelTotalKudos > 0 ? Math.round((cnt / hotelTotalKudos) * 100) : 0;
    }

    return c.json(
      {
        total,
        this_month: thisMonth,
        last_month: lastMonth,
        best_month: { count: bestMonthCount, month_label: bestMonthLabel },
        hotel_rank: hotelRank,
        hotel_total: hotelTotalStaff,
        monthly_trend: monthlyTrend,
        category_totals: categoryTotals,
        hotel_category_distribution: hotelCategoryDistribution,
      },
      200
    );
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-point-balance — point balance, this month earned, monthly trend
kudosStaff.get("/my-point-balance", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr || !members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    const [confirmedRes, thisMonthRes, trendRes] = await Promise.all([
      // Total confirmed points (balance)
      supabase
        .from("kudos")
        .select("points_awarded")
        .eq("receiver_company_member_id", myMemberId)
        .eq("kudos_status", "confirmed"),
      // This month confirmed points
      supabase
        .from("kudos")
        .select("points_awarded")
        .eq("receiver_company_member_id", myMemberId)
        .eq("kudos_status", "confirmed")
        .gte("confirmed_at", thisMonthStart),
      // Last 6 months trend (confirmed)
      supabase
        .from("kudos")
        .select("points_awarded, confirmed_at")
        .eq("receiver_company_member_id", myMemberId)
        .eq("kudos_status", "confirmed")
        .gte("confirmed_at", sixMonthsAgo),
    ]);

    const totalBalance = (confirmedRes.data ?? []).reduce(
      (sum: number, k: { points_awarded: number }) => sum + (k.points_awarded || 0), 0
    );
    const thisMonthPoints = (thisMonthRes.data ?? []).reduce(
      (sum: number, k: { points_awarded: number }) => sum + (k.points_awarded || 0), 0
    );

    // Monthly point totals for last 6 months
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const monthBuckets: Record<string, number> = {};
    for (const key of monthKeys) monthBuckets[key] = 0;

    for (const k of (trendRes.data ?? [])) {
      const d = new Date(k.confirmed_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthBuckets[key] !== undefined) {
        monthBuckets[key] += k.points_awarded || 0;
      }
    }

    const monthlyTrend = monthKeys.map((key) => {
      const [yr, mo] = key.split("-");
      const d = new Date(parseInt(yr), parseInt(mo) - 1, 1);
      return {
        month: d.toLocaleString("en-US", { month: "short" }),
        points: monthBuckets[key],
      };
    });

    return c.json({ balance: totalBalance, this_month: thisMonthPoints, monthly_trend: monthlyTrend }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-exchange-history — current user's point exchange history
kudosStaff.get("/my-exchange-history", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberErr } = await supabase
      .from("company_member")
      .select("company_member_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (memberErr || !members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);

    const myMemberId = members[0].company_member_id;

    const limitParam = parseInt(c.req.query("limit") || "50", 10);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    const { data: exchanges, error } = await supabase
      .from("point_exchange")
      .select("exchange_id, gift_name, points_used, status, created_at, completed_at")
      .eq("company_member_id", myMemberId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Exchange query error: ${error.message}` }, 500);

    const items = (exchanges ?? []).map((e: any) => ({
      exchange_id: e.exchange_id,
      gift_name: e.gift_name,
      points_used: e.points_used,
      status: e.status,
      created_at: e.created_at,
      completed_at: e.completed_at ?? null,
    }));

    const totalUsed = (exchanges ?? []).reduce((sum: number, e: any) => sum + (e.points_used || 0), 0);

    return c.json({ items, total_used: totalUsed }, 200);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-career-history — work history with on-chain verification status
kudosStaff.get("/my-career-history", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();

    // All company_member records (active + ended) for this user
    const { data: memberships, error: memberErr } = await supabase
      .from("company_member")
      .select(`
        company_member_id,
        company_id,
        member_role,
        member_status,
        job_title,
        created_at,
        ended_at,
        company:company_id ( company_name, company_logo_url, company_city, company_region )
      `)
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (memberErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Query error: ${memberErr.message}` }, 500);

    if (!memberships || memberships.length === 0) {
      return c.json({ history: [] });
    }

    // Get chain_affiliation status for each membership
    const memberIds = memberships.map((m: any) => m.company_member_id);
    const { data: chainData } = await supabase
      .from("chain_affiliation")
      .select("company_member_id, receipt_status, tx_hash, anchor_hash, confirmed_at, chain_id")
      .in("company_member_id", memberIds);

    const chainMap: Record<string, any> = {};
    for (const ch of (chainData || [])) {
      chainMap[ch.company_member_id] = ch;
    }

    // Count kudos received at each company
    const { data: kudosCounts } = await supabase
      .from("kudos")
      .select("receiver_company_member_id")
      .in("receiver_company_member_id", memberIds)
      .in("kudos_status", ["confirmed", "pending"]);

    const kudosCountMap: Record<string, number> = {};
    for (const k of (kudosCounts || [])) {
      kudosCountMap[k.receiver_company_member_id] = (kudosCountMap[k.receiver_company_member_id] || 0) + 1;
    }

    const history = memberships.map((m: any) => {
      const chain = chainMap[m.company_member_id] || null;
      const company = m.company as any;
      return {
        company_member_id: m.company_member_id,
        company_id: m.company_id,
        company_name: company?.company_name || "Unknown",
        company_logo_url: company?.company_logo_url || null,
        company_location: [company?.company_city, company?.company_region].filter(Boolean).join(", ") || null,
        member_role: m.member_role,
        member_status: m.member_status,
        job_title: m.job_title,
        started_at: m.created_at,
        ended_at: m.ended_at,
        kudos_count: kudosCountMap[m.company_member_id] || 0,
        on_chain: chain ? {
          status: chain.receipt_status,
          tx_hash: chain.tx_hash,
          anchor_hash: chain.anchor_hash,
          confirmed_at: chain.confirmed_at,
          chain_id: chain.chain_id,
          explorer_url: chain.tx_hash
            ? `https://testnet.snowtrace.io/tx/${chain.tx_hash}`
            : null,
        } : null,
      };
    });

    return c.json({ history });
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

export default kudosStaff;
