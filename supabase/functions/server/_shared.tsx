// Shared configuration, Supabase clients, and auth/authz helpers
import { createClient } from "npm:@supabase/supabase-js@2";

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export const ROUTE_PREFIX = "/make-server-20781d19";

export { createClient };

/**
 * Create a Supabase client authenticated with the user's access token.
 */
export function createAuthClient(accessToken: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

/**
 * Create a Supabase client with the service role key (full DB access).
 */
export function createServiceClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Authenticate user via access_token → returns auth user id or null.
 */
export async function authenticateUser(accessToken: string): Promise<{ userId: string } | { error: string }> {
  const supabaseAuth = createAuthClient(accessToken);
  const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
  if (userErr || !userData?.user) {
    return { error: userErr?.message || "Invalid token" };
  }
  return { userId: userData.user.id };
}

/**
 * Authorize: verify user has an active staff/manager membership for the company.
 * Returns company_member record or error.
 */
export async function authorizeStaffOrManager(
  supabaseSvc: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
): Promise<{ member: { company_member_id: string; member_role: string; member_status: string } } | { error: string }> {
  const { data: member, error: memErr } = await supabaseSvc
    .from("company_member")
    .select("company_member_id, member_role, member_status")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr) {
    return { error: `Membership query failed: ${memErr.message}` };
  }
  if (!member) {
    return { error: "No membership found" };
  }
  if (!["staff", "manager"].includes(member.member_role) || member.member_status !== "active") {
    return { error: "Insufficient role or inactive" };
  }
  return { member };
}

/**
 * Common auth+authz flow. Returns userId, member, and service client — or an error response.
 */
export async function authAndAuthorize(
  accessToken: string | undefined,
  companyId: string | undefined,
  tag: string,
): Promise<
  | { ok: true; userId: string; member: { company_member_id: string; member_role: string }; svc: ReturnType<typeof createClient> }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  if (!accessToken) {
    return { ok: false, status: 401, body: { error_code: "UNAUTHORIZED", message: "Missing access_token" } };
  }
  if (!companyId) {
    return { ok: false, status: 400, body: { error_code: "VALIDATION_ERROR", message: "company_id is required" } };
  }

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

/**
 * RPC error mapping (used for checkin/checkout if RPC is adopted later).
 */
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
  if (msg.includes("VALIDATION_ERROR"))
    return { http: 400, error_code: "VALIDATION_ERROR", message: "Validation error." };
  return { http: 500, error_code: "INTERNAL_ERROR", message: "Internal error from database." };
}