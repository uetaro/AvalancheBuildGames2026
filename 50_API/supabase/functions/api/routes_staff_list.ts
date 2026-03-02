// Routes for Guest Staff List (on-duty only)
import { Hono } from "npm:hono";
import { errorResponse, validateGuestSession, createServiceClient } from "./_shared.ts";

const staff = new Hono();

// GET /public-staff-list
// Returns on-duty staff for the guest's stay company
staff.get("/public-staff-list", async (c) => {
  try {
    // 1) Validate guest session
    const guestToken = c.req.header("X-Guest-Session-Token") ?? null;
    const result = await validateGuestSession(guestToken);

    if (!result.ok) {
      return c.json(
        errorResponse(result.error_code, result.message),
        result.status as any
      );
    }

    const { company_id } = result.session;
    const db = createServiceClient();

    // 2) Parse query params
    const url = new URL(c.req.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
      200
    );
    const jobTitle = url.searchParams.get("job_title") ?? null;
    const cursor = url.searchParams.get("cursor") ?? null;

    // 3) Get active on_duty_sessions for this company
    let dutyQuery = db
      .from("on_duty_session")
      .select("company_member_id, started_at")
      .eq("company_id", company_id)
      .eq("duty_status", "active")
      .order("started_at", { ascending: false })
      .limit(limit + 1); // +1 for next_cursor detection

    if (cursor) {
      dutyQuery = dutyQuery.lt("started_at", cursor);
    }

    const { data: sessions, error: dutyError } = await dutyQuery;

    if (dutyError) {
      console.error("Error fetching on_duty_sessions:", dutyError);
      return c.json(
        errorResponse("INTERNAL_ERROR", "Database error fetching duty sessions"),
        500
      );
    }

    if (!sessions || sessions.length === 0) {
      return c.json({ items: [], next_cursor: null }, 200);
    }

    // Determine next_cursor
    let next_cursor: string | null = null;
    const pageItems = sessions.slice(0, limit);
    if (sessions.length > limit) {
      next_cursor = pageItems[pageItems.length - 1].started_at;
    }

    const memberIds = pageItems.map((s) => s.company_member_id);

    // 4) Load company_members (active employees only)
    let memberQuery = db
      .from("company_member")
      .select(
        "company_member_id, user_id, job_title, display_name_override, member_status, member_role, public_profile_json"
      )
      .in("company_member_id", memberIds)
      .eq("company_id", company_id)
      .eq("member_status", "active")
      .in("member_role", ["employee", "staff", "manager"]);

    const { data: members, error: memberError } = await memberQuery;

    if (memberError) {
      console.error("Error fetching company_members:", memberError);
      return c.json(
        errorResponse("INTERNAL_ERROR", "Database error fetching members"),
        500
      );
    }

    if (!members || members.length === 0) {
      return c.json({ items: [], next_cursor: null }, 200);
    }

    // 5) Load user display names (fallback)
    const userIds = members.map((m) => m.user_id).filter(Boolean);
    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: users, error: userError } = await db
        .from("user")
        .select("user_id, display_name")
        .in("user_id", userIds);

      if (userError) {
        console.error("Error fetching users (non-fatal):", userError);
      } else {
        userMap = new Map(
          (users ?? []).map((u: any) => [u.user_id, u.display_name])
        );
      }
    }

    // 6) Build session lookup for on_duty_started_at
    const sessionMap = new Map(
      pageItems.map((s) => [s.company_member_id, s.started_at])
    );

    // 7) Assemble response items
    // Display name priority: display_name_override > user.display_name > "(No Name)"
    const items = members
      .filter((m) => {
        if (jobTitle) {
          return (m.job_title ?? "")
            .toLowerCase()
            .includes(jobTitle.toLowerCase());
        }
        return true;
      })
      .map((m) => ({
        company_member_id: m.company_member_id,
        display_name:
          m.display_name_override ??
          userMap.get(m.user_id) ??
          "(No Name)",
        job_title: m.job_title ?? null,
        profile_image_url:
          (m.public_profile_json as any)?.profile_image_url ?? null,
        on_duty_started_at: sessionMap.get(m.company_member_id) ?? null,
      }))
      // Sort by on_duty_started_at desc (most recent first)
      .sort((a, b) => {
        const ta = a.on_duty_started_at
          ? new Date(a.on_duty_started_at).getTime()
          : 0;
        const tb = b.on_duty_started_at
          ? new Date(b.on_duty_started_at).getTime()
          : 0;
        return tb - ta;
      });

    console.log(
      `Staff list: company=${company_id}, on_duty=${sessions.length}, returned=${items.length}`
    );

    return c.json({ items, next_cursor }, 200);
  } catch (error) {
    console.error("Unexpected error in public-staff-list:", error);
    return c.json(
      errorResponse("INTERNAL_ERROR", "Unexpected error occurred", {
        error: error.message,
      }),
      500
    );
  }
});

export default staff;