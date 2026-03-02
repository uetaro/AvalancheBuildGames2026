// Work tap routes (NFC clock-in/out) — from staff_mobile
import { Hono } from "npm:hono";
import { getAuthUser, createServiceClient } from "./_shared.ts";

const work = new Hono();

// POST /work-tap — NFCタップで出退勤
work.post("/work-tap", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);

    const body = await c.req.json();
    const { work_tag_public_id, tapped_at, client_request_id } = body;

    if (!work_tag_public_id)
      return c.json({ error_code: "VALIDATION_ERROR", message: "work_tag_public_id is required" }, 400);

    const supabase = createServiceClient();
    const effectiveTime = tapped_at || new Date().toISOString();

    const { data: tagData, error: tagError } = await supabase
      .from("work_tag")
      .select("work_tag_id, company_id, work_tag_status, intended_action, work_tag_label")
      .eq("work_tag_public_id", work_tag_public_id)
      .limit(1)
      .single();

    if (tagError || !tagData)
      return c.json({ error_code: "WORK_TAG_NOT_FOUND", message: "Work tag not found" }, 404);
    if (tagData.work_tag_status !== "active")
      return c.json({ error_code: "WORK_TAG_REVOKED", message: "Work tag has been revoked" }, 409);

    const tagCompanyId = tagData.company_id;
    const intendedAction = tagData.intended_action || "auto";

    const { data: members, error: memberError } = await supabase
      .from("company_member")
      .select("company_member_id, member_role, member_status")
      .eq("company_id", tagCompanyId)
      .eq("user_id", auth.userId)
      .limit(1);

    if (memberError)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberError.message}` }, 500);
    if (!members || members.length === 0)
      return c.json({ error_code: "FORBIDDEN_NOT_MEMBER", message: "You are not a member of this company" }, 403);

    const member = members[0];
    if (member.member_status !== "active")
      return c.json({ error_code: "FORBIDDEN_NOT_MEMBER", message: "Your membership is not active" }, 403);

    const allowedRoles = ["employee", "staff", "manager"];
    if (!allowedRoles.includes(member.member_role))
      return c.json({ error_code: "FORBIDDEN_ROLE", message: "Your role does not allow clock in/out" }, 403);

    const { data: activeSessions, error: sessionError } = await supabase
      .from("on_duty_session")
      .select("on_duty_session_id")
      .eq("company_member_id", member.company_member_id)
      .eq("duty_status", "active")
      .limit(1);

    if (sessionError)
      return c.json({ error_code: "INTERNAL_ERROR", message: `Session query error: ${sessionError.message}` }, 500);

    const activeSession = activeSessions && activeSessions.length > 0 ? activeSessions[0] : null;

    let action: "clockin" | "clockout";
    if (intendedAction === "clockin") {
      if (activeSession) return c.json({ error_code: "ALREADY_ON_DUTY", message: "You are already on duty" }, 409);
      action = "clockin";
    } else if (intendedAction === "clockout") {
      if (!activeSession) return c.json({ error_code: "NOT_ON_DUTY", message: "You are not currently on duty" }, 409);
      action = "clockout";
    } else {
      action = activeSession ? "clockout" : "clockin";
    }

    if (action === "clockin") {
      const { data: newSession, error: insertError } = await supabase
        .from("on_duty_session")
        .insert({
          company_id: tagCompanyId,
          company_member_id: member.company_member_id,
          duty_status: "active",
          started_at: effectiveTime,
          ended_at: null,
          version: 1,
        })
        .select("on_duty_session_id, started_at")
        .single();

      if (insertError)
        return c.json({ error_code: "INTERNAL_ERROR", message: `Clock-in failed: ${insertError.message}` }, 500);

      return c.json({
        action: "clockin",
        company_id: tagCompanyId,
        on_duty_session_id: newSession.on_duty_session_id,
        started_at: newSession.started_at,
        ended_at: null,
        message: "出勤しました",
      }, 200);
    } else {
      const { data: updatedSession, error: updateError } = await supabase
        .from("on_duty_session")
        .update({
          duty_status: "ended",
          ended_at: effectiveTime,
          updated_at: new Date().toISOString(),
        })
        .eq("on_duty_session_id", activeSession!.on_duty_session_id)
        .select("on_duty_session_id, ended_at")
        .single();

      if (updateError)
        return c.json({ error_code: "INTERNAL_ERROR", message: `Clock-out failed: ${updateError.message}` }, 500);

      return c.json({
        action: "clockout",
        company_id: tagCompanyId,
        on_duty_session_id: updatedSession.on_duty_session_id,
        started_at: null,
        ended_at: updatedSession.ended_at,
        message: "退勤しました",
      }, 200);
    }
  } catch (err) {
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /work-tags — 利用可能な work_tag 一覧（デバッグ用）
work.get("/work-tags", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("work_tag")
      .select("work_tag_id, work_tag_public_id, company_id, intended_action, work_tag_status, work_tag_label")
      .eq("work_tag_status", "active")
      .order("created_at", { ascending: false });

    if (error)
      return c.json({ error: `Failed to fetch work tags: ${error.message}` }, 500);

    return c.json({ tags: data || [] });
  } catch (err) {
    return c.json({ error: `Unexpected error: ${err}` }, 500);
  }
});

// GET /work-status — 現在の勤務状態を取得
work.get("/work-status", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) return c.json({ error: "Unauthorized" }, 401);

    const supabase = createServiceClient();

    const { data: members, error: memberError } = await supabase
      .from("company_member")
      .select("company_member_id, company_id")
      .eq("user_id", auth.userId)
      .eq("member_status", "active");

    if (memberError)
      return c.json({ error: `Failed to fetch member: ${memberError.message}` }, 500);

    if (!members || members.length === 0)
      return c.json({ on_duty: false, session: null, member: null });

    const member = members[0];

    const { data: sessions, error: sessionError } = await supabase
      .from("on_duty_session")
      .select("on_duty_session_id, company_id, started_at, duty_status")
      .eq("company_member_id", member.company_member_id)
      .eq("duty_status", "active")
      .limit(1);

    if (sessionError)
      return c.json({ error: `Failed to fetch session: ${sessionError.message}` }, 500);

    const activeSession = sessions && sessions.length > 0 ? sessions[0] : null;
    return c.json({
      on_duty: !!activeSession,
      session: activeSession,
      member: { company_member_id: member.company_member_id, company_id: member.company_id },
    });
  } catch (err) {
    return c.json({ error: `Unexpected error: ${err}` }, 500);
  }
});

export default work;
