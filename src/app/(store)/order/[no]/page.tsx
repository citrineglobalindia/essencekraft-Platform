'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { inr } from '@/lib/format';
import { payOrder } from '@/lib/pay';
import { track } from '@/lib/attribution';

type Item = { product_name?: string; name?: string; variant_label?: string; label?: string; qty: number; unit_price?: number; price?: number };
type Order = { order_no: string; status: string; payment_status: string; payment_method: string; total: number; subtotal: number; discount: number; shipping: number;
  full_name: string; email: string; address: Record<string, string>; items: Item[]; created_at: string; tracking_url?: string; referral_code?: string | null;
  courier?: string | null; awb?: string | null; expected_delivery?: string | null; invoice_no?: string | null; events?: { status: string; note: string | null; at: string }[] };
const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

export default function OrderPage({ params }: { params: { no: string } }) {
  const sp = useSearchParams(); const token = sp.get('t') ?? '';
  const [o, setO] = useState<Order | null | undefined>(undefined);
  const [paying, setPaying] = useState(false);
  const load = useCallback(async () => {
    if (!hasSupabase) { const d = JSON.parse(localStorage.getItem('ek_demo_orders') || '{}'); setO(d[params.no] ?? null); return; }
    const { data } = await browserClient().rpc('get_order', { p_no: params.no, p_token: token });
    setO(data ?? null);
  }, [params.no, token]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!o) return;
    const done = o.payment_status === 'paid' || o.payment_method === 'cod';
    const key = `ek_purchase_${o.order_no}`;
    if (done && !sessionStorage.getItem(key)) {  // fire GA4 purchase once (MKT-002)
      sessionStorage.setItem(key, '1');
      track('purchase', { transaction_id: o.order_no, currency: 'INR', value: Number(o.total), shipping: Number(o.shipping),
        items: o.items.map(i => ({ item_name: i.product_name ?? i.name, item_variant: i.variant_label ?? i.label, quantity: i.qty, price: Number(i.unit_price ?? i.price) })) });
    }
  }, [o]);

  if (o === undefined) return <div className="wrap section"><p>Loading your order…</p></div>;
  if (o === null) return <div className="wrap empty" style={{ minHeight: '50vh' }}><h1 style={{ fontSize: '2rem' }}>Order not found</h1><p className="muted">Check the link in your confirmation email, or look it up with your order number.</p><Link href="/account" className="btn btn-primary">Track an order</Link></div>;

  const unpaid = o.payment_method === 'razorpay' && o.payment_status !== 'paid' && o.status !== 'cancelled';
  const step = STEPS.indexOf(o.status);
  return (
    <div className="wrap checkout">
      <div>
        <section className="panel">
          {unpaid ? <>
            <h1 style={{ fontSize: '1.8rem' }}>Payment not completed</h1>
            <p style={{ margin: '8px 0 14px' }}>Order <b>{o.order_no}</b> is saved and your items are held for 45 minutes. You won’t be charged twice.</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={paying} onClick={async () => { setPaying(true); await payOrder(o.order_no, token).catch(() => false); await load(); setPaying(false); }}>{paying ? 'Opening payment…' : `Retry payment · ${inr(o.total)}`}</button>
              <a className="btn btn-ghost" href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Help with order ${o.order_no}`)}`} data-track="whatsapp_click">Get help on WhatsApp</a>
            </div>
          </> : <>
            <h1 style={{ fontSize: '1.8rem' }}>{o.status === 'cancelled' ? 'Order cancelled' : 'Thank you, your order is placed'}</h1>
            <p style={{ marginTop: 8 }}>Order <b>{o.order_no}</b> · confirmation sent to {o.email}</p>
          </>}
        </section>
        <section className="panel"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}><h2>Tracking</h2>
            {o.expected_delivery && o.status !== 'delivered' && o.status !== 'cancelled' && <span className="pill green">Expected by {new Date(o.expected_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}</div>
          {(() => { const ev = o.events ?? []; const when = (s: string) => ev.find(e => e.status === s);
            const steps = o.status === 'cancelled' || o.status === 'returned' ? ev.map(e => e.status).filter((s, i, a) => a.indexOf(s) === i && s !== 'tracking' && s !== 'paid') : STEPS;
            return <ol className="timeline">{steps.map((s, i) => { const e = when(s); const done = !!e || i <= step;
              return <li key={s} className={done ? '' : 'todo'}><i>{done ? '✓' : ''}</i><div><b>{s}</b>{e && <small>{new Date(e.at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{e.note ? ` · ${e.note}` : ''}</small>}</div></li>; })}</ol>; })()}
          {(o.courier || o.awb) && <p style={{ fontSize: 14 }}>{o.courier}{o.awb && <> · AWB <b>{o.awb}</b></>}</p>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {o.tracking_url && <a className="btn btn-primary btn-sm" href={o.tracking_url} target="_blank" rel="noopener">Track shipment ↗</a>}
            {hasSupabase && <Link className="btn btn-ghost btn-sm" href={`/order/${o.order_no}/invoice?t=${token}`}>{o.invoice_no ? `Download invoice ${o.invoice_no}` : 'Order summary'}</Link>}
          </div>
        </section>
        {o.referral_code && o.status !== 'cancelled' && <section className="panel referral">
          <h2>Share EssenceKraft, earn points</h2>
          <p>Friends get a discount with your code, and you earn bonus points when their order is delivered.</p>
          <div className="referral-row"><code>{o.referral_code}</code>
            <a className="btn btn-primary btn-sm" href={`https://wa.me/?text=${encodeURIComponent(`I use EssenceKraft's pure essential oils. Use my code ${o.referral_code} for a discount on your first order: https://essencekraft-platform.vercel.app/shop`)}`} target="_blank" rel="noopener" data-track="referral_share">Share on WhatsApp</a></div>
        </section>}
        <section className="panel"><h2>Delivering to</h2><p>{o.full_name}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}</p></section>
      </div>
      <aside className="panel" style={{ alignSelf: 'start' }}><h2>Summary</h2>
        {o.items.map((i, k) => <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '6px 0' }}><span>{i.product_name ?? i.name} <span className="muted">· {i.variant_label ?? i.label} × {i.qty}</span></span><b>{inr(Number(i.unit_price ?? i.price) * i.qty)}</b></div>)}
        <div className="totals" style={{ marginTop: 10 }}>
          <div><span>Subtotal</span><span>{inr(o.subtotal)}</span></div>
          {Number(o.discount) > 0 && <div><span>Discount</span><span>−{inr(o.discount)}</span></div>}
          <div><span>Shipping</span><span>{Number(o.shipping) ? inr(o.shipping) : 'Free'}</span></div>
          <div className="grand"><span>{o.payment_status === 'paid' ? 'Paid' : o.payment_method === 'cod' ? 'Pay on delivery' : 'Amount due'}</span><span>{inr(o.total)}</span></div>
        </div>
        <Link href="/shop" className="btn btn-ghost btn-block" style={{ marginTop: 14 }}>Continue shopping</Link>
      </aside>
    </div>
  );
}
