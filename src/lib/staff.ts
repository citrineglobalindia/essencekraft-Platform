import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON } from './supabase';
function userClient(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token || !SUPABASE_URL) return null;
  return { token, sb: createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } }) };
}
/** True when the request carries a signed-in staff member's Supabase access token (Authorization: Bearer …). */
export async function isStaffRequest(req: Request) {
  const c = userClient(req); if (!c) return false;
  const { data, error } = await c.sb.rpc('is_staff');
  return !error && !!data;
}
/** The signed-in admin's user id, or null if the caller isn't an admin. */
export async function adminCaller(req: Request): Promise<string | null> {
  const c = userClient(req); if (!c) return null;
  const { data: u } = await c.sb.auth.getUser(c.token);
  if (!u.user) return null;
  const { data } = await c.sb.rpc('has_role', { roles: ['admin'] });
  return data ? u.user.id : null;
}
