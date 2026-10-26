'use client';
import { useEffect, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { acct } from '@/lib/account';
import { hasSupabase } from '@/lib/supabase';
import { track } from '@/lib/attribution';
import { CloseIcon } from './Icons';

type Mode = 'login' | 'signup' | 'forgot' | 'sent' | 'done';
type Props = { open: boolean; onClose: () => void; context: 'offer' | 'checkout'; code?: string; title?: string; onSignedIn?: () => void };
const i = (d: string) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
const UserI = () => i('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c1.5-3.5 4.4-5 8-5s6.5 1.5 8 5');
const MailI = () => i('M3 6h18v12H3zM3 7l9 6 9-6');
const LockI = () => i('M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3');
const EyeI = ({ off }: { off?: boolean }) => i(off ? 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.7 9.7 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.6 7.9 3.2 9.9 2.5 12c1 2.5 4.5 7 9.5 7 1.7 0 3.2-.5 4.5-1.2' : 'M2.5 12C3.5 9.5 7 5 12 5s8.5 4.5 9.5 7c-1 2.5-4.5 7-9.5 7S3.5 14.5 2.5 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z');
const Leaf = ({ className }: { className: string }) => <svg className={className} viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden>
  <path d="M10 110C40 80 70 50 110 10" /><path d="M40 80c-14-2-24 4-30 14 12 2 23-2 30-14zM40 80c2-14-4-24-14-30-2 12 2 23 14 30zM62 58c-14-2-24 4-30 14 12 2 23-2 30-14zM62 58c2-14-4-24-14-30-2 12 2 23 14 30zM84 36c-14-2-24 4-30 14 12 2 23-2 30-14zM84 36c2-14-4-24-14-30-2 12 2 23 14 30z" /></svg>;

// Login / sign-up popup (welcome offer + checkout). Email + password with Supabase Auth.
export function AuthModal({ open, onClose, context, code = 'WELCOME10', title, onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState('');
  const [show, setShow] = useState(false); const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [copied, setCopied] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return; setErr(''); closeBtn.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const back = context === 'checkout' ? '/checkout' : '/';
  const signedIn = () => {
    try { localStorage.setItem('ek_remember', remember ? '1' : '0'); sessionStorage.setItem('ek_alive', '1'); localStorage.setItem('ek_offer_claimed', new Date().toISOString()); } catch {}
    if (context === 'checkout') { onSignedIn?.(); onClose(); } else { setMode('done'); onSignedIn?.(); }
  };
  const friendly = (m: string) => /invalid login/i.test(m) ? 'Email or password is incorrect.' : /not confirmed/i.test(m) ? 'Please confirm your email first — open the link we sent you.' : /already registered|already exists/i.test(m) ? 'This email already has an account — log in instead.' : m;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!hasSupabase) return setErr('Accounts are not available in demo mode.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Enter a valid email address.');
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await acct().auth.signInWithPassword({ email: email.trim(), password: pw });
        if (error) return setErr(friendly(error.message)); signedIn();
      } else if (mode === 'signup') {
        if (!name.trim()) return setErr('Enter your name.');
        if (pw.length < 8) return setErr('Use at least 8 characters for your password.');
        const { data, error } = await acct().auth.signUp({ email: email.trim(), password: pw, options: { data: { full_name: name.trim() }, emailRedirectTo: `${origin}${back}` } });
        if (error) return setErr(friendly(error.message));
        track('sign_up', { method: 'email' });
        if (data.user && !data.user.identities?.length) return setErr('This email already has an account — log in instead.');
        if (data.session) signedIn(); else setMode('sent');
      } else if (mode === 'forgot') {
        const { error } = await acct().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${origin}/account?reset=1` });
        if (error) return setErr(error.message); setMode('sent');
      }
    } finally { setBusy(false); }
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };
  const heading = title ?? (context === 'checkout' ? 'Log in to complete your purchase' : 'Get 10% off your first order');
  const intro = context === 'checkout' ? 'Your cart is saved. Log in or create a free account to place your order, track it and download invoices.' : 'Log in or sign up to unlock your exclusive discount and enjoy special offers, new product updates and wellness tips.';

  return (
    <div className="offer-wrap" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="offer auth-pop" role="dialog" aria-modal="true" aria-labelledby="auth-h">
        <button ref={closeBtn} className="icon-btn offer-x" aria-label="Close" onClick={onClose}><CloseIcon /></button>
        <div className="offer-art" aria-hidden><img src={BRAND.promoWellness} alt="" /><span className="offer-badge"><b>10%</b>OFF</span></div>
        <div className="offer-body auth-body">
          <Leaf className="auth-leaf tr" /><Leaf className="auth-leaf bl" />
          <div className="auth-logo"><img src={BRAND.logo} alt="essenceKRAFT" width={216} height={40} /><small>THE ALCHEMY OF SCENT</small></div>
          <span className="auth-eyebrow">{context === 'checkout' ? 'SECURE CHECKOUT' : 'WELCOME OFFER'}</span>
          {mode === 'done' ? <>
            <h2 id="auth-h">You’re in! Here’s your 10% off</h2>
            <p className="muted">Use this code at checkout on your first order:</p>
            <button className="offer-code" onClick={copy} aria-label={`Copy code ${code}`}><b>{code}</b><span>{copied ? 'Copied ✓' : 'Tap to copy'}</span></button>
            <a className="btn btn-primary btn-block" href="/shop?sort=best" onClick={onClose}>Shop best sellers</a>
          </> : mode === 'sent' ? <>
            <h2 id="auth-h">Check your email</h2>
            <p className="muted">{name ? 'We sent a confirmation link' : 'We sent a password-reset link'} to <b>{email}</b>. Open it to continue{context === 'checkout' ? ' — you’ll come straight back to checkout with your cart' : ''}.</p>
            <button className="btn btn-ghost btn-block" onClick={() => { setMode('login'); setErr(''); }}>Back to log in</button>
          </> : <>
            <h2 id="auth-h">{mode === 'signup' ? (context === 'checkout' ? 'Create your account' : heading) : mode === 'forgot' ? 'Reset your password' : heading}</h2>
            <p className="muted auth-intro">{mode === 'forgot' ? 'Enter your email and we’ll send you a link to set a new password.' : intro}</p>
            <form className="auth-form" onSubmit={submit} noValidate>
              {mode === 'signup' && <label className="auth-field"><UserI /><span className="sr">Full name</span><input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoComplete="name" /></label>}
              <label className="auth-field">{mode === 'signup' ? <MailI /> : <UserI />}<span className="sr">Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" autoComplete="email" /></label>
              {mode !== 'forgot' && <label className="auth-field"><LockI /><span className="sr">Password</span><input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder={mode === 'signup' ? 'Create a password (8+ characters)' : 'Password'} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                <button type="button" className="auth-eye" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide password' : 'Show password'}><EyeI off={show} /></button></label>}
              {mode === 'login' && <div className="auth-row"><label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />Remember me</label>
                <button type="button" className="link" onClick={() => { setMode('forgot'); setErr(''); }}>Forgot password?</button></div>}
              {err && <p className="err" role="alert">{err}</p>}
              <button className="btn btn-primary btn-block auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? <>Log In <span aria-hidden>→</span></> : mode === 'signup' ? <>Create account <span aria-hidden>→</span></> : 'Send reset link'}</button>
            </form>
            <div className="auth-or"><span>OR</span></div>
            <p className="auth-switch">{mode === 'login' ? <>Don’t have an account? <button className="link" onClick={() => { setMode('signup'); setErr(''); }}>Sign Up</button></>
              : <>Already have an account? <button className="link" onClick={() => { setMode('login'); setErr(''); }}>Log In</button></>}</p>
            {mode === 'login' && <p className="auth-alt"><a className="link" href={`/account${context === 'checkout' ? '?next=/checkout' : ''}`}>Log in with an email code instead</a></p>}
          </>}
        </div>
      </div>
    </div>
  );
}
