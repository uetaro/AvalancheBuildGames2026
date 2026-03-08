// Affiliation request routes (employee/staff side) — from staff_mobile
import { Hono } from "npm:hono";
import { getAuthUser, createServiceClient } from "./_shared.ts";

const affiliationReq = new Hono();

// GET /company-search — company search
affiliationReq.get("/company-search", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const q = c.req.query("q") || "";
    if (q.length < 1) return c.json({ companies: [] });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("company")
      .select("company_id, company_name, company_status")
      .eq("company_status", "active")
      .ilike("company_name", `%${q}%`)
      .order("company_name")
      .limit(20);

    if (error)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Search failed: ${error.message}` }, 500);

    return c.json({ companies: data || [] });
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// POST /affiliation-request — create affiliation request
affiliationReq.post("/affiliation-request", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const body = await c.req.json();
    const { company_id, request_note, job_title, client_request_id } = body;

    if (!company_id)
      return c.json({ error_code: "VALIDATION_ERROR", message: "company_id is required" }, 400);

    const supabase = createServiceClient();

    const { data: company, error: companyErr } = await supabase
      .from("company")
      .select("company_id, company_name, company_status")
      .eq("company_id", company_id)
      .single();

    if (companyErr || !company)
      return c.json({ error_code: "COMPANY_NOT_FOUND", message: "Company not found" }, 404);
    if (company.company_status !== "active")
      return c.json({ error_code: "COMPANY_SUSPENDED", message: "This company is currently suspended" }, 423);

    const { data: existingMember } = await supabase
      .from("company_member")
      .select("company_member_id")
      .eq("company_id", company_id)
      .eq("user_id", auth.userId)
      .eq("member_status", "active")
      .limit(1);

    if (existingMember && existingMember.length > 0)
      return c.json({ error_code: "ALREADY_MEMBER", message: "You are already a member of this company" }, 409);

    const { data: existingRequest } = await supabase
      .from("company_member_request")
      .select("company_member_request_id")
      .eq("company_id", company_id)
      .eq("user_id", auth.userId)
      .eq("request_status", "pending")
      .limit(1);

    if (existingRequest && existingRequest.length > 0)
      return c.json({ error_code: "REQUEST_ALREADY_PENDING", message: "You already have a pending request for this company" }, 409);

    const { data: newRequest, error: insertErr } = await supabase
      .from("company_member_request")
      .insert({
        company_id,
        user_id: auth.userId,
        request_status: "pending",
        requested_role: "employee",
        job_title: job_title || null,
        request_note: request_note || null,
      })
      .select("company_member_request_id, request_status, requested_role, job_title, created_at")
      .single();

    if (insertErr) {
      if (insertErr.message?.includes("ux_company_member_request_pending_one") || insertErr.code === "23505")
        return c.json({ error_code: "REQUEST_ALREADY_PENDING", message: "You already have a pending request for this company" }, 409);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to create request: ${insertErr.message}` }, 500);
    }

    return c.json(newRequest, 201);
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-affiliation-requests — list my affiliation requests
affiliationReq.get("/my-affiliation-requests", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("company_member_request")
      .select(`
        company_member_request_id,
        company_id,
        request_status,
        requested_role,
        job_title,
        request_note,
        review_note,
        created_at,
        updated_at,
        company:company_id ( company_name )
      `)
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to fetch requests: ${error.message}` }, 500);

    return c.json({ requests: data || [] });
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// DELETE /affiliation-request/:id — cancel request
affiliationReq.delete("/affiliation-request/:id", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth)
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const requestId = c.req.param("id");
    const supabase = createServiceClient();

    const { data: existing, error: fetchErr } = await supabase
      .from("company_member_request")
      .select("company_member_request_id, user_id, request_status")
      .eq("company_member_request_id", requestId)
      .single();

    if (fetchErr || !existing)
      return c.json({ error_code: "NOT_FOUND", message: "Request not found" }, 404);
    if (existing.user_id !== auth.userId)
      return c.json({ error_code: "FORBIDDEN", message: "Not your request" }, 403);
    if (existing.request_status !== "pending")
      return c.json({ error_code: "INVALID_STATUS", message: "Only pending requests can be cancelled" }, 409);

    const { error: updateErr } = await supabase
      .from("company_member_request")
      .update({ request_status: "cancelled", updated_at: new Date().toISOString() })
      .eq("company_member_request_id", requestId);

    if (updateErr)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to cancel: ${updateErr.message}` }, 500);

    return c.json({ success: true, request_status: "cancelled" });
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

export default affiliationReq;
