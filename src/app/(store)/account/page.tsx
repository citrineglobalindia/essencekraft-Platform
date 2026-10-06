'use client';
import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { hasSupabase } from '@/lib/supabase';
import { acct, useUser, INDIAN_STATES, type User } from '@/lib/account';
import { useCart } from '@/lib/cart';
import { inr } from '@/lib/format';

type Ord = { id: string; order_no: string; access_token: string; status: string; total: number; created_at: string; invoice_no: string | null; order_items: { product_name: string; qty: number }[] };
type Addr = { id?: string; label: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; is_default: boolean };
type Msg = { t: 'ok' | 'error'; m: string } | null;
const tone: Record<string, string> = { placed: 'amber', confirmed: 'green', packed: 'green', shipped: 'green', delivered: 'green', cancelled: 'red', returned: 'grey' };

function Track() {
  const router = useRouter(); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="panel form-grid" onSubmit={async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    const f = new FormData(e.currentTarget); const no = String(f.get('no')).trim().toUpperCase(); const email = String(f.get('email')).trim();
    if (!hasSupabase) { router.push(`/order/${no}?t=demo`); return; }
    const { data } = await acct().rpc('track_order', { p_no: no, p_email: email });
    if (data) router.push(`/order/${data.order_no}?t=${data.token}`); else { setErr('No order matches that number and email.'); setBusy(false); }
  }}><h2>Track an order</h2><p className="muted" style={{ fontSize: 14 }}>No account needed — use your order number and checkout email.</p>
    <div className="field"><label htmlFor="no">Order number</label><input id="no" name="no" className="input" placeholder="EK10001" required /></div>
    <div className="field"><label htmlFor="em">Email</label><input id="em" name="email" type="email" className="input" required /></div>
    {err && <p className="err" role="alert">{err}</p>}<button className="btn btn-ghost" disabled={busy}>{busy ? 'Looking up…' : 'Find my order'}</button></form>;
}

function Auth() {
  const sp = useSearchParams(); const [mode, setMode] = useState<'code' | 'password' | 'signup'>('code');
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [name, setName] = useState(''); const [code, setCode] = useState('');
  const [sent, setSent] = useState(false); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<Msg>(null);
  const run = async (fn: () => Promise<{ error: { message: string } | null } | void>) => { setBusy(true); setMsg(null); try { const r = await fn(); if (r && r.error) setMsg({ t: 'error', m: r.error.message }); } finally { setBusy(false); } };
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return <div className="panel auth-box">
    <h2>Sign in or create an account</h2><p className="muted" style={{ fontSize: 14, margin: '4px 0 14px' }}>See all your orders, download invoices, save addresses and collect reward points.</p>
    <div className="auth-tabs" role="tablist">{([['code', 'Email code'], ['password', 'Password'], ['signup', 'Create account']] as const).map(([k, l]) => <button key={k} role="tab" aria-pressed={mode === k} onClick={() => { setMode(k); setMsg(null); setSent(false); }}>{l}</button>)}</div>
    {sp.get('next') && <p className="notice" style={{ marginBottom: 10 }}>Sign in to continue.</p>}
    <form className="form-grid" onSubmit={e => { e.preventDefault();
      if (mode === 'code' && !sent) run(async () => { const r = await acct().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: `${origin}/account` } }); if (!r.error) { setSent(true); setMsg({ t: 'ok', m: `We emailed a 6-digit code to ${email}.` }); } return r; });
      else if (mode === 'code') run(() => acct().auth.verifyOtp({ email, token: code.trim(), type: 'email' }));
      else if (mode === 'password') run(() => acct().auth.signInWithPassword({ email, password: pw }));
      else run(async () => { if (pw.length < 8) return { error: { message: 'Use at least 8 characters for your password.' } };
        const r = await acct().auth.signUp({ email, password: pw, options: { data: { full_name: name }, emailRedirectTo: `${origin}/account` } });
        if (!r.error && !r.data.session) setMsg({ t: 'ok', m: `Almost done — open the link we sent to ${email} to confirm your account.` }); return r; }); }}>
      {mode === 'signup' && <div className="field"><label htmlFor="a-name">Full name</label><input id="a-name" className="input" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" /></div>}
      <div className="field"><label htmlFor="a-email">Email</label><input id="a-email" type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" disabled={sent} /></div>
      {mode === 'code' && sent && <div className="field"><label htmlFor="a-code">6-digit code</label><input id="a-code" className="input" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required /></div>}
      {mode !== 'code' && <div className="field"><label htmlFor="a-pw">Password</label><input id="a-pw" type="password" className="input" value={pw} onChange={e => setPw(e.target.value)} required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} /></div>}
      {msg && <p className={`notice ${msg.t}`} role="status">{msg.m}</p>}
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'code' ? (sent ? 'Verify & sign in' : 'Email me a code') : mode === 'password' ? 'Sign in' : 'Create account'}</button>
      {mode === 'code' && sent && <button type="button" className="link" onClick={() => { setSent(false); setCode(''); setMsg(null); }}>Use a different email</button>}
      {mode === 'password' && <button type="button" className="link" style={{ justifySelf: 'start' }} onClick={() => email ? run(async () => { const r = await acct().auth.resetPasswordForEmail(email, { redirectTo: `${origin}/account?reset=1` }); if (!r.error) setMsg({ t: 'ok', m: `Password reset link sent to ${email}.` }); return r; }) : setMsg({ t: 'error', m: 'Enter your email first.' })}>Forgot password?</button>}
    </form>
  </div>;
}

function Dashboard({ user }: { user: User }) {
  const sp = useSearchParams(); const [tab, setTab] = useState(sp.get('reset') ? 'profile' : 'orders');
  const { wishlist, toggleWish } = useCart();
  const [orders, setOrders] = useState<Ord[] | null>(null); const [addrs, setAddrs] = useState<Addr[]>([]); const [edit, setEdit] = useState<Addr | null>(null);
  const [profile, setProfile] = useState({ full_name: '', phone: '' }); const [points, setPoints] = useState<{ points: number; reason: string; order_no: string | null; created_at: string }[]>([]);
  const [ref, setRef] = useState<string | null>(null); const [products, setProducts] = useState<{ slug: string; name: string; variants: { price: number }[] }[]>([]);
  const [msg, setMsg] = useState<Msg>(null); const [pw, setPw] = useState('');
  const load = useCallback(async () => {
    const c = acct();
    c.from('orders').select('id,order_no,access_token,status,total,created_at,invoice_no,order_items(product_name,qty)').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setOrders((data ?? []) as Ord[]));
    c.from('addresses').select('*').order('is_default', { ascending: false }).then(({ data }) => setAddrs((data ?? []) as Addr[]));
    c.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle().then(({ data }) => data && setProfile({ full_name: data.full_name ?? '', phone: data.phone ?? '' }));
    c.from('loyalty_ledger').select('points,reason,order_no,created_at').order('created_at', { ascending: false }).then(({ data }) => setPoints(data ?? []));
    c.from('referral_codes').select('code').maybeSingle().then(({ data }) => setRef(data?.code ?? null));
  }, [user.id]);
  useEffect(() => {
    const c = acct(); const key = `ek_claimed_${user.id}`;
    (async () => {
      if (hasSupabase && !sessionStorage.getItem(key)) { await c.rpc('claim_my_orders'); sessionStorage.setItem(key, '1'); }
      // Wishlist sync: merge this device's hearts into the account and back
      const { data } = await c.from('wishlist').select('product_slug'); const remote = (data ?? []).map(r => r.product_slug as string);
      const missing = wishlist.filter(s => !remote.includes(s)); if (missing.length) await c.from('wishlist').insert(missing.map(product_slug => ({ product_slug })));
      remote.filter(s => !wishlist.includes(s)).forEach(toggleWish);
      load();
    })();
    fetch('/api/catalog').then(r => r.json()).then(setProducts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);
  const saveAddr = async (e: React.FormEvent) => { e.preventDefault(); if (!edit) return; setMsg(null);
    if (!/^[6-9]\d{9}$/.test(edit.phone.replace(/\D/g, '').slice(-10))) return setMsg({ t: 'error', m: 'Enter a valid 10-digit mobile number.' });
    if (!/^[1-9]\d{5}$/.test(edit.pincode)) return setMsg({ t: 'error', m: 'Enter a valid 6-digit pincode.' });
    const c = acct(); if (edit.is_default) await c.from('addresses').update({ is_default: false }).eq('user_id', user.id);
    const row = { ...edit, phone: edit.phone.replace(/\D/g, '').slice(-10) }; delete row.id;
    const r = edit.id ? await c.from('addresses').update(row).eq('id', edit.id) : await c.from('addresses').insert({ ...row, is_default: edit.is_default || addrs.length === 0 });
    if (r.error) setMsg({ t: 'error', m: r.error.message }); else { setEdit(null); setMsg({ t: 'ok', m: 'Address saved.' }); load(); } };
  const balance = points.reduce((s, p) => s + p.points, 0);
  const wished = products.filter(p => wishlist.includes(p.slug));
  const blankAddr: Addr = { label: 'Home', full_name: profile.full_name, phone: profile.phone, line1: '', line2: '', city: '', state: 'Karnataka', pincode: '', is_default: addrs.length === 0 };
  const A = (k: keyof Addr, l: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <div className="field"><label htmlFor={`ad-${k}`}>{l}</label><input id={`ad-${k}`} className="input" value={String(edit?.[k] ?? '')} onChange={e => setEdit(x => x && { ...x, [k]: e.target.value })} {...props} /></div>;
  return <div className="acct">
    <nav className="acct-nav" aria-label="Account">{[['orders', `Orders${orders ? ` (${orders.length})` : ''}`], ['addresses', 'Addresses'], ['wishlist', `Wishlist (${wishlist.length})`], ['rewards', `Rewards · ${balance} pts`], ['profile', 'Profile']].map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => { setTab(k); setMsg(null); }}>{l}</button>)}</nav>
    <div className="form-grid">
      {msg && <p className={`notice ${msg.t}`} role="status">{msg.m}</p>}
      {tab === 'orders' && <section className="acct-orders">{orders === null ? <p>Loading…</p> : orders.length ? orders.map(o => (
        <div key={o.id} className="acct-card acct-order"><div><b>{o.order_no}</b> <span className={`pill ${tone[o.status] ?? ''}`}>{o.status}</span><br /><small className="muted">{new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {o.order_items.map(i => `${i.product_name}${i.qty > 1 ? ` ×${i.qty}` : ''}`).join(', ')}</small></div>
          <div style={{ textAlign: 'right' }}><b>{inr(o.total)}</b><br /><Link className="link" href={`/order/${o.order_no}?t=${o.access_token}`}>Track</Link>{o.invoice_no && <> · <Link className="link" href={`/order/${o.order_no}/invoice?t=${o.access_token}`}>Invoice</Link></>}</div></div>))
        : <div className="acct-card"><p>No orders yet. Orders you place while signed in — or earlier orders with {user.email} — appear here.</p><Link className="btn btn-primary btn-sm" href="/shop" style={{ justifySelf: 'start', marginTop: 8 }}>Start shopping</Link></div>}</section>}
      {tab === 'addresses' && <>{edit ? <form className="panel form-grid" onSubmit={saveAddr}><h2>{edit.id ? 'Edit address' : 'New address'}</h2>
        <div className="form-grid two">{A('label', 'Label', { placeholder: 'Home / Work' })}{A('full_name', 'Full name', { required: true })}{A('phone', 'Mobile', { required: true, inputMode: 'tel' })}{A('pincode', 'Pincode', { required: true, inputMode: 'numeric', maxLength: 6 })}</div>
        {A('line1', 'House / street', { required: true })}{A('line2', 'Area / landmark')}
        <div className="form-grid two">{A('city', 'City', { required: true })}<div className="field"><label htmlFor="ad-state">State</label><select id="ad-state" className="select" value={edit.state} onChange={e => setEdit({ ...edit, state: e.target.value })}>{INDIAN_STATES.map(s => <option key={s}>{s}</option>)}</select></div></div>
        <label className="check"><input type="checkbox" checked={edit.is_default} onChange={e => setEdit({ ...edit, is_default: e.target.checked })} />Use as my default address</label>
        <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-primary">Save address</button><button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button></div></form>
        : <><div className="acct-addr">{addrs.map(a => <div key={a.id} className="acct-card"><b>{a.label}{a.is_default && <span className="pill green" style={{ marginLeft: 6 }}>default</span>}</b><p style={{ fontSize: 14 }}>{a.full_name} · {a.phone}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br />{a.city}, {a.state} {a.pincode}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}><button className="link" onClick={() => setEdit(a)}>Edit</button><button className="link" onClick={async () => { if (confirm('Delete this address?')) { await acct().from('addresses').delete().eq('id', a.id!); load(); } }}>Delete</button></div></div>)}</div>
          <button className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }} onClick={() => setEdit(blankAddr)}>+ Add address</button></>}</>}
      {tab === 'wishlist' && (wished.length ? <div className="acct-addr">{wished.map(p => <div key={p.slug} className="acct-card"><Link className="link" href={`/product/${p.slug}`}><b>{p.name}</b></Link><span className="muted">from {inr(Math.min(...p.variants.map(v => v.price)))}</span>
        <button className="link" style={{ justifySelf: 'start' }} onClick={async () => { toggleWish(p.slug); await acct().from('wishlist').delete().eq('product_slug', p.slug); }}>Remove</button></div>)}</div>
        : <div className="acct-card"><p>Tap the heart on any product to save it here. Your wishlist now follows you across devices.</p></div>)}
      {tab === 'rewards' && <>
        <div className="acct-card" style={{ background: 'linear-gradient(120deg,#eef4ec,#f6efe0)' }}><span className="muted">Your points</span><b style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--forest)' }}>{balance}</b><span className="muted">Points are added when an order is delivered. Ask us on WhatsApp to turn 100+ points into a discount code.</span></div>
        {ref && <div className="acct-card referral"><b>Your referral code</b><div className="referral-row" style={{ marginTop: 6 }}><code>{ref}</code><a className="btn btn-primary btn-sm" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(`I use EssenceKraft's pure essential oils. Use my code ${ref} for a discount on your first order: ${typeof window !== 'undefined' ? window.location.origin : ''}/shop`)}`}>Share on WhatsApp</a></div><small className="muted">Friends save on their order; you get bonus points when it’s delivered.</small></div>}
        <div className="acct-card"><b>History</b>{points.length ? <ol className="adm-timeline">{points.map((p, i) => <li key={i}><span>{p.points > 0 ? '＋' : '−'}</span><div><b>{p.points > 0 ? '+' : ''}{p.points}</b> · {p.reason}{p.order_no ? ` · ${p.order_no}` : ''}<small>{new Date(p.created_at).toLocaleDateString('en-IN')}</small></div></li>)}</ol> : <p className="muted">No points yet.</p>}</div></>}
      {tab === 'profile' && <>
        <form className="panel form-grid" onSubmit={async e => { e.preventDefault(); const { error } = await acct().rpc('update_my_profile', { p_name: profile.full_name, p_phone: profile.phone }); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Profile saved.' }); }}>
          <h2>Profile</h2><div className="form-grid two"><div className="field"><label htmlFor="p-n">Full name</label><input id="p-n" className="input" value={profile.full_name} onChange={e => setProfile({ ...profile, full_name: e.target.value })} /></div>
            <div className="field"><label htmlFor="p-p">Mobile</label><input id="p-p" className="input" inputMode="tel" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div></div>
          <div className="field"><label>Email</label><input className="input" value={user.email} disabled /></div><button className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }}>Save</button></form>
        <form className="panel form-grid" onSubmit={async e => { e.preventDefault(); if (pw.length < 8) return setMsg({ t: 'error', m: 'Use at least 8 characters.' }); const { error } = await acct().auth.updateUser({ password: pw }); setPw(''); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Password updated.' }); }}>
          <h2>{sp.get('reset') ? 'Set a new password' : 'Password'}</h2><div className="field"><label htmlFor="p-pw">New password</label><input id="p-pw" type="password" className="input" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" minLength={8} /></div><button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }}>Update password</button></form>
        <button className="btn btn-ghost" style={{ justifySelf: 'start' }} onClick={async () => { await acct().auth.signOut(); window.location.href = '/account'; }}>Sign out</button></>}
    </div>
  </div>;
}

function AccountView() {
  const user = useUser();
  return <div className="wrap section">
    <h1 style={{ fontSize: '2rem', marginBottom: 6 }}>{user ? 'My account' : 'Account'}</h1>
    {user && <p className="muted" style={{ marginBottom: 18 }}>Signed in as {user.email}</p>}
    {user === undefined ? <p>Loading…</p> : user ? <Dashboard user={user} /> : <div className="acct" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))' }}><Auth /><Track /></div>}
  </div>;
}
export default function Page() { return <Suspense><AccountView /></Suspense>; }
