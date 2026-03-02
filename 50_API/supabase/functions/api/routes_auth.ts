// Auth routes: signup, check-membership, ops-members
import { Hono } from "npm:hono";
import { createServiceClient, createAuthClient, authAndAuthorize, ROUTE_PREFIX } from "./_shared.ts";

const auth = new Hono();

// ─── signup ────────────────────────────────────────────────
// POST /make-server-20781d19/signup
// Creates a Supabase Auth user + user table record.
// Does NOT create company_member — that happens via affiliation request approval.
auth.post(`${ROUTE_PREFIX}/signup`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { email, password, name } = body ?? {};

    if (!email || !password) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "email and password are required" }, 400);
    }

    const supabaseSvc = createServiceClient();

    // 1) Create Supabase Auth user
    const { data: authData, error: authErr } = await supabaseSvc.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || "User" },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });

    if (authErr) {
      console.log("[signup] Auth error:", authErr.message);
      return c.json({ error_code: "AUTH_ERROR", message: authErr.message }, 400);
    }

    const authUserId = authData.user.id;

    // 2) Upsert user record (user_id = auth uid)
    const { error: userErr } = await supabaseSvc
      .from("user")
      .upsert({
        user_id: authUserId,
        cognito_sub: authUserId,
        email,
        display_name: name || "User",
        user_type: "company_member",
        version: 1,
      }, { onConflict: "user_id" });

    if (userErr) {
      console.log("[signup] User table error:", userErr.message);
    }

    // NOTE: company_member is NOT created here.
    // The user must submit an affiliation request (via another system),
    // and a manager approves it via /ops-affiliation-requests-decide.

    console.log("[signup] User created:", authUserId, "(no company linked yet)");
    return c.json({
      status: "ok",
      message: "User created successfully. Please submit an affiliation request to join a company.",
      auth_user_id: authUserId,
      email,
    });
  } catch (e) {
    console.log("[signup] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Signup failed: ${e}` }, 500);
  }
});

// ─── check-membership ──────────────────────────────────────
// POST /make-server-20781d19/check-membership
// Verifies the auth user has active staff/manager membership
auth.post(`${ROUTE_PREFIX}/check-membership`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const token = body?.access_token;
    if (!token) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Missing access_token in body" }, 401);
    }

    const supabaseAuth = createAuthClient(token);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      console.log("[check-membership] Invalid token:", userErr?.message);
      return c.json({ error_code: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const authUserId = userData.user.id;
    const supabaseSvc = createServiceClient();

    // Query company_member with company info
    const { data: memberships, error: memErr } = await supabaseSvc
      .from("company_member")
      .select("company_member_id, company_id, member_role, member_status, company:company_id(company_id, company_name, company_status)")
      .eq("user_id", authUserId)
      .in("member_role", ["staff", "manager"])
      .eq("member_status", "active");

    if (memErr) {
      console.log("[check-membership] Query error:", memErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: "Failed to check membership" }, 500);
    }

    if (!memberships || memberships.length === 0) {
      console.log("[check-membership] No active membership for user:", authUserId);
      return c.json({
        error_code: "NO_MEMBERSHIP",
        message: "This account does not have hotel operation privileges. Please contact your administrator.",
      }, 403);
    }

    // Filter out suspended companies
    const activeMemberships = memberships.filter((m: any) => {
      const comp = m.company;
      return comp && comp.company_status === "active";
    });

    if (activeMemberships.length === 0) {
      console.log("[check-membership] All companies suspended for user:", authUserId);
      return c.json({
        error_code: "COMPANY_SUSPENDED",
        message: "Your hotel is currently suspended. Please contact your administrator.",
      }, 403);
    }

    console.log("[check-membership] OK user:", authUserId, "memberships:", activeMemberships.length);
    return c.json({
      status: "ok",
      user_id: authUserId,
      email: userData.user.email,
      name: userData.user.user_metadata?.name || null,
      memberships: activeMemberships.map((m: any) => ({
        company_member_id: m.company_member_id,
        company_id: m.company_id,
        company_name: m.company?.company_name || "Unknown",
        member_role: m.member_role,
      })),
    });
  } catch (e) {
    console.log("[check-membership] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Check failed: ${e}` }, 500);
  }
});

// ─── ops-members ───────────────────────────────────────────
// POST /make-server-20781d19/ops-members
// Returns all active members of the specified company.
// Requires the caller to be an active staff/manager of the same company.
auth.post(`${ROUTE_PREFIX}/ops-members`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id } = body ?? {};

    const auth_result = await authAndAuthorize(access_token, company_id, "ops-members");
    if (!auth_result.ok) {
      return c.json(auth_result.body, auth_result.status as any);
    }
    const { svc: supabaseSvc } = auth_result;

    // Fetch all active members of the company, joining with user table
    const { data: members, error: memErr } = await supabaseSvc
      .from("company_member")
      .select("company_member_id, user_id, member_role, member_status, job_title, display_name_override, created_at")
      .eq("company_id", company_id)
      .eq("member_status", "active")
      .order("created_at", { ascending: true });

    if (memErr) {
      console.log("[ops-members] Query error:", memErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to fetch members: ${memErr.message}` }, 500);
    }

    if (!members || members.length === 0) {
      console.log("[ops-members] No active members for company:", company_id);
      return c.json({ items: [] });
    }

    // Fetch user records for display_name / email
    const userIds = members.map((m: any) => m.user_id);
    const { data: users, error: userErr } = await supabaseSvc
      .from("user")
      .select("user_id, display_name, email")
      .in("user_id", userIds);

    if (userErr) {
      console.log("[ops-members] User query error:", userErr.message);
    }

    const userMap: Record<string, { display_name: string | null; email: string | null }> = {};
    for (const u of (users || [])) {
      userMap[u.user_id] = { display_name: u.display_name, email: u.email };
    }

    const items = members.map((m: any) => {
      const user = userMap[m.user_id] || {};
      return {
        company_member_id: m.company_member_id,
        user_id: m.user_id,
        member_role: m.member_role,
        job_title: m.job_title || null,
        display_name: m.display_name_override || user.display_name || "Unknown",
        email: user.email || null,
        created_at: m.created_at,
      };
    });

    console.log("[ops-members] OK: returned", items.length, "members for company:", company_id);
    return c.json({ items });
  } catch (e) {
    console.log("[ops-members] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

export default auth;