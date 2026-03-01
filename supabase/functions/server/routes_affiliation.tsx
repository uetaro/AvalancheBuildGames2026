// Affiliation request routes: list requests, approve/reject
// Requires company_member_request table in DB.
import { Hono } from "npm:hono";
import { createServiceClient, authenticateUser, ROUTE_PREFIX } from "./_shared.tsx";

const affiliation = new Hono();

// ─── Helper: authorize manager ─────────────────────────────
async function authorizeManager(
  svc: ReturnType<typeof createServiceClient>,
  companyId: string,
  userId: string,
): Promise<{ company_member_id: string } | null> {
  const { data: member } = await svc
    .from("company_member")
    .select("company_member_id, member_role, member_status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("member_role", "manager")
    .eq("member_status", "active")
    .maybeSingle();
  return member ? { company_member_id: member.company_member_id } : null;
}

// ─── ops-affiliation-requests ──────────────────────────────
// POST /make-server-20781d19/ops-affiliation-requests
// Returns list of affiliation requests for the company (default: pending).
// Adapted from design doc DD-OPS-AFFREQ-LIST (GET -> POST for auth pattern).
affiliation.post(`${ROUTE_PREFIX}/ops-affiliation-requests`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, status, limit: reqLimit, cursor } = body ?? {};

    if (!access_token) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Missing access_token" }, 401);
    }
    if (!company_id) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "company_id is required" }, 400);
    }

    // 1) Authenticate
    const authResult = await authenticateUser(access_token);
    if ("error" in authResult) {
      console.log("[ops-affiliation-requests] Invalid token:", authResult.error);
      return c.json({ error_code: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const svc = createServiceClient();

    // 2) Authorize — manager only
    const mgr = await authorizeManager(svc, company_id, authResult.userId);
    if (!mgr) {
      console.log("[ops-affiliation-requests] Not a manager:", authResult.userId);
      return c.json({ error_code: "FORBIDDEN", message: "Manager privileges required" }, 403);
    }

    // 3) Parse status filter (default: pending)
    const statuses = status
      ? (status as string).split(",").map((s: string) => s.trim()).filter(Boolean)
      : ["pending"];
    const validStatuses = ["pending", "approved", "rejected", "cancelled"];
    for (const s of statuses) {
      if (!validStatuses.includes(s)) {
        return c.json({ error_code: "VALIDATION_ERROR", message: `Invalid status: ${s}` }, 400);
      }
    }

    // 4) Build query
    const pageLimit = Math.min(Math.max(Number(reqLimit) || 50, 1), 200);

    let query = svc
      .from("company_member_request")
      .select("company_member_request_id, user_id, requested_role, request_status, request_note, job_title, review_note, reviewed_by_company_member_id, reviewed_at, version, created_at, updated_at")
      .eq("company_id", company_id)
      .in("request_status", statuses)
      .order("created_at", { ascending: false })
      .limit(pageLimit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: requests, error: reqErr } = await query;

    if (reqErr) {
      console.log("[ops-affiliation-requests] Query error:", reqErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Query failed: ${reqErr.message}` }, 500);
    }

    if (!requests || requests.length === 0) {
      return c.json({ items: [], next_cursor: null });
    }

    // 5) Join user display names
    const userIds = [...new Set(requests.map((r: any) => r.user_id))];
    const { data: users } = await svc
      .from("user")
      .select("user_id, display_name, email")
      .in("user_id", userIds);

    const userMap: Record<string, { display_name: string | null; email: string | null }> = {};
    for (const u of (users || [])) {
      userMap[u.user_id] = { display_name: u.display_name, email: u.email };
    }

    const items = requests.map((r: any) => ({
      company_member_request_id: r.company_member_request_id,
      user_id: r.user_id,
      app_display_name: userMap[r.user_id]?.display_name || "Unknown",
      email: userMap[r.user_id]?.email || null,
      requested_role: r.requested_role,
      request_status: r.request_status,
      request_note: r.request_note,
      job_title: r.job_title || null,
      review_note: r.review_note,
      reviewed_by_company_member_id: r.reviewed_by_company_member_id,
      reviewed_at: r.reviewed_at,
      version: r.version,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    const next_cursor = requests.length === pageLimit
      ? requests[requests.length - 1].created_at
      : null;

    console.log("[ops-affiliation-requests] OK:", items.length, "requests for company:", company_id);
    return c.json({ items, next_cursor });
  } catch (e) {
    console.log("[ops-affiliation-requests] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

// ─── ops-affiliation-requests-decide ───────────────────────
// POST /make-server-20781d19/ops-affiliation-requests-decide
// Approve or reject an affiliation request.
// Since RPC is not available in Make environment, uses direct queries.
// TODO: Replace with RPC (ops_decide_company_member_request) in production.
affiliation.post(`${ROUTE_PREFIX}/ops-affiliation-requests-decide`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const {
      access_token,
      company_id,
      company_member_request_id,
      decision,
      review_note,
      granted_role,
      expected_version,
    } = body ?? {};

    // ── Validation ──
    if (!access_token) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Missing access_token" }, 401);
    }
    if (!company_id || !company_member_request_id || !decision) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "company_id, company_member_request_id, and decision are required" }, 400);
    }
    if (!["approve", "reject"].includes(decision)) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "decision must be 'approve' or 'reject'" }, 400);
    }
    if (expected_version == null) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "expected_version is required" }, 400);
    }

    const role = granted_role || "staff";
    if (decision === "approve" && !["employee", "staff", "manager"].includes(role)) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "granted_role must be employee, staff, or manager" }, 400);
    }
    // Map 'employee' to 'staff' for company_member table (our system uses staff/manager)
    const memberRole = role === "employee" ? "staff" : role;

    // ── Auth ──
    const authResult = await authenticateUser(access_token);
    if ("error" in authResult) {
      console.log("[ops-affiliation-decide] Invalid token:", authResult.error);
      return c.json({ error_code: "UNAUTHORIZED", message: "Invalid token" }, 401);
    }

    const svc = createServiceClient();

    // ── Authorize: manager only ──
    const mgr = await authorizeManager(svc, company_id, authResult.userId);
    if (!mgr) {
      console.log("[ops-affiliation-decide] Not a manager:", authResult.userId);
      return c.json({ error_code: "FORBIDDEN", message: "Manager privileges required" }, 403);
    }

    // ── Fetch the request ──
    const { data: request, error: fetchErr } = await svc
      .from("company_member_request")
      .select("*")
      .eq("company_member_request_id", company_member_request_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (fetchErr) {
      console.log("[ops-affiliation-decide] Fetch error:", fetchErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Fetch failed: ${fetchErr.message}` }, 500);
    }
    if (!request) {
      return c.json({ error_code: "REQUEST_NOT_FOUND", message: "Request not found or company mismatch" }, 404);
    }

    // ── Optimistic lock check ──
    if (request.version !== expected_version) {
      return c.json({ error_code: "VERSION_CONFLICT", message: `Version conflict: expected ${expected_version}, got ${request.version}` }, 409);
    }

    // ── Status check ──
    if (request.request_status !== "pending") {
      return c.json({ error_code: "ALREADY_DECIDED", message: `Request already ${request.request_status}` }, 409);
    }

    const decidedAt = new Date().toISOString();
    let resultCompanyMemberId: string | null = null;

    if (decision === "approve") {
      // ── Approve: create or reactivate company_member ──
      const { data: existingMember } = await svc
        .from("company_member")
        .select("company_member_id, version")
        .eq("company_id", company_id)
        .eq("user_id", request.user_id)
        .maybeSingle();

      if (existingMember) {
        // Reactivate existing member
        const { error: updateErr } = await svc
          .from("company_member")
          .update({
            member_role: memberRole,
            member_status: "active",
            job_title: request.job_title || (memberRole === "manager" ? "Manager" : null),
            ended_at: null,
            version: existingMember.version + 1,
            updated_at: decidedAt,
          })
          .eq("company_member_id", existingMember.company_member_id);

        if (updateErr) {
          console.log("[ops-affiliation-decide] Member update error:", updateErr.message);
          return c.json({ error_code: "INTERNAL_ERROR", message: `Member update failed: ${updateErr.message}` }, 500);
        }
        resultCompanyMemberId = existingMember.company_member_id;
      } else {
        // Create new company_member
        const { data: newMember, error: insertErr } = await svc
          .from("company_member")
          .insert({
            company_id,
            user_id: request.user_id,
            member_role: memberRole,
            member_status: "active",
            job_title: request.job_title || (memberRole === "manager" ? "Manager" : null),
            visibility_scope: "company",
            version: 1,
            created_at: decidedAt,
            updated_at: decidedAt,
          })
          .select("company_member_id")
          .single();

        if (insertErr) {
          console.log("[ops-affiliation-decide] Member insert error:", insertErr.message);
          return c.json({ error_code: "INTERNAL_ERROR", message: `Member creation failed: ${insertErr.message}` }, 500);
        }
        resultCompanyMemberId = newMember.company_member_id;
      }

      // Update request -> approved
      const { error: reqUpdateErr } = await svc
        .from("company_member_request")
        .update({
          request_status: "approved",
          review_note: review_note || null,
          reviewed_by_company_member_id: mgr.company_member_id,
          reviewed_at: decidedAt,
          version: request.version + 1,
          updated_at: decidedAt,
        })
        .eq("company_member_request_id", company_member_request_id);

      if (reqUpdateErr) {
        console.log("[ops-affiliation-decide] Request update error:", reqUpdateErr.message);
        return c.json({ error_code: "INTERNAL_ERROR", message: `Request update failed: ${reqUpdateErr.message}` }, 500);
      }

      // Audit log (best-effort)
      await svc.from("audit_log").insert({
        actor_company_member_id: mgr.company_member_id,
        company_id,
        action: "AFFILIATION_REQUEST_APPROVE",
        target_table: "company_member_request",
        target_id: company_member_request_id,
        detail_json: { decision: "approve", granted_role: memberRole },
        version: 1,
      }).then(({ error }) => {
        if (error) console.log("[ops-affiliation-decide] Audit log error:", error.message);
      });

    } else {
      // ── Reject ──
      const { error: reqUpdateErr } = await svc
        .from("company_member_request")
        .update({
          request_status: "rejected",
          review_note: review_note || null,
          reviewed_by_company_member_id: mgr.company_member_id,
          reviewed_at: decidedAt,
          version: request.version + 1,
          updated_at: decidedAt,
        })
        .eq("company_member_request_id", company_member_request_id);

      if (reqUpdateErr) {
        console.log("[ops-affiliation-decide] Request update error:", reqUpdateErr.message);
        return c.json({ error_code: "INTERNAL_ERROR", message: `Request update failed: ${reqUpdateErr.message}` }, 500);
      }

      // Audit log (best-effort)
      await svc.from("audit_log").insert({
        actor_company_member_id: mgr.company_member_id,
        company_id,
        action: "AFFILIATION_REQUEST_REJECT",
        target_table: "company_member_request",
        target_id: company_member_request_id,
        detail_json: { decision: "reject" },
        version: 1,
      }).then(({ error }) => {
        if (error) console.log("[ops-affiliation-decide] Audit log error:", error.message);
      });
    }

    console.log(`[ops-affiliation-decide] ${decision}d request:`, company_member_request_id, "by manager:", mgr.company_member_id);
    return c.json({
      company_member_request_id,
      request_status: decision === "approve" ? "approved" : "rejected",
      reviewed_at: decidedAt,
      reviewed_by_company_member_id: mgr.company_member_id,
      company_member_id: resultCompanyMemberId,
      version: request.version + 1,
    });
  } catch (e) {
    console.log("[ops-affiliation-decide] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Decision failed: ${e}` }, 500);
  }
});

export default affiliation;