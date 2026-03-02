import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export const serverUrl = `https://${projectId}.supabase.co/functions/v1/api/make-server-c253248c`;

/**
 * Build headers for Edge Function calls.
 * - `Authorization: Bearer <anon_key>` satisfies the Supabase gateway
 * - `apikey: <anon_key>` is a secondary gateway credential
 * - `x-user-token: <user_jwt>` carries the real user JWT to our Hono code
 */
export function authHeaders(accessToken: string): Record<string, string> {
  return {
    'apikey': publicAnonKey,
    'Authorization': `Bearer ${publicAnonKey}`,
    'x-user-token': accessToken,
  };
}

export function authHeadersWithJson(accessToken: string): Record<string, string> {
  return {
    ...authHeaders(accessToken),
    'Content-Type': 'application/json',
  };
}