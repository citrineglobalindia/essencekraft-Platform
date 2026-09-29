import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './supabase';
/** Service-role client — server routes only (payment verification). Never import in client code. */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
