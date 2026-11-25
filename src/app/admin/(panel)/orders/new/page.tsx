'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/admin';
import { inr } from '@/lib/format';
import { PageHead } from '@/components/AdminUI';
import { PaymentLinkShare } from '@/components/PaymentLinkShare';

type V = { id: string; label: string; price: number; stock: number; allow_backorder: boolean; sku: string; product: { name: string; status: string; combo: unknown } | null };
type Line = { key: number; variant_id: string; name: string; label: string; qty: number; price: string };
const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
let k = 0;

export default function NewPaymentLink() {
  const [vars, setVars] = useState<V[]>([]);
  const [c, setC] = useState({ full_name: '', phone: '', email: '', line1: '', line2: '', city: '', state: 'Karnataka', pincode: '' });
  const [lines, setLines] = useState<Line[]>([]); const [pick, setPick] = useState('');
  const [discount, setDiscount] = useState(''); const [shipping, setShipping] = useState(''); const [notes, setNotes] = useState(''); const [days, setDays] = useState('7');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; order_no: string; token: string; total: number; expires_at: string | null } | null>(null);

  useEffect(() => {
    db().from('variants').select('id,label,price,stock,allow_backorder,sku,product:products(name,status,combo)').then(({ data }) => {
      const list = ((data ?? []) as unknown as V[]).filter(v => v.product && !v.product.combo && v.product.status !== 'archived')
        .sort((a, b) => a.product!.name.localeCompare(b.product!.name) || a.price - b.price);
      setVars(list);
    });
  }, []);
  const byId = useMemo(() => new Map(vars.map(v => [v.id, v])), [vars]);
  const addProduct = (id: string) => {
    const v = byId.get(id); if (!v) return; setPick('');
    const same = lines.find(l => l.variant_id === id);
    if (same) return setLines(lines.map(l => l === same ? { ...l, qty: l.qty + 1 } : l));
    setLines([...lines, { key: ++k, variant_id: id, name: v.product!.name, label: v.label, qty: 1, price: String(v.price) }]);
  };
  const addCustom = () => setLines([...lines, { key: ++k, variant_id: '', name: '', label: '', qty: 1, price: '' }]);
  const upd = (key: number, p: Partial<Line>) => setLines(lines.map(l => l.key === key ? { ...l, ...p } : l));
  const sub = lines.reduce((s, l) => s + (Number(l.price) || 0) * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), sub); const ship = Math.max(Number(shipping) || 0, 0);
  const total = sub - disc + ship;

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!lines.length) return setErr('Add at least one product or custom item.');
    if (!/^\d{6}$/.test(c.pincode)) return setErr('Enter a 6-digit pincode.');
    if (c.phone.replace(/\D/g, '').length < 10) return setErr('Enter a 10-digit phone number.');
    for (const l of lines) {
      if (!l.variant_id && !l.name.trim()) return setErr('Give every custom item a name.');
      if (l.price === '' || Number(l.price) < 0) return setErr(`Enter a price for ${l.name || 'every item'}.`);
      const v = byId.get(l.variant_id); if (v && !v.allow_backorder && v.stock < l.qty) return setErr(`Only ${v.stock} in stock for ${l.name} (${l.label}).`);
    }
    if (total < 1) return setErr('The total must be at least ₹1.');
    setBusy(true);
    const { data, error } = await db().rpc('admin_create_order', { payload: {
      full_name: c.full_name, phone: c.phone.replace(/\D/g, '').slice(-10), email: c.email,
      address: { line1: c.line1, line2: c.line2, city: c.city, state: c.state, pincode: c.pincode },
      items: lines.map(l => l.variant_id ? { variant_id: l.variant_id, qty: l.qty, unit_price: Number(l.price) } : { name: l.name, label: l.label, qty: l.qty, unit_price: Number(l.price) }),
      discount: disc, shipping: ship, notes, expires_days: Number(days) } });
    setBusy(false);
    if (error) return setErr(/admin_create_order/.test(error.message) ? 'Payment links need a quick database update (migration 0013).' : error.message);
    setDone(data as typeof done);
  };

  if (done) return <>
    <PageHead title="Payment link ready" sub={`Order ${done.order_no} · ${inr(done.total)} · waiting for payment`} />
    <section className="panel" style={{ maxWidth: 720 }}>
      <p style={{ marginTop: 0 }}>Share this link with <b>{c.full_name}</b>. When they pay, the order is marked <b>paid</b> automatically, the confirmation email and invoice go out, and it’s sent to Shiprocket like any website order.</p>
      <PaymentLinkShare id={done.id} orderNo={done.order_no} token={done.token} total={done.total} phone={c.phone} name={c.full_name} expires={done.expires_at} />
      <div style={{ display: 'flex', gap: 8, marginTop: 18, flexWrap: 'wrap' }}>
        <Link className="btn btn-ghost btn-sm" href={`/admin/orders/${done.id}`}>View order</Link>
        <button className="btn btn-ghost btn-sm" onClick={() => { setDone(null); setLines([]); setC({ ...c, full_name: '', phone: '', email: '', line1: '', line2: '', city: '', pincode: '' }); setDiscount(''); setShipping(''); setNotes(''); }}>Create another</button>
      </div>
    </section>
  </>;

  const f = (id: keyof typeof c, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) =>
    <div className="field"><label htmlFor={`pl-${id}`}>{label}</label><input id={`pl-${id}`} className="input" value={c[id]} onChange={e => setC({ ...c, [id]: e.target.value })} {...props} /></div>;

  return <>
    <PageHead title="Create payment link" sub="Make an order for a customer (phone, WhatsApp or Instagram orders) and send them a link to pay online with Razorpay." />
    <p><Link className="link" href="/admin/orders">← Orders</Link></p>
    <form onSubmit={create} style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <section className="panel form-grid"><h2>Customer</h2>
          <div className="form-grid two">
            {f('full_name', 'Full name', { required: true, autoComplete: 'off' })}
            {f('phone', 'Phone', { required: true, inputMode: 'tel', placeholder: '10-digit mobile' })}
            <div className="span2">{f('email', 'Email (payment confirmation & invoice go here)', { required: true, type: 'email' })}</div>
            <div className="span2">{f('line1', 'Address line 1', { required: true })}</div>
            <div className="span2">{f('line2', 'Address line 2 (optional)')}</div>
            {f('city', 'City', { required: true })}
            {f('pincode', 'Pincode', { required: true, inputMode: 'numeric', maxLength: 6 })}
            <div className="field span2"><label htmlFor="pl-state">State</label><select id="pl-state" className="select" value={c.state} onChange={e => setC({ ...c, state: e.target.value })}>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
        </section>
        <section className="panel form-grid"><h2>Link settings</h2>
          <div className="form-grid two">
            <div className="field"><label htmlFor="pl-days">Link valid for</label><select id="pl-days" className="select" value={days} onChange={e => setDays(e.target.value)}><option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="15">15 days</option><option value="30">30 days</option><option value="0">No expiry</option></select></div>
            <div className="field span2"><label htmlFor="pl-notes">Internal note (optional)</label><input id="pl-notes" className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Instagram DM order, gift wrap" /></div>
          </div>
        </section>
      </div>
      <section className="panel form-grid" style={{ alignSelf: 'start' }}><h2>Items</h2>
        <div className="field"><label htmlFor="pl-add">Add a product</label>
          <select id="pl-add" className="select" value={pick} onChange={e => addProduct(e.target.value)}>
            <option value="">Choose a product…</option>
            {vars.map(v => <option key={v.id} value={v.id} disabled={!v.allow_backorder && v.stock < 1}>{v.product!.name} · {v.label} · {inr(v.price)}{v.product!.status === 'draft' ? ' · draft' : ''}{!v.allow_backorder && v.stock < 1 ? ' · out of stock' : ` · ${v.stock} in stock`}</option>)}
          </select></div>
        <button type="button" className="link" style={{ justifySelf: 'start' }} onClick={addCustom}>+ Add a custom item (not in the catalogue)</button>
        {lines.length > 0 && <div className="pl-lines">{lines.map(l => <div key={l.key} className="pl-line">
          {l.variant_id ? <div className="pl-name"><b>{l.name}</b><small className="muted">{l.label}</small></div>
            : <div className="pl-name"><input className="input" placeholder="Item name" aria-label="Custom item name" value={l.name} onChange={e => upd(l.key, { name: e.target.value })} /><input className="input" placeholder="Size / note (optional)" aria-label="Custom item size" value={l.label} onChange={e => upd(l.key, { label: e.target.value })} /></div>}
          <div className="field"><label htmlFor={`q${l.key}`}>Qty</label><input id={`q${l.key}`} className="input" type="number" min={1} value={l.qty} onChange={e => upd(l.key, { qty: Math.max(1, Number(e.target.value) || 1) })} /></div>
          <div className="field"><label htmlFor={`p${l.key}`}>Price ₹ each</label><input id={`p${l.key}`} className="input" type="number" min={0} step="0.01" value={l.price} onChange={e => upd(l.key, { price: e.target.value })} /></div>
          <button type="button" className="link link-danger" onClick={() => setLines(lines.filter(x => x.key !== l.key))} aria-label={`Remove ${l.name || 'item'}`}>Remove</button>
        </div>)}</div>}
        <div className="form-grid two">
          <div className="field"><label htmlFor="pl-disc">Discount ₹</label><input id="pl-disc" className="input" type="number" min={0} value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" /></div>
          <div className="field"><label htmlFor="pl-ship">Shipping ₹</label><input id="pl-ship" className="input" type="number" min={0} value={shipping} onChange={e => setShipping(e.target.value)} placeholder="0 = free" /></div>
        </div>
        <table className="pl-total"><tbody>
          <tr><td>Subtotal</td><td>{inr(sub)}</td></tr>
          {disc > 0 && <tr><td>Discount</td><td>−{inr(disc)}</td></tr>}
          <tr><td>Shipping</td><td>{ship ? inr(ship) : 'Free'}</td></tr>
          <tr><th>Customer pays</th><th>{inr(total)}</th></tr>
        </tbody></table>
        {err && <p className="notice error" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : `Create order & payment link · ${inr(total)}`}</button>
        <small className="muted">Stock for catalogue items is reserved now. If the customer doesn’t pay, cancel the order to put it back.</small>
      </section>
    </form>
  </>;
}
