'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { db, fmtDate, statusTone } from '@/lib/admin';
import { inr } from '@/lib/format';

type Item = { id: number; product_name: string; variant_label: string; sku: string; unit_price: number; qty: number };
type O = { id: string; order_no: string; full_name: string; email: string; phone: string; address: Record<string, string>; subtotal: number; discount: number; shipping: number; total: number; coupon_code: string | null;
  status: string; payment_status: string; payment_method: string; payment_ref: string | null; tracking_url: string | null; courier: string | null; awb: string | null; expected_delivery: string | null; invoice_no: string | null; notes: string | null; marketing_consent: boolean; created_at: string;
  first_touch: Record<string, string> | null; last_touch: Record<string, string> | null; order_items: Item[]; order_events?: { id: number; status: string; note: string | null; created_at: string }[] };
const COURIERS: Record<string, (awb: string) => string> = { Delhivery: a => `https://www.delhivery.com/track/package/${a}`, 'Blue Dart': a => `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${a}`, DTDC: a => `https://www.dtdc.in/tracking.asp?strCnno=${a}`, 'India Post': a => `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx?cn=${a}`, Shiprocket: a => `https://shiprocket.co/tracking/${a}`, Xpressbees: a => `https://www.xpressbees.com/shipment/tracking?awbNo=${a}`, Ekart: a => `https://ekartlogistics.com/shipmenttrack/${a}`, Other: () => '' };
const NEXT: Record<string, string[]> = { placed: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['shipped', 'cancelled'], shipped: ['delivered', 'returned'], delivered: ['returned'], cancelled: [], returned: [] };

export default function OrderDetail({ params }: { params: { id: string } }) {
  const [o, setO] = useState<O | null>(null); const [track, setTrack] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [ship, setShip] = useState({ courier: 'Delhivery', awb: '', expected: '' }); const [saved, setSaved] = useState('');
  const load = useCallback(() => db().from('orders').select('*, order_items(*), order_events(*)').eq('id', params.id).single().then(({ data }) => { const d = data as O; setO(d); setTrack(d?.tracking_url ?? ''); setShip({ courier: d?.courier ?? 'Delhivery', awb: d?.awb ?? '', expected: d?.expected_delivery ?? '' }); }), [params.id]);
  const saveShip = async () => { if (!o) return; const url = ship.awb ? (COURIERS[ship.courier]?.(ship.awb) || track) : track;
    const { error } = await db().from('orders').update({ courier: ship.courier, awb: ship.awb || null, expected_delivery: ship.expected || null, tracking_url: url || null }).eq('id', o.id);
    if (error) setErr(error.message); else { setSaved('Shipment details saved — the customer’s tracking page updates now.'); load(); } };
  useEffect(() => { load(); }, [load]);
  if (!o) return <p>Loading…</p>;

  const move = async (to: string) => {
    if ((to === 'cancelled' || to === 'returned') && !confirm(`Mark ${o.order_no} as ${to}? Items will be returned to stock.`)) return;
    setBusy(true); setErr('');
    const { error } = await db().rpc('set_order_status', { p_order: o.id, p_status: to, p_tracking: track || null });
    setBusy(false); if (error) setErr(error.message); else load();
  };
  const markPaid = async () => { await db().from('orders').update({ payment_status: 'paid' }).eq('id', o.id); load(); };
  const touch = (t: Record<string, string> | null) => t ? Object.entries(t).filter(([k]) => k !== 'at').map(([k, v]) => `${k}: ${v}`).join(' · ') || '—' : '—';

  return <>
    <div className="admin-bar">
      <div><Link className="link" href="/admin/orders">← Orders</Link><h1 style={{ fontSize: '1.5rem', marginTop: 6 }}>{o.order_no} <span className={`pill ${statusTone[o.status]}`}>{o.status}</span> <span className={`pill ${statusTone[o.payment_status]}`}>{o.payment_status}</span></h1><small className="muted">{fmtDate(o.created_at)}</small></div>
      <Link className="btn btn-ghost btn-sm" href={`/admin/invoice/${o.id}`} target="_blank">{o.invoice_no ? `Invoice ${o.invoice_no}` : 'Order summary'} ↗</Link>
    </div>
    {err && <p className="notice error" role="alert">{err}</p>}
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', alignItems: 'start' }}>
      <section className="panel"><h2>Items</h2>
        <div className="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Amount</th></tr></thead><tbody>
          {o.order_items.map(i => <tr key={i.id}><td>{i.product_name}<br /><small className="muted">{i.variant_label} · {i.sku}</small></td><td>{i.qty}</td><td>{inr(i.unit_price * i.qty)}</td></tr>)}
        </tbody></table></div>
        <div className="totals" style={{ marginTop: 12 }}>
          <div><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
          {Number(o.discount) > 0 && <div><span>Discount {o.coupon_code && `(${o.coupon_code})`}</span><span>−{inr(o.discount)}</span></div>}
          <div><span>Shipping</span><span>{inr(o.shipping)}</span></div><div className="grand"><span>Total</span><span>{inr(o.total)}</span></div>
        </div></section>
      <section className="panel form-grid"><h2>Fulfilment</h2>
        <div className="form-grid two">
          <div className="field"><label htmlFor="cour">Courier</label><select id="cour" className="select" value={ship.courier} onChange={e => setShip({ ...ship, courier: e.target.value })}>{Object.keys(COURIERS).map(c => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label htmlFor="awb">AWB / tracking no.</label><input id="awb" className="input" value={ship.awb} onChange={e => setShip({ ...ship, awb: e.target.value.trim() })} /></div>
          <div className="field"><label htmlFor="eta">Expected delivery</label><input id="eta" type="date" className="input" value={ship.expected} onChange={e => setShip({ ...ship, expected: e.target.value })} /></div>
          <div className="field"><label htmlFor="trk">Tracking link {ship.courier !== 'Other' && <small className="muted">(auto from AWB)</small>}</label><input id="trk" className="input" value={ship.awb && ship.courier !== 'Other' ? COURIERS[ship.courier](ship.awb) : track} onChange={e => setTrack(e.target.value)} readOnly={!!ship.awb && ship.courier !== 'Other'} placeholder="https://…" /></div>
        </div>
        <button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={saveShip}>Save shipment details</button>{saved && <p className="notice ok">{saved}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {NEXT[o.status].map(s => <button key={s} className={`btn btn-sm ${s === 'cancelled' || s === 'returned' ? 'btn-ghost' : 'btn-primary'}`} disabled={busy} onClick={() => move(s)} style={{ textTransform: 'capitalize' }}>Mark {s}</button>)}
          {o.payment_method === 'cod' && o.payment_status !== 'paid' && o.status === 'delivered' && <button className="btn btn-ghost btn-sm" onClick={markPaid}>Mark COD collected</button>}
        </div>
        <p className="muted" style={{ fontSize: 13 }}>Cancelling or returning puts the items back into stock automatically and is logged. The GST invoice number is issued when the order is confirmed.</p>
        {!!o.order_events?.length && <><h3 style={{ fontSize: 14, fontFamily: 'var(--font-body)', marginTop: 6 }}>Timeline</h3><ol className="timeline">{[...o.order_events].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(e => <li key={e.id}><i>✓</i><div><b>{e.status}</b><small>{fmtDate(e.created_at)}{e.note ? ` · ${e.note}` : ''}</small></div></li>)}</ol></>}
      </section>
      <section className="panel"><h2>Customer</h2><p><b>{o.full_name}</b><br />{o.email}<br />{o.phone}<br /><span className="muted">Marketing consent: {o.marketing_consent ? 'yes' : 'no'}</span></p>
        <p style={{ marginTop: 10 }}>{o.address.line1}{o.address.line2 && `, ${o.address.line2}`}{o.address.landmark && ` (near ${o.address.landmark})`}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p></section>
      <section className="panel"><h2>Payment &amp; attribution</h2>
        <p style={{ fontSize: 14 }}>Method: {o.payment_method === 'cod' ? 'Cash on delivery' : 'Razorpay'}<br />Gateway ref: {o.payment_ref ?? '—'}{o.notes && <><br />{o.notes}</>}</p>
        <p style={{ fontSize: 13.5, marginTop: 10 }}><b>First touch</b><br /><span className="muted">{touch(o.first_touch)}</span></p>
        <p style={{ fontSize: 13.5, marginTop: 8 }}><b>Last touch</b><br /><span className="muted">{touch(o.last_touch)}</span></p></section>
    </div>
  </>;
}
