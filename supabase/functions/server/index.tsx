import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-user-token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Helper: create service-role supabase client
function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

// Helper: get authenticated user from x-user-token header (or fallback to Authorization)
async function getAuthUser(c: any): Promise<{ userId: string } | null> {
  // Prefer x-user-token (custom header that bypasses gateway JWT rewriting)
  const userToken = c.req.header('x-user-token');
  const authHeader = c.req.header('Authorization');
  const accessToken = userToken || authHeader?.split(' ')[1];
  if (!accessToken) {
    console.log('getAuthUser: no x-user-token or Authorization header found. x-user-token:', userToken || 'none', 'Authorization:', authHeader || 'none');
    return null;
  }
  const supabase = getServiceClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user?.id) {
    console.log(`getAuthUser: auth.getUser failed. error: ${error?.message || 'no error'}, user: ${user?.id || 'null'}, token source: ${userToken ? 'x-user-token' : 'Authorization'}, token prefix: ${accessToken.substring(0, 20)}...`);
    return null;
  }
  console.log(`getAuthUser: success, userId=${user.id}, source=${userToken ? 'x-user-token' : 'Authorization'}`);
  return { userId: user.id };
}

// ============================================================
// Storage: Avatar bucket initialization
// ============================================================
const AVATAR_BUCKET = 'make-c253248c-avatars';

async function ensureAvatarBucket() {
  const supabase = getServiceClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some((bucket: any) => bucket.name === AVATAR_BUCKET);
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(AVATAR_BUCKET, { public: false });
    if (error) {
      console.log(`Failed to create avatar bucket: ${error.message}`);
    } else {
      console.log(`Avatar bucket '${AVATAR_BUCKET}' created.`);
    }
  }
}

// Initialize bucket on startup
ensureAvatarBucket().catch(err => console.log(`Avatar bucket init error: ${err}`));

// Health check endpoint
app.get("/make-server-c253248c/health", (c) => {
  return c.json({ status: "ok" });
});

// Signup endpoint
app.post("/make-server-c253248c/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const supabase = getServiceClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || 'Heartel User' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) {
      console.log(`Signup error for ${email}: ${error.message}`);
      return c.json({ error: `Signup failed: ${error.message}` }, 400);
    }
    console.log(`User created successfully: ${data.user?.id}`);
    return c.json({ success: true, userId: data.user?.id });
  } catch (err) {
    console.log(`Unexpected signup error: ${err}`);
    return c.json({ error: `Unexpected error during signup: ${err}` }, 500);
  }
});

// ============================================================
// Work Tap API - NFCタップ出退勤
// ============================================================

// POST /work-tap - NFCタップで出勤/退勤を実行
// Implements the employee_work_tap logic directly (no RPC needed)
app.post("/make-server-c253248c/work-tap", async (c) => {
  try {
    // 1) Auth check
    const auth = await getAuthUser(c);
    if (!auth) {
      console.log("Work tap: unauthorized - no valid auth token");
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }
    console.log(`Work tap: auth user = ${auth.userId}`);

    // 2) Parse request body
    const body = await c.req.json();
    const { work_tag_public_id, tapped_at, client_request_id } = body;

    if (!work_tag_public_id) {
      console.log("Work tap: missing work_tag_public_id");
      return c.json({ error_code: "VALIDATION_ERROR", message: "work_tag_public_id is required" }, 400);
    }

    console.log(`Work tap: tag=${work_tag_public_id}, tapped_at=${tapped_at || 'now'}, req_id=${client_request_id || 'none'}`);

    const supabase = getServiceClient();
    const effectiveTime = tapped_at || new Date().toISOString();

    // 3) Fetch work_tag
    const { data: tagData, error: tagError } = await supabase
      .from('work_tag')
      .select('work_tag_id, company_id, work_tag_status, intended_action, work_tag_label')
      .eq('work_tag_public_id', work_tag_public_id)
      .limit(1)
      .single();

    if (tagError || !tagData) {
      console.log(`Work tap: tag not found. error=${tagError?.message}`);
      return c.json({ error_code: "WORK_TAG_NOT_FOUND", message: "Work tag not found" }, 404);
    }

    if (tagData.work_tag_status !== 'active') {
      console.log(`Work tap: tag revoked. status=${tagData.work_tag_status}`);
      return c.json({ error_code: "WORK_TAG_REVOKED", message: "Work tag has been revoked" }, 409);
    }

    const tagCompanyId = tagData.company_id;
    const intendedAction = tagData.intended_action || 'auto';

    // 4) Check company_member
    const { data: members, error: memberError } = await supabase
      .from('company_member')
      .select('company_member_id, member_role, member_status')
      .eq('company_id', tagCompanyId)
      .eq('user_id', auth.userId)
      .limit(1);

    if (memberError) {
      console.log(`Work tap: member query error: ${memberError.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberError.message}` }, 500);
    }

    if (!members || members.length === 0) {
      console.log(`Work tap: user ${auth.userId} is not a member of company ${tagCompanyId}`);
      return c.json({ error_code: "FORBIDDEN_NOT_MEMBER", message: "You are not a member of this company" }, 403);
    }

    const member = members[0];
    if (member.member_status !== 'active') {
      console.log(`Work tap: member status is ${member.member_status}`);
      return c.json({ error_code: "FORBIDDEN_NOT_MEMBER", message: "Your membership is not active" }, 403);
    }

    // MVP: allow employee, staff, manager roles
    const allowedRoles = ['employee', 'staff', 'manager'];
    if (!allowedRoles.includes(member.member_role)) {
      console.log(`Work tap: role ${member.member_role} not permitted`);
      return c.json({ error_code: "FORBIDDEN_ROLE", message: "Your role does not allow clock in/out" }, 403);
    }

    // 5) Find active on_duty_session
    const { data: activeSessions, error: sessionError } = await supabase
      .from('on_duty_session')
      .select('on_duty_session_id')
      .eq('company_member_id', member.company_member_id)
      .eq('duty_status', 'active')
      .limit(1);

    if (sessionError) {
      console.log(`Work tap: session query error: ${sessionError.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Session query error: ${sessionError.message}` }, 500);
    }

    const activeSession = activeSessions && activeSessions.length > 0 ? activeSessions[0] : null;

    // 6) Decide action based on intended_action + current state
    let action: 'clockin' | 'clockout';

    if (intendedAction === 'clockin') {
      if (activeSession) {
        return c.json({ error_code: "ALREADY_ON_DUTY", message: "You are already on duty" }, 409);
      }
      action = 'clockin';
    } else if (intendedAction === 'clockout') {
      if (!activeSession) {
        return c.json({ error_code: "NOT_ON_DUTY", message: "You are not currently on duty" }, 409);
      }
      action = 'clockout';
    } else {
      // auto: if active session exists → clockout, otherwise → clockin
      action = activeSession ? 'clockout' : 'clockin';
    }

    // 7) Execute clockin or clockout
    if (action === 'clockin') {
      const { data: newSession, error: insertError } = await supabase
        .from('on_duty_session')
        .insert({
          company_id: tagCompanyId,
          company_member_id: member.company_member_id,
          duty_status: 'active',
          started_at: effectiveTime,
          ended_at: null,
          version: 1,
        })
        .select('on_duty_session_id, started_at')
        .single();

      if (insertError) {
        console.log(`Work tap: clockin insert error: ${insertError.message}`);
        return c.json({ error_code: "INTERNAL_ERROR", message: `Clock-in failed: ${insertError.message}` }, 500);
      }

      const response = {
        action: 'clockin',
        company_id: tagCompanyId,
        on_duty_session_id: newSession.on_duty_session_id,
        started_at: newSession.started_at,
        ended_at: null,
        message: '出勤しました',
      };
      console.log(`Work tap success: clockin, session=${newSession.on_duty_session_id}`);
      return c.json(response, 200);

    } else {
      // clockout
      const { data: updatedSession, error: updateError } = await supabase
        .from('on_duty_session')
        .update({
          duty_status: 'ended',
          ended_at: effectiveTime,
          updated_at: new Date().toISOString(),
        })
        .eq('on_duty_session_id', activeSession!.on_duty_session_id)
        .select('on_duty_session_id, ended_at')
        .single();

      if (updateError) {
        console.log(`Work tap: clockout update error: ${updateError.message}`);
        return c.json({ error_code: "INTERNAL_ERROR", message: `Clock-out failed: ${updateError.message}` }, 500);
      }

      const response = {
        action: 'clockout',
        company_id: tagCompanyId,
        on_duty_session_id: updatedSession.on_duty_session_id,
        started_at: null,
        ended_at: updatedSession.ended_at,
        message: '退勤しました',
      };
      console.log(`Work tap success: clockout, session=${updatedSession.on_duty_session_id}`);
      return c.json(response, 200);
    }

  } catch (err) {
    console.log(`Work tap unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /work-tags - デバッグ用: 利用可能なwork_tagの一覧を取得
// ※本番ではこのエンドポイントは削除またはアクセス制限すること
app.get("/make-server-c253248c/work-tags", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('work_tag')
      .select('work_tag_id, work_tag_public_id, company_id, intended_action, work_tag_status, work_tag_label')
      .eq('work_tag_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.log(`Work tags fetch error: ${error.message}`);
      return c.json({ error: `Failed to fetch work tags: ${error.message}` }, 500);
    }

    console.log(`Work tags: found ${data?.length || 0} active tags`);
    return c.json({ tags: data || [] });
  } catch (err) {
    console.log(`Work tags unexpected error: ${err}`);
    return c.json({ error: `Unexpected error: ${err}` }, 500);
  }
});

// GET /work-status - 現在の勤務状態を取得
app.get("/make-server-c253248c/work-status", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const supabase = getServiceClient();

    // まず company_member を取得
    const { data: members, error: memberError } = await supabase
      .from('company_member')
      .select('company_member_id, company_id')
      .eq('user_id', auth.userId)
      .eq('member_status', 'active');

    if (memberError) {
      console.log(`Work status member fetch error: ${memberError.message}`);
      return c.json({ error: `Failed to fetch member: ${memberError.message}` }, 500);
    }

    if (!members || members.length === 0) {
      console.log(`Work status: no active company membership for user ${auth.userId}`);
      return c.json({ on_duty: false, session: null, member: null });
    }

    const member = members[0];

    // active な on_duty_session を検索
    const { data: sessions, error: sessionError } = await supabase
      .from('on_duty_session')
      .select('on_duty_session_id, company_id, started_at, duty_status')
      .eq('company_member_id', member.company_member_id)
      .eq('duty_status', 'active')
      .limit(1);

    if (sessionError) {
      console.log(`Work status session fetch error: ${sessionError.message}`);
      return c.json({ error: `Failed to fetch session: ${sessionError.message}` }, 500);
    }

    const activeSession = sessions && sessions.length > 0 ? sessions[0] : null;

    console.log(`Work status: user=${auth.userId}, on_duty=${!!activeSession}`);
    return c.json({
      on_duty: !!activeSession,
      session: activeSession,
      member: { company_member_id: member.company_member_id, company_id: member.company_id },
    });
  } catch (err) {
    console.log(`Work status unexpected error: ${err}`);
    return c.json({ error: `Unexpected error: ${err}` }, 500);
  }
});

// ============================================================
// Affiliation Request API - 所属申請
// ============================================================

// GET /company-search - 会社検索（申請先選択用）
app.get("/make-server-c253248c/company-search", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const q = c.req.query('q') || '';
    if (q.length < 1) {
      return c.json({ companies: [] });
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('company')
      .select('company_id, company_name, company_status')
      .eq('company_status', 'active')
      .ilike('company_name', `%${q}%`)
      .order('company_name')
      .limit(20);

    if (error) {
      console.log(`Company search error: ${error.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Search failed: ${error.message}` }, 500);
    }

    console.log(`Company search: q="${q}", found ${data?.length || 0}`);
    return c.json({ companies: data || [] });
  } catch (err) {
    console.log(`Company search unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// POST /affiliation-request - 所属申請作成
app.post("/make-server-c253248c/affiliation-request", async (c) => {
  try {
    // 1) Auth check
    const auth = await getAuthUser(c);
    if (!auth) {
      console.log("Affiliation request: unauthorized");
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    // 2) Parse body
    const body = await c.req.json();
    const { company_id, request_note, job_title, client_request_id } = body;

    if (!company_id) {
      console.log("Affiliation request: missing company_id");
      return c.json({ error_code: "VALIDATION_ERROR", message: "company_id is required" }, 400);
    }

    console.log(`Affiliation request: user=${auth.userId}, company=${company_id}, job_title=${job_title || 'none'}, req_id=${client_request_id || 'none'}`);

    const supabase = getServiceClient();

    // 3) Check company exists and is active
    const { data: company, error: companyErr } = await supabase
      .from('company')
      .select('company_id, company_name, company_status')
      .eq('company_id', company_id)
      .single();

    if (companyErr || !company) {
      console.log(`Affiliation request: company not found - ${companyErr?.message}`);
      return c.json({ error_code: "COMPANY_NOT_FOUND", message: "Company not found" }, 404);
    }

    if (company.company_status !== 'active') {
      console.log(`Affiliation request: company suspended - status=${company.company_status}`);
      return c.json({ error_code: "COMPANY_SUSPENDED", message: "This company is currently suspended" }, 423);
    }

    // 4) Check if already an active member
    const { data: existingMember } = await supabase
      .from('company_member')
      .select('company_member_id')
      .eq('company_id', company_id)
      .eq('user_id', auth.userId)
      .eq('member_status', 'active')
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      console.log(`Affiliation request: already a member of company ${company_id}`);
      return c.json({ error_code: "ALREADY_MEMBER", message: "You are already a member of this company" }, 409);
    }

    // 5) Check if pending request already exists
    const { data: existingRequest } = await supabase
      .from('company_member_request')
      .select('company_member_request_id')
      .eq('company_id', company_id)
      .eq('user_id', auth.userId)
      .eq('request_status', 'pending')
      .limit(1);

    if (existingRequest && existingRequest.length > 0) {
      console.log(`Affiliation request: pending request already exists for company ${company_id}`);
      return c.json({ error_code: "REQUEST_ALREADY_PENDING", message: "You already have a pending request for this company" }, 409);
    }

    // 6) Insert the request
    const { data: newRequest, error: insertErr } = await supabase
      .from('company_member_request')
      .insert({
        company_id,
        user_id: auth.userId,
        request_status: 'pending',
        requested_role: 'employee',
        job_title: job_title || null,
        request_note: request_note || null,
      })
      .select('company_member_request_id, request_status, requested_role, job_title, created_at')
      .single();

    if (insertErr) {
      console.log(`Affiliation request insert error: ${insertErr.message}, details: ${JSON.stringify(insertErr)}`);

      // Handle unique constraint violation (race condition)
      if (insertErr.message?.includes('ux_company_member_request_pending_one') || insertErr.code === '23505') {
        return c.json({ error_code: "REQUEST_ALREADY_PENDING", message: "You already have a pending request for this company" }, 409);
      }

      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to create request: ${insertErr.message}` }, 500);
    }

    console.log(`Affiliation request created: ${newRequest.company_member_request_id}`);
    return c.json(newRequest, 201);

  } catch (err) {
    console.log(`Affiliation request unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-affiliation-requests - 自分の所属申請一覧を取得
app.get("/make-server-c253248c/my-affiliation-requests", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('company_member_request')
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
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.log(`My affiliation requests error: ${error.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to fetch requests: ${error.message}` }, 500);
    }

    console.log(`My affiliation requests: found ${data?.length || 0} for user ${auth.userId}`);
    return c.json({ requests: data || [] });
  } catch (err) {
    console.log(`My affiliation requests unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// DELETE /affiliation-request/:id - 申請キャンセル
app.delete("/make-server-c253248c/affiliation-request/:id", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const requestId = c.req.param('id');
    const supabase = getServiceClient();

    // Verify ownership and status
    const { data: existing, error: fetchErr } = await supabase
      .from('company_member_request')
      .select('company_member_request_id, user_id, request_status')
      .eq('company_member_request_id', requestId)
      .single();

    if (fetchErr || !existing) {
      return c.json({ error_code: "NOT_FOUND", message: "Request not found" }, 404);
    }

    if (existing.user_id !== auth.userId) {
      return c.json({ error_code: "FORBIDDEN", message: "Not your request" }, 403);
    }

    if (existing.request_status !== 'pending') {
      return c.json({ error_code: "INVALID_STATUS", message: "Only pending requests can be cancelled" }, 409);
    }

    const { error: updateErr } = await supabase
      .from('company_member_request')
      .update({ request_status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('company_member_request_id', requestId);

    if (updateErr) {
      console.log(`Cancel affiliation request error: ${updateErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to cancel: ${updateErr.message}` }, 500);
    }

    console.log(`Affiliation request cancelled: ${requestId}`);
    return c.json({ success: true, request_status: 'cancelled' });

  } catch (err) {
    console.log(`Cancel affiliation request unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// ============================================================
// Kudos API - Kudos一覧取得
// ============================================================

// GET /my-kudos - 自分が受領したKudos一覧
app.get("/make-server-c253248c/my-kudos", async (c) => {
  try {
    // 1) Auth
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const supabase = getServiceClient();

    // 2) Find my company_member_id
    const { data: members, error: memberErr } = await supabase
      .from('company_member')
      .select('company_member_id, company_id')
      .eq('user_id', auth.userId)
      .eq('member_status', 'active')
      .limit(1);

    if (memberErr) {
      console.log(`My kudos: member query error: ${memberErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    }

    if (!members || members.length === 0) {
      console.log(`My kudos: no active membership for user ${auth.userId}`);
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);
    }

    const myMemberId = members[0].company_member_id;

    // 3) Parse query params
    const statusParam = c.req.query('status') || '';
    const fromParam = c.req.query('from') || '';
    const toParam = c.req.query('to') || '';
    const limitParam = parseInt(c.req.query('limit') || '30', 10);
    const cursorParam = c.req.query('cursor') || '';

    const limit = Math.min(Math.max(limitParam || 30, 1), 100);

    // Validate status values
    const validStatuses = ['pending', 'confirmed', 'rejected'];
    let statusFilter: string[] = [];
    if (statusParam) {
      statusFilter = statusParam.split(',').map(s => s.trim()).filter(Boolean);
      const invalidStatus = statusFilter.find(s => !validStatuses.includes(s));
      if (invalidStatus) {
        return c.json({ error_code: "VALIDATION_ERROR", message: `Invalid status: ${invalidStatus}. Allowed: ${validStatuses.join(', ')}` }, 400);
      }
    }

    // 4) Build query - fetch kudos with company name via stay or direct company_id
    let query = supabase
      .from('kudos')
      .select(`
        kudos_id,
        kudos_status,
        category,
        message_text,
        points_awarded,
        created_at,
        confirmed_at,
        stay_id,
        company_id,
        company:company_id ( company_name )
      `)
      .eq('receiver_company_member_id', myMemberId)
      .order('created_at', { ascending: false })
      .limit(limit + 1); // fetch one extra for cursor

    // Status filter
    if (statusFilter.length > 0) {
      query = query.in('kudos_status', statusFilter);
    }

    // Date filter
    if (fromParam) {
      query = query.gte('created_at', fromParam);
    }
    if (toParam) {
      // to + 1 day for inclusive end
      const toDate = new Date(toParam);
      toDate.setDate(toDate.getDate() + 1);
      query = query.lt('created_at', toDate.toISOString());
    }

    // Cursor-based pagination (descending)
    if (cursorParam) {
      query = query.lt('created_at', cursorParam);
    }

    const { data: kudosData, error: kudosErr } = await query;

    if (kudosErr) {
      console.log(`My kudos: query error: ${kudosErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Kudos query error: ${kudosErr.message}` }, 500);
    }

    const items = (kudosData || []).slice(0, limit).map((k: any) => ({
      kudos_id: k.kudos_id,
      kudos_status: k.kudos_status,
      category: k.category || 'Other',
      message_preview: k.message_text ? k.message_text.substring(0, 80) : '',
      points_awarded: k.points_awarded || 0,
      created_at: k.created_at,
      confirmed_at: k.confirmed_at,
      stay_id: k.stay_id,
      company_name: k.company?.company_name || null,
    }));

    const hasMore = (kudosData || []).length > limit;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    // 5) Summary counts (separate queries for each status)
    const summaryPromises = validStatuses.map(async (status) => {
      const { count, error } = await supabase
        .from('kudos')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_company_member_id', myMemberId)
        .eq('kudos_status', status);
      if (error) {
        console.log(`My kudos summary count error for ${status}: ${error.message}`);
        return { status, count: 0 };
      }
      return { status, count: count || 0 };
    });

    const summaryResults = await Promise.all(summaryPromises);
    const summary: Record<string, number> = {};
    for (const r of summaryResults) {
      summary[r.status] = r.count;
    }

    console.log(`My kudos: user=${auth.userId}, member=${myMemberId}, returned=${items.length}, hasMore=${hasMore}`);
    return c.json({ items, next_cursor: nextCursor, summary }, 200);

  } catch (err) {
    console.log(`My kudos unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// GET /my-kudos/:id - 単一Kudos詳細取得
app.get("/make-server-c253248c/my-kudos/:id", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const kudosId = c.req.param('id');
    const supabase = getServiceClient();

    // Find my company_member_id
    const { data: members, error: memberErr } = await supabase
      .from('company_member')
      .select('company_member_id')
      .eq('user_id', auth.userId)
      .eq('member_status', 'active')
      .limit(1);

    if (memberErr || !members || members.length === 0) {
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);
    }

    const myMemberId = members[0].company_member_id;

    // Fetch the kudos (ensure it belongs to this user)
    const { data: kudos, error: kudosErr } = await supabase
      .from('kudos')
      .select(`
        kudos_id,
        kudos_status,
        category,
        message_text,
        points_awarded,
        created_at,
        confirmed_at,
        stay_id,
        company_id,
        receiver_company_member_id,
        company:company_id ( company_name )
      `)
      .eq('kudos_id', kudosId)
      .maybeSingle();

    if (kudosErr) {
      console.log(`My kudos detail: query error: ${kudosErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Query error: ${kudosErr.message}` }, 500);
    }

    if (!kudos) {
      return c.json({ error_code: "NOT_FOUND", message: "Kudos not found" }, 404);
    }

    // Verify ownership
    if (kudos.receiver_company_member_id !== myMemberId) {
      return c.json({ error_code: "FORBIDDEN", message: "This kudos does not belong to you" }, 403);
    }

    // Try to get chain_receipt info
    let proof = null;
    const { data: receipt } = await supabase
      .from('chain_receipt')
      .select('receipt_status, tx_hash, anchor_hash, created_at')
      .eq('kudos_id', kudosId)
      .maybeSingle();

    if (receipt) {
      proof = {
        receipt_status: receipt.receipt_status,
        tx_hash: receipt.tx_hash,
        anchor_hash: receipt.anchor_hash,
        created_at: receipt.created_at,
      };
    }

    const response = {
      kudos_id: kudos.kudos_id,
      kudos_status: kudos.kudos_status,
      category: kudos.category || 'Other',
      message_text: kudos.message_text || '',
      points_awarded: kudos.points_awarded || 0,
      created_at: kudos.created_at,
      confirmed_at: kudos.confirmed_at,
      stay_id: kudos.stay_id,
      company_name: kudos.company?.company_name || null,
      proof,
    };

    console.log(`My kudos detail: id=${kudosId}, status=${kudos.kudos_status}`);
    return c.json(response, 200);

  } catch (err) {
    console.log(`My kudos detail unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// ============================================================
// Staff Profile API - スタッフ情報取得・編集
// ============================================================

// GET /my-profile - 自分のプロフィール情報取得
app.get("/make-server-c253248c/my-profile", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const supabase = getServiceClient();

    // 1) Get auth user info (for email, display_name fallback)
    const { data: { user: authUser }, error: authErr } = await supabase.auth.admin.getUserById(auth.userId);
    if (authErr || !authUser) {
      console.log(`My profile: failed to get auth user: ${authErr?.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to get user info: ${authErr?.message}` }, 500);
    }

    // 2) Get company_member (active)
    const { data: members, error: memberErr } = await supabase
      .from('company_member')
      .select('company_member_id, company_id, member_role, member_status, display_name_override, job_title, public_profile_json, visibility_scope, version, updated_at')
      .eq('user_id', auth.userId)
      .eq('member_status', 'active')
      .limit(1);

    if (memberErr) {
      console.log(`My profile: member query error: ${memberErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    }

    // 3) Get company name if member exists
    let companyName: string | null = null;
    let member = members && members.length > 0 ? members[0] : null;

    if (member) {
      const { data: companyData } = await supabase
        .from('company')
        .select('company_name')
        .eq('company_id', member.company_id)
        .single();
      companyName = companyData?.company_name || null;
    }

    // 4) Resolve display_name: display_name_override > auth user_metadata.name > email prefix
    const displayName = member?.display_name_override
      || authUser.user_metadata?.name
      || authUser.user_metadata?.full_name
      || authUser.email?.split('@')[0]
      || '(No Name)';

    // 5) Resolve avatar URL from storage
    let avatarUrl: string | null = null;
    const avatarPath = `${auth.userId}/avatar`;
    const { data: avatarFiles } = await supabase.storage.from(AVATAR_BUCKET).list(auth.userId, { limit: 1, search: 'avatar' });
    if (avatarFiles && avatarFiles.length > 0) {
      const file = avatarFiles.find((f: any) => f.name.startsWith('avatar'));
      if (file) {
        const { data: signedData } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(`${auth.userId}/${file.name}`, 3600);
        avatarUrl = signedData?.signedUrl || null;
      }
    }

    const response = {
      user_id: auth.userId,
      email: authUser.email || '',
      display_name: displayName,
      auth_name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || null,
      avatar_url: avatarUrl,
      has_company: !!member,
      company_member: member ? {
        company_member_id: member.company_member_id,
        company_id: member.company_id,
        company_name: companyName,
        member_role: member.member_role,
        display_name_override: member.display_name_override || '',
        job_title: member.job_title || '',
        public_profile_json: member.public_profile_json || {},
        visibility_scope: member.visibility_scope || 'company',
        version: member.version,
        updated_at: member.updated_at,
      } : null,
    };

    console.log(`My profile: user=${auth.userId}, has_company=${!!member}, display=${displayName}`);
    return c.json(response, 200);

  } catch (err) {
    console.log(`My profile unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// PUT /my-profile - 自分のプロフィール編集（楽観ロック）
app.put("/make-server-c253248c/my-profile", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const body = await c.req.json();
    const { expected_version, display_name_override, job_title, public_profile_json, visibility_scope, client_request_id } = body;

    // Validation
    if (expected_version === undefined || expected_version === null) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "expected_version is required" }, 400);
    }

    if (display_name_override !== undefined && (typeof display_name_override !== 'string' || display_name_override.length > 50)) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "display_name_override must be a string up to 50 characters" }, 400);
    }

    if (job_title !== undefined && (typeof job_title !== 'string' || job_title.length > 50)) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "job_title must be a string up to 50 characters" }, 400);
    }

    if (visibility_scope !== undefined && !['company', 'group', 'platform'].includes(visibility_scope)) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "visibility_scope must be company, group, or platform" }, 400);
    }

    console.log(`My profile update: user=${auth.userId}, expected_version=${expected_version}, req_id=${client_request_id || 'none'}`);

    const supabase = getServiceClient();

    // 1) Find my active company_member (server-determined, no IDOR)
    const { data: members, error: memberErr } = await supabase
      .from('company_member')
      .select('company_member_id, version')
      .eq('user_id', auth.userId)
      .eq('member_status', 'active')
      .limit(1);

    if (memberErr) {
      console.log(`My profile update: member query error: ${memberErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Member query error: ${memberErr.message}` }, 500);
    }

    if (!members || members.length === 0) {
      console.log(`My profile update: no active membership for user ${auth.userId}`);
      return c.json({ error_code: "FORBIDDEN", message: "No active company membership found" }, 403);
    }

    const member = members[0];

    // 2) Build update object (only non-undefined fields)
    const updateData: Record<string, any> = {
      version: member.version + 1,
      updated_at: new Date().toISOString(),
    };

    if (display_name_override !== undefined) updateData.display_name_override = display_name_override || null;
    if (job_title !== undefined) updateData.job_title = job_title || null;
    if (public_profile_json !== undefined) updateData.public_profile_json = public_profile_json;
    if (visibility_scope !== undefined) updateData.visibility_scope = visibility_scope;

    // 3) Optimistic lock: update where version matches
    const { data: updated, error: updateErr } = await supabase
      .from('company_member')
      .update(updateData)
      .eq('company_member_id', member.company_member_id)
      .eq('version', expected_version)
      .select('company_member_id, version, updated_at')
      .maybeSingle();

    if (updateErr) {
      console.log(`My profile update error: ${updateErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Update failed: ${updateErr.message}` }, 500);
    }

    if (!updated) {
      console.log(`My profile update: version conflict. expected=${expected_version}, current=${member.version}`);
      return c.json({ error_code: "VERSION_CONFLICT", message: "Profile was modified elsewhere. Please refresh and try again." }, 409);
    }

    console.log(`My profile updated: member=${updated.company_member_id}, new_version=${updated.version}`);
    return c.json({
      company_member_id: updated.company_member_id,
      version: updated.version,
      updated_at: updated.updated_at,
    }, 200);

  } catch (err) {
    console.log(`My profile update unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// POST /my-profile/avatar - アバター画像アップロード
app.post("/make-server-c253248c/my-profile/avatar", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const supabase = getServiceClient();

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('avatar');

    if (!file || !(file instanceof File)) {
      console.log('Avatar upload: no file provided');
      return c.json({ error_code: "VALIDATION_ERROR", message: "avatar file is required" }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      console.log(`Avatar upload: invalid file type ${file.type}`);
      return c.json({ error_code: "VALIDATION_ERROR", message: "Only JPEG, PNG, WebP, and GIF images are allowed" }, 400);
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.log(`Avatar upload: file too large ${file.size}`);
      return c.json({ error_code: "VALIDATION_ERROR", message: "File size must be under 5MB" }, 400);
    }

    // Determine extension from mime type
    const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extMap[file.type] || 'jpg';
    const storagePath = `${auth.userId}/avatar.${ext}`;

    // Delete any existing avatar files for this user first
    const { data: existingFiles } = await supabase.storage.from(AVATAR_BUCKET).list(auth.userId, { limit: 10, search: 'avatar' });
    if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles.filter((f: any) => f.name.startsWith('avatar')).map((f: any) => `${auth.userId}/${f.name}`);
      if (toDelete.length > 0) {
        await supabase.storage.from(AVATAR_BUCKET).remove(toDelete);
        console.log(`Avatar upload: removed ${toDelete.length} existing avatar files`);
      }
    }

    // Upload new avatar
    const arrayBuffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadErr) {
      console.log(`Avatar upload error: ${uploadErr.message}`);
      return c.json({ error_code: "INTERNAL_ERROR", message: `Upload failed: ${uploadErr.message}` }, 500);
    }

    // Generate signed URL
    const { data: signedData } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(storagePath, 3600);
    const avatarUrl = signedData?.signedUrl || null;

    console.log(`Avatar uploaded: user=${auth.userId}, path=${storagePath}, size=${file.size}`);
    return c.json({ avatar_url: avatarUrl, path: storagePath }, 200);

  } catch (err) {
    console.log(`Avatar upload unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

// DELETE /my-profile/avatar - アバター画像削除
app.delete("/make-server-c253248c/my-profile/avatar", async (c) => {
  try {
    const auth = await getAuthUser(c);
    if (!auth) {
      return c.json({ error_code: "UNAUTHORIZED", message: "Authentication required" }, 401);
    }

    const supabase = getServiceClient();

    // Find and delete all avatar files for this user
    const { data: existingFiles } = await supabase.storage.from(AVATAR_BUCKET).list(auth.userId, { limit: 10, search: 'avatar' });
    if (existingFiles && existingFiles.length > 0) {
      const toDelete = existingFiles.filter((f: any) => f.name.startsWith('avatar')).map((f: any) => `${auth.userId}/${f.name}`);
      if (toDelete.length > 0) {
        const { error: removeErr } = await supabase.storage.from(AVATAR_BUCKET).remove(toDelete);
        if (removeErr) {
          console.log(`Avatar delete error: ${removeErr.message}`);
          return c.json({ error_code: "INTERNAL_ERROR", message: `Delete failed: ${removeErr.message}` }, 500);
        }
        console.log(`Avatar deleted: user=${auth.userId}, files=${toDelete.length}`);
      }
    }

    return c.json({ success: true }, 200);

  } catch (err) {
    console.log(`Avatar delete unexpected error: ${err}`);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Unexpected error: ${err}` }, 500);
  }
});

Deno.serve(app.fetch);