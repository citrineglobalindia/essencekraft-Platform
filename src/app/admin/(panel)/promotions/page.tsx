'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, fmtDate } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type P = { id: string; kind: 'banner' | 'popup'; title: string; body: string | null; cta: string | null; href: string | null; coupon_code: string | null; theme: string | null; starts_at: string; ends_at: string | null; active: boolean };
const blank = { kind: 'banner' as 'banner' | 'popup', title: '', body: '', cta: 'Shop now', href: '/shop?offer=1', coupon_code: '', theme: 'forest', starts_at: '', ends_at: '' };
export default function Promotions() {
  const [rows, setRows] = useState<P[]>([]); const [f, setF] = useState(blank); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = useCallback(() => db().from('promotions').select('*').order('created_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as P[])), []);
  useEffect(() => { load(); }, [load]);
  const live = (p: P) => p.active && +new Date(p.starts_at) <= Date.now() && (!p.ends_at || +new Date(p.ends_at) > Date.now());
  const create = async (e: React.FormEvent) => { e.preventDefault(); setMsg(null);
    if (f.ends_at && f.starts_at && f.ends_at <= f.starts_at) return setMsg({ t: 'error', m: 'End date must be after the start date.' });
    if (f.coupon_code) { const { data } = await db().from('coupons').select('code,active').eq('code', f.coupon_code.toUpperCase()).maybeSingle(); if (!data) return setMsg({ t: 'error', m: `Coupon ${f.coupon_code.toUpperCase()} doesn’t exist — create it in Coupons first.` }); }
    const clash = rows.find(r => r.kind === f.kind && live(r));
    const { error } = await db().from('promotions').insert({ ...f, coupon_code: f.coupon_code ? f.coupon_code.toUpperCase() : null, starts_at: f.starts_at || new Date().toISOString(), ends_at: f.ends_at || null });
    if (error) return setMsg({ t: 'error', m: error.message });
    setMsg({ t: 'ok', m: clash ? `Created. Note: “${clash.title}” is also live — the newest ${f.kind} is shown.` : 'Created and scheduled.' }); setF(blank); load(); };
  const S = (k: keyof typeof blank, l: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => <div className="field"><label htmlFor={`p-${k}`}>{l}</label><input id={`p-${k}`} className="input" value={String(f[k])} onChange={e => setF({ ...f, [k]: e.target.value })} {...props} /></div>;
  return <>
    <PageHead title="Banners & popups" sub="Schedule seasonal offers. The homepage banner and the visitor popup use the newest live entry; outside the dates they switch off by themselves." />
    <Saved msg={msg} />
    <div className="adm-2col">
      <form className="adm-card form-grid" onSubmit={create}><div className="adm-card-h"><div><h3>New promotion</h3></div></div>
        <div className="adm-seg">{(['banner', 'popup'] as const).map(k => <button type="button" key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })} style={{ textTransform: 'capitalize' }}>{k === 'banner' ? 'Homepage banner' : 'Visitor popup'}</button>)}</div>
        {S('title', 'Headline', { required: true, placeholder: 'Diwali Glow Sale — 15% off' })}{S('body', 'Supporting text', { placeholder: 'On all essential oils till 10 Nov' })}
        <div className="form-grid two">{S('coupon_code', 'Coupon code (optional)', { placeholder: 'DIWALI15' })}{f.kind === 'banner' ? S('cta', 'Button text') : <div />}
          {f.kind === 'banner' && S('href', 'Button link')}
          {f.kind === 'banner' && <div className="field"><label htmlFor="p-theme">Colour</label><select id="p-theme" className="select" value={f.theme} onChange={e => setF({ ...f, theme: e.target.value })}><option value="forest">Forest green</option><option value="amber">Festive amber</option><option value="rose">Rose</option></select></div>}
          {S('starts_at', 'Starts', { type: 'datetime-local' })}{S('ends_at', 'Ends', { type: 'datetime-local' })}</div>
        <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Schedule</button>
      </form>
      <section className="adm-card"><div className="adm-card-h"><div><h3>Preview</h3></div></div>
        {f.kind === 'banner' ? <div className={`promo-strip ${f.theme}`} style={{ borderRadius: 12 }}><div className="promo-strip-in" style={{ padding: '14px 16px' }}><div><b>{f.title || 'Headline'}</b>{f.body && <span>{f.body}</span>}</div><div className="promo-strip-r">{f.coupon_code && <code>{f.coupon_code.toUpperCase()}</code>}<span className="btn btn-pill">{f.cta} →</span></div></div></div>
          : <div className="adm-hero-prev"><span className="hero-eyebrow">WELCOME OFFER</span><h2>{f.title || 'Headline'}</h2><p>{f.body}</p>{f.coupon_code && <code>{f.coupon_code.toUpperCase()}</code>}</div>}
        <p className="muted" style={{ fontSize: 13, marginTop: 10 }}>Popups still show only once per visitor and never on cart or checkout.</p>
      </section>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Promotion</th><th>Type</th><th>Window</th><th>Status</th><th></th></tr></thead><tbody>
      {rows.map(p => <tr key={p.id}><td><b>{p.title}</b>{p.coupon_code && <> <code>{p.coupon_code}</code></>}<br /><small className="muted">{p.body}</small></td><td style={{ textTransform: 'capitalize' }}>{p.kind}</td>
        <td style={{ fontSize: 13 }}>{fmtDate(p.starts_at)}<br />{p.ends_at ? `→ ${fmtDate(p.ends_at)}` : 'no end date'}</td>
        <td>{live(p) ? <span className="pill green">live</span> : p.active && +new Date(p.starts_at) > Date.now() ? <span className="pill amber">scheduled</span> : <span className="pill grey">off</span>}</td>
        <td style={{ whiteSpace: 'nowrap' }}><button className="link" onClick={async () => { await db().from('promotions').update({ active: !p.active }).eq('id', p.id); load(); }}>{p.active ? 'Pause' : 'Resume'}</button> · <button className="link" onClick={async () => { if (confirm('Delete this promotion?')) { await db().from('promotions').delete().eq('id', p.id); load(); } }}>Delete</button></td></tr>)}
      {!rows.length && <tr><td colSpan={5} className="muted">No promotions yet — the default WELCOME10 popup is shown.</td></tr>}
    </tbody></table></div>
  </>;
}
