// Heartel API Server - Shared utilities
// Shared constants and helper functions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const ROUTE_PREFIX = "/make-server-14a1e5b0";

// Create Supabase client (service role)
export function getDb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// Error response helper
export function errorResponse(
  error_code: string,
  message: string,
  details?: any
) {
  return {
    error_code,
    message,
    details
  };
}

// Success response helper
export function successResponse(data: any) {
  return data;
}

// SHA-256 hash helper for token hashing
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate opaque token
export function generateOpaqueToken(): string {
  return crypto.randomUUID() + crypto.randomUUID();
}

// ─── Guest Session Validation ───────────────────────────────────────
// Validates guest_session_token from Authorization header.
// Returns { guest_session, stay } on success, or { error, status } on failure.
export interface GuestSessionResult {
  guest_session_id: string;
  stay_id: string;
  company_id: string;
}

export async function validateGuestSession(
  authHeader: string | null
): Promise<
  | { ok: true; session: GuestSessionResult }
  | { ok: false; error_code: string; message: string; status: number }
> {
  const token = (authHeader ?? "").trim();
  if (!token) {
    return { ok: false, error_code: "UNAUTHORIZED", message: "Missing guest session token", status: 401 };
  }

  const hash = await hashToken(token);
  const db = getDb();

  // 1) Lookup guest_session by token hash
  const { data: gs, error: gsError } = await db
    .from("guest_session")
    .select("guest_session_id, stay_id, expires_at, revoked_at")
    .eq("session_token_hash", hash)
    .maybeSingle();

  if (gsError) {
    console.error("Error validating guest session:", gsError);
    return { ok: false, error_code: "INTERNAL_ERROR", message: "Database error during session validation", status: 500 };
  }

  if (!gs) {
    return { ok: false, error_code: "UNAUTHORIZED", message: "Invalid session token", status: 401 };
  }

  if (gs.revoked_at) {
    return { ok: false, error_code: "GUEST_SESSION_REVOKED", message: "Guest session has been revoked", status: 401 };
  }

  if (new Date(gs.expires_at).getTime() <= Date.now()) {
    return { ok: false, error_code: "GUEST_SESSION_EXPIRED", message: "Guest session has expired", status: 401 };
  }

  // 2) Resolve stay -> company_id
  const { data: stay, error: stayError } = await db
    .from("stay")
    .select("stay_id, company_id")
    .eq("stay_id", gs.stay_id)
    .maybeSingle();

  if (stayError) {
    console.error("Error fetching stay for session:", stayError);
    return { ok: false, error_code: "INTERNAL_ERROR", message: "Database error fetching stay", status: 500 };
  }

  if (!stay) {
    return { ok: false, error_code: "STAY_NOT_FOUND", message: "Stay not found for this session", status: 404 };
  }

  return {
    ok: true,
    session: {
      guest_session_id: gs.guest_session_id,
      stay_id: stay.stay_id,
      company_id: stay.company_id,
    }
  };
}