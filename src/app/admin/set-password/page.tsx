'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/lib/brand';
import { browserClient, hasSupabase } from '@/lib/supabase';

// Landing page for team invites and admin password resets (links emailed by /api/team and /api/auth/admin-reset).
function SetPassword() {
  const sp = useSearchParams(); const router = useRouter();
  const [state, setState] = useState<'checking' | 'ready' | 'bad'>('checking');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [email, setEmail] = useState('');
  const type = sp.get('type') ?? 'recovery';
  useEffect(() => {
    if (!hasSupabase) { setState('bad'); return; }
    const sb = browserClient(); const th = sp.get('token_hash');
    (async () => {
      if (th) {
        const { data, error } = await sb.auth.verifyOtp({ token_hash: th, type: (type === 'invite' ? 'invite' : type === 'magiclink' ? 'magiclink' : 'recovery') });
        if (error || !data.session) { setState('bad'); setErr(error?.message?.includes('expired') ? 'This link has expired.' : 'This link is invalid or was already used.'); return; }
        window.history.replaceState(null, '', '/admin/set-password');
        if (type === 'magiclink') { router.replace('/admin'); return; }
        setEmail(data.user?.email ?? ''); setState('ready'); return;
      }
      const { data } = await sb.auth.getSession();
      if (data.session) { setEmail(data.session.user.email ?? ''); setState('ready'); } else setState('bad');
    })();
  }, [sp, type, router]);

  if (state === 'checking') return <div className="panel"><p>Checking your link…</p></div>;
  if (state === 'bad') return <div className="panel"><span className="logo"><img src={BRAND.logo} alt="essenceKRAFT" width={216} height={40} /><small style={{ marginTop: 6 }}>ADMIN</small></span>
    <h1 style={{ fontSize: '1.3rem' }}>Link not valid</h1><p className="muted">{err || 'Open the latest email we sent you, or ask an admin to resend your invite.'}</p>
    <a className="btn btn-primary" href="/admin/login">Go to sign in</a></div>;
  return (
    <form className="panel" onSubmit={async e => {
      e.preventDefault(); setErr('');
      const f = new FormData(e.currentTarget); const pw = String(f.get('pw')); const pw2 = String(f.get('pw2'));
      if (pw.length < 8) return setErr('Use at least 8 characters.');
      if (pw !== pw2) return setErr('The two passwords don’t match.');
      setBusy(true);
      const { error } = await browserClient().auth.updateUser({ password: pw });
      if (error) { setBusy(false); return setErr(error.message); }
      router.replace('/admin'); router.refresh();
    }}>
      <span className="logo"><img src={BRAND.logo} alt="essenceKRAFT" width={216} height={40} /><small style={{ marginTop: 6 }}>ADMIN</small></span>
      <h1 style={{ fontSize: '1.3rem' }}>{type === 'invite' ? 'Welcome — set your password' : 'Choose a new password'}</h1>
      {email && <p className="muted" style={{ marginTop: -6 }}>{email}</p>}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className="field"><label htmlFor="pw">New password</label><input id="pw" name="pw" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
      <div className="field"><label htmlFor="pw2">Confirm password</label><input id="pw2" name="pw2" type="password" className="input" autoComplete="new-password" minLength={8} required /></div>
      {err && <p className="notice error" role="alert">{err}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save password & continue'}</button>
    </form>
  );
}
export default function Page() { return <div className="login"><Suspense><SetPassword /></Suspense></div>; }
