'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { inr } from '@/lib/format';
import { PageHead, Stats, Saved } from '@/components/AdminUI';

type O = { email: string; phone: string; full_name: string; total: number; status: string; created_at: string; marketing_consent: boolean; address: { city: string }; order_items: { product_name: string }[] };
type L = { email: string | null; phone: string | null; name: string | null; consent: boolean; source: string; created_at: string };
type Person = { key: string; name: string; email: string | null; phone: string | null; city: string; orders: number; spend: number; last: string | null; products: Set<string>; consent: boolean; source: string };
type Camp = { id: string; name: string; channel: string; message: string; coupon_code: string | null; audience: number; created_at: string };
const F0 = { who: 'customers', product: '', minSpend: '', inactiveDays: '', city: '', minOrders: '' };
export default function Campaigns() {
  const [orders, setOrders] = useState<O[]>([]); const [leads, setLeads] = useState<L[]>([]); const [hist, setHist] = useState<Camp[]>([]);
  const [f, setF] = useState(F0); const [c, setC] = useState({ name: '', channel: 'whatsapp', message: 'Hi {name}, our {product} is back in fresh stock. Use code {code} for 10% off this week: https://essencekraft-platform.vercel.app/shop', code: '' });
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [sent, setSent] = useState<Set<string>>(new Set());
  const load = useCallback(() => {
    db().from('orders').select('email,phone,full_name,total,status,created_at,marketing_consent,address,order_items(product_name)').limit(5000).then(({ data }) => setOrders((data ?? []) as O[]));
    db().from('leads').select('email,phone,name,consent,source,created_at').limit(5000).then(({ data }) => setLeads((data ?? []) as L[]));
    db().from('campaigns').select('*').order('created_at', { ascending: false }).limit(50).then(({ data }) => setHist((data ?? []) as Camp[]));
  }, []);
  useEffect(() => { load(); }, [load]);
  const people = useMemo(() => {
    const m = new Map<string, Person>();
    orders.forEach(o => { const k = o.email.toLowerCase(); const p = m.get(k) ?? { key: k, name: o.full_name, email: o.email, phone: o.phone, city: o.address?.city ?? '', orders: 0, spend: 0, last: null, products: new Set<string>(), consent: false, source: 'customer' };
      if (o.status !== 'cancelled') { p.orders++; p.spend += Number(o.total); } if (!p.last || o.created_at > p.last) p.last = o.created_at; o.order_items?.forEach(i => p.products.add(i.product_name)); p.consent ||= o.marketing_consent; m.set(k, p); });
    leads.forEach(l => { const k = (l.email ?? l.phone ?? '').toLowerCase(); if (!k) return; const p = m.get(k); if (p) { p.consent ||= l.consent; return; }
      m.set(k, { key: k, name: l.name ?? '', email: l.email, phone: l.phone, city: '', orders: 0, spend: 0, last: null, products: new Set(), consent: l.consent, source: l.source }); });
    return [...m.values()];
  }, [orders, leads]);
  const productNames = useMemo(() => [...new Set(orders.flatMap(o => o.order_items?.map(i => i.product_name) ?? []))].sort(), [orders]);
  const audience = people.filter(p => (f.who === 'all' || (f.who === 'customers' ? p.orders > 0 : p.orders === 0))
    && (!f.product || p.products.has(f.product)) && (!f.minSpend || p.spend >= Number(f.minSpend)) && (!f.minOrders || p.orders >= Number(f.minOrders))
    && (!f.city || p.city.toLowerCase().includes(f.city.toLowerCase())) && (!f.inactiveDays || (p.last && Date.now() - +new Date(p.last) > Number(f.inactiveDays) * 864e5)));
  const reachable = audience.filter(p => p.consent && (c.channel === 'whatsapp' ? p.phone : p.email));
  const render = (p: Person) => c.message.replaceAll('{name}', p.name?.split(' ')[0] || 'there').replaceAll('{product}', f.product.replace(/ (Essential|Carrier) Oil/, '') || 'favourite oil').replaceAll('{code}', c.code || '');
  const save = async () => { setMsg(null); if (!c.name) return setMsg({ t: 'error', m: 'Give the campaign a name.' }); if (!reachable.length) return setMsg({ t: 'error', m: 'No opted-in contacts match this segment.' });
    if (c.code) { const { data } = await db().from('coupons').select('code').eq('code', c.code.toUpperCase()).maybeSingle(); if (!data) return setMsg({ t: 'error', m: `Coupon ${c.code.toUpperCase()} doesn’t exist yet.` }); }
    const { error } = await db().from('campaigns').insert({ name: c.name, channel: c.channel, segment: f, message: c.message, coupon_code: c.code ? c.code.toUpperCase() : null, audience: reachable.length });
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: `Saved “${c.name}” for ${reachable.length} contacts. Send below, or export the list to your WhatsApp/email tool.` }); load(); };
  const I = (k: keyof typeof F0, l: string, ph = '', type = 'text') => <div className="field"><label htmlFor={`s-${k}`}>{l}</label><input id={`s-${k}`} type={type} className="input" placeholder={ph} value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>;
  return <>
    <PageHead title="Segments & broadcasts" sub="Build an audience from orders and signups, write one message, and reach only people who opted in to marketing." />
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>1 · Who</h3><p>Combine any filters.</p></div></div>
        <div className="adm-seg">{[['customers', 'Customers'], ['leads', 'Signups who never ordered'], ['all', 'Everyone']].map(([k, l]) => <button key={k} aria-pressed={f.who === k} onClick={() => setF({ ...f, who: k })}>{l}</button>)}</div>
        <div className="form-grid two">
          <div className="field"><label htmlFor="s-product">Bought product</label><select id="s-product" className="select" value={f.product} onChange={e => setF({ ...f, product: e.target.value })}><option value="">Any</option>{productNames.map(n => <option key={n}>{n}</option>)}</select></div>
          {I('inactiveDays', 'No order in the last (days)', '60', 'number')}{I('minSpend', 'Lifetime spend at least (₹)', '2000', 'number')}{I('minOrders', 'At least N orders', '2', 'number')}{I('city', 'City contains', 'Bengaluru')}
        </div>
        <button className="link" style={{ justifySelf: 'start' }} onClick={() => setF(F0)}>Reset filters</button>
      </section>
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>2 · Message</h3><p>Use {'{name}'}, {'{product}'} and {'{code}'}.</p></div></div>
        <div className="form-grid two"><div className="field"><label htmlFor="c-name">Campaign name</label><input id="c-name" className="input" value={c.name} onChange={e => setC({ ...c, name: e.target.value })} placeholder="Lavender re-order, Oct" /></div>
          <div className="field"><label htmlFor="c-ch">Channel</label><select id="c-ch" className="select" value={c.channel} onChange={e => setC({ ...c, channel: e.target.value })}><option value="whatsapp">WhatsApp</option><option value="email">Email</option></select></div></div>
        <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="textarea" value={c.message} onChange={e => setC({ ...c, message: e.target.value })} /></div>
        <div className="field"><label htmlFor="c-code">Coupon code (optional)</label><input id="c-code" className="input" value={c.code} onChange={e => setC({ ...c, code: e.target.value })} placeholder="COMEBACK10" /></div>
        {reachable[0] && <div className="adm-hero-prev"><span className="hero-eyebrow">PREVIEW FOR {reachable[0].name?.toUpperCase() || 'CONTACT'}</span><p style={{ color: 'var(--ink)' }}>{render(reachable[0])}</p></div>}
      </section>
    </div>
    <Stats items={[['Matching people', audience.length], ['Opted in & reachable', reachable.length, 'amber'], ['Excluded (no consent)', audience.filter(p => !p.consent).length], ['Their lifetime spend', inr(audience.reduce((s, p) => s + p.spend, 0))]]} />
    <section className="adm-card"><div className="adm-card-h"><div><h3>3 · Send</h3><p>{reachable.length} contacts. Each button opens a pre-filled {c.channel === 'whatsapp' ? 'WhatsApp chat' : 'email'}; ticks show who you’ve sent to.</p></div>
      <div style={{ display: 'flex', gap: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => downloadCSV(`${c.name || 'segment'}.csv`, reachable.map(p => ({ name: p.name, email: p.email, phone: p.phone, city: p.city, orders: p.orders, spend: p.spend, message: render(p) })))}>Export</button><button className="btn btn-primary btn-sm" onClick={save}>Save campaign</button></div></div>
      <div className="table-wrap"><table><tbody>{reachable.slice(0, 200).map(p => <tr key={p.key}><td><b>{p.name || '—'}</b><br /><small className="muted">{c.channel === 'whatsapp' ? p.phone : p.email}</small></td><td className="hide-sm">{p.orders} orders · {inr(p.spend)}</td>
        <td style={{ textAlign: 'right' }}>{sent.has(p.key) ? <span className="pill green">sent ✓</span> : <a className="btn btn-ghost btn-sm" target="_blank" rel="noopener" onClick={() => setSent(s => new Set(s).add(p.key))}
          href={c.channel === 'whatsapp' ? `https://wa.me/91${(p.phone ?? '').slice(-10)}?text=${encodeURIComponent(render(p))}` : `mailto:${p.email}?subject=${encodeURIComponent(c.name || 'From EssenceKraft')}&body=${encodeURIComponent(render(p))}`}>Send</a>}</td></tr>)}
        {!reachable.length && <tr><td className="muted">No opted-in contacts match. Loosen the filters or grow your list with the signup popup.</td></tr>}</tbody></table></div>
    </section>
    <section className="adm-card"><div className="adm-card-h"><div><h3>Past campaigns</h3></div></div>
      <div className="table-wrap"><table><tbody>{hist.map(h => <tr key={h.id}><td><b>{h.name}</b><br /><small className="muted">{h.message.slice(0, 90)}…</small></td><td style={{ textTransform: 'capitalize' }}>{h.channel}</td><td>{h.audience} contacts</td><td>{h.coupon_code && <code>{h.coupon_code}</code>}</td><td>{fmtDate(h.created_at)}</td></tr>)}
        {!hist.length && <tr><td className="muted">None yet.</td></tr>}</tbody></table></div></section>
  </>;
}
