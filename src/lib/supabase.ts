import { createBrowserClient } from '@supabase/ssr';
import { createClient as createPlain } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_ANON);

/** Browser client with cookie-based auth session (admin + checkout). */
export function browserClient() {
  if (!hasSupabase) throw new Error('Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON);
}

/** Stateless anon client for public catalogue reads on the server. */
export function publicClient() {
  return createPlain(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
}
