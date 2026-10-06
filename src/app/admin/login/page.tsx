'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasSupabase, browserClient } from '@/lib/supabase';

function Login() {
  const sp = useSearchParams(); const router = useRouter();
  const [err, setErr] = useState(sp.get('denied') ? 'This account does not have admin access.' : '');
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  if (!hasSupabase) return <div className="panel"><span className="logo"><b>EssenceKraft</b><small>ADMIN</small></span><h1 style={{ fontSize: '1.4rem' }}>Demo admin</h1><p className="muted">Supabase isn&apos;t connected yet, so the admin runs on sample data. Real sign-in turns on automatically once it&apos;s connected.</p><a className="btn btn-primary" href="/admin">Open demo admin</a></div>;
  return (
    <form className="panel" onSubmit={async e => {
      e.preventDefault(); setErr(''); setBusy(true);
      const f = new FormData(e.currentTarget);
      const { error } = await browserClient().auth.signInWithPassword({ email: String(f.get('email')), password: String(f.get('password')) });
      if (error) { setErr(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message); setBusy(false); return; }
      router.replace(sp.get('next') || '/admin'); router.refresh();
    }}>
      <span className="logo"><b>EssenceKraft</b><small>ADMIN</small></span>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" autoComplete="username" required /></div>
      <div className="field"><label htmlFor="pw">Password</label><input id="pw" name="password" type="password" className="input" autoComplete="current-password" required minLength={8} /></div>
      {err && <p className="notice error" role="alert">{err}</p>}
      {sent && <p className="notice ok">Check your inbox for a reset link.</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <button type="button" className="link" style={{ justifySelf: 'start' }} onClick={async () => {
        const email = (document.getElementById('email') as HTMLInputElement).value;
        if (!email) { setErr('Enter your email first.'); return; }
        await browserClient().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin/login` }); setSent(true);
      }}>Forgot password?</button>
    </form>
  );
}
export default function Page() { return <div className="login"><Suspense><Login /></Suspense></div>; }
