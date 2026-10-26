'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { hasSupabase, browserClient } from '@/lib/supabase';

// Finishes sign-in when a Supabase email link (confirm sign-up, magic link) lands on any store page with ?code=…
// The email is already confirmed by Supabase at this point; we exchange the code for a session and send the
// customer on to where they were going (?next=…, else My account).
export function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    if (!hasSupabase) return;
    // “Remember me” off → sign out when the browser was closed (sessionStorage is cleared, localStorage keeps the choice).
    try {
      if (localStorage.getItem('ek_remember') === '0' && !sessionStorage.getItem('ek_alive')) browserClient().auth.signOut();
      sessionStorage.setItem('ek_alive', '1');
    } catch { /* storage blocked */ }
    const u = new URL(window.location.href);
    const code = u.searchParams.get('code'); const err = u.searchParams.get('error_description');
    if (!code && !err) return;
    const next = u.searchParams.get('next');
    // Default: stay on the page the link pointed to (minus the auth params), e.g. /checkout or /account?reset=1; the home page goes to My account.
    ['code', 'next', 'error', 'error_code', 'error_description'].forEach(k => u.searchParams.delete(k));
    const here = u.pathname === '/' ? '/account' : u.pathname + (u.search || '');
    const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : here;
    if (err) { router.replace(`/account?auth_error=${encodeURIComponent(err)}`); return; }
    browserClient().auth.exchangeCodeForSession(code!).then(({ error }) => {
      // If the link was opened in a different browser the exchange can't complete — the email is still confirmed, so just sign in.
      router.replace(error ? '/account?confirmed=1' : dest);
    });
  }, [router]);
  return null;
}
