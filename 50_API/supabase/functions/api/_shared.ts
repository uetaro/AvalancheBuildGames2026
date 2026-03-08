// Shared utilities, Supabase clients, and auth helpers
import { createClient } from "npm:@supabase/supabase-js@2";

// ── Route prefix (ops routes from staff_web) ───────────────────────────────────
export const ROUTE_PREFIX = "/make-server-20781d19";

// ── Environment ──────────────────────────────────────────────────────────────
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ── Supabase client factories ────────────────────────────────────────────────

export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export function createAuthClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

// ── Auth helpers ─────────────────────────────────────────────────────────────

/** JWT → user id, or error string */
export async function authenticateUser(
  accessToken: string,
): Promise<{ userId: string } | { error: string }> {
  const supabase = createAuthClient(accessToken);
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.id) return { error: error?.message ?? "Invalid token" };
  return { userId: user.id };
}

/** x-user-token / Authorization header → user id, or null */
export async function getAuthUser(
  c: any,
): Promise<{ userId: string } | null> {
  const userToken = c.req.header("x-user-token");
  const authHeader = c.req.header("Authorization");
  const accessToken = userToken || authHeader?.split(" ")[1];
  if (!accessToken) return null;
  const svc = createServiceClient();
  const { data: { user }, error } = await svc.auth.getUser(accessToken);
  if (error || !user?.id) return null;
  return { userId: user.id };
}

/** Ensure caller has active staff/manager membership */
export async function authorizeStaffOrManager(
  svc: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
): Promise<
  | { member: { company_member_id: string; member_role: string; member_status: string } }
  | { error: string }
> {
  const { data: member, error } = await svc
    .from("company_member")
    .select("company_member_id, member_role, member_status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { error: `Membership query failed: ${error.message}` };
  if (!member) return { error: "No membership found" };
  if (!["staff", "manager"].includes(member.member_role) || member.member_status !== "active")
    return { error: "Insufficient role or inactive" };
  return { member };
}

/** Combined auth + authz shortcut used by ops routes */
export async function authAndAuthorize(
  accessToken: string | undefined,
  companyId: string | undefined,
  tag: string,
): Promise<
  | { ok: true; userId: string; member: { company_member_id: string; member_role: string }; svc: ReturnType<typeof createClient> }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  if (!accessToken)
    return { ok: false, status: 401, body: { error_code: "UNAUTHORIZED", message: "Missing access_token" } };
  if (!companyId)
    return { ok: false, status: 400, body: { error_code: "VALIDATION_ERROR", message: "company_id is required" } };

  const authResult = await authenticateUser(accessToken);
  if ("error" in authResult) {
    console.log(`[${tag}] Invalid token:`, authResult.error);
    return { ok: false, status: 401, body: { error_code: "UNAUTHORIZED", message: "Invalid token" } };
  }

  const svc = createServiceClient();
  const authzResult = await authorizeStaffOrManager(svc, companyId, authResult.userId);
  if ("error" in authzResult) {
    console.log(`[${tag}] Auth failed:`, authzResult.error);
    return { ok: false, status: 403, body: { error_code: "FORBIDDEN", message: authzResult.error } };
  }

  return { ok: true, userId: authResult.userId, member: authzResult.member, svc };
}

// ── Guest session helpers ────────────────────────────────────────────────────

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOpaqueToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

export interface GuestSessionResult {
  guest_session_id: string;
  stay_id: string;
  company_id: string;
}

export async function validateGuestSession(
  authHeader: string | null,
): Promise<
  | { ok: true; session: GuestSessionResult }
  | { ok: false; error_code: string; message: string; status: number }
> {
  const token = (authHeader ?? "").trim();
  if (!token)
    return { ok: false, error_code: "UNAUTHORIZED", message: "Missing guest session token", status: 401 };

  const hash = await hashToken(token);
  const db = createServiceClient();

  const { data: gs, error: gsError } = await db
    .from("guest_session")
    .select("guest_session_id, stay_id, expires_at, revoked_at")
    .eq("session_token_hash", hash)
    .maybeSingle();

  if (gsError)
    return { ok: false, error_code: "INTERNAL_ERROR", message: "Database error during session validation", status: 500 };
  if (!gs)
    return { ok: false, error_code: "UNAUTHORIZED", message: "Invalid session token", status: 401 };
  if (gs.revoked_at)
    return { ok: false, error_code: "GUEST_SESSION_REVOKED", message: "Guest session has been revoked", status: 401 };
  if (new Date(gs.expires_at).getTime() <= Date.now())
    return { ok: false, error_code: "GUEST_SESSION_EXPIRED", message: "Guest session has expired", status: 401 };

  const { data: stay, error: stayError } = await db
    .from("stay")
    .select("stay_id, company_id")
    .eq("stay_id", gs.stay_id)
    .maybeSingle();

  if (stayError)
    return { ok: false, error_code: "INTERNAL_ERROR", message: "Database error fetching stay", status: 500 };
  if (!stay)
    return { ok: false, error_code: "STAY_NOT_FOUND", message: "Stay not found for this session", status: 404 };

  return {
    ok: true,
    session: {
      guest_session_id: gs.guest_session_id,
      stay_id: stay.stay_id,
      company_id: stay.company_id,
    },
  };
}

// ── Response helpers ─────────────────────────────────────────────────────────

export function errorResponse(error_code: string, message: string, details?: unknown) {
  return { error_code, message, ...(details !== undefined ? { details } : {}) };
}

// ── RPC error mapping ────────────────────────────────────────────────────────

export function mapRpcError(msg: string) {
  if (msg.includes("CONFLICT_ACTIVE_STAY_ROOM"))
    return { http: 409, error_code: "CONFLICT_ACTIVE_STAY_ROOM", message: "Room already has an active stay." };
  if (msg.includes("CONFLICT_ACTIVE_STAY_CARD"))
    return { http: 409, error_code: "CONFLICT_ACTIVE_STAY_CARD", message: "Card already used by an active stay." };
  if (msg.includes("CONFLICT_CARD_NOT_BOUND"))
    return { http: 409, error_code: "CONFLICT_CARD_NOT_BOUND", message: "Card is not bound to the specified room." };
  if (msg.includes("CONFLICT_CARD_REVOKED"))
    return { http: 409, error_code: "CONFLICT_CARD_REVOKED", message: "Card has been revoked." };
  if (msg.includes("CONFLICT_ROOM_INACTIVE"))
    return { http: 409, error_code: "CONFLICT_ROOM_INACTIVE", message: "Room is inactive." };
  if (msg.includes("CONFLICT_ALREADY_CLOSED"))
    return { http: 409, error_code: "CONFLICT_ALREADY_CLOSED", message: "Stay already closed." };
  if (msg.includes("CONFLICT_STAY_NOT_ACTIVE"))
    return { http: 409, error_code: "CONFLICT_STAY_NOT_ACTIVE", message: "Stay is not active." };
  if (msg.includes("NOT_FOUND"))
    return { http: 404, error_code: "NOT_FOUND", message: "Stay not found." };
  if (msg.includes("FORBIDDEN"))
    return { http: 403, error_code: "FORBIDDEN", message: "Forbidden." };
  return { http: 500, error_code: "INTERNAL_ERROR", message: "Internal error from database." };
}
