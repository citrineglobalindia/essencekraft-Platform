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
  full_name: string; email: string; address: Record<string, string>; items: Item[]; created_at: string; tracking_url?: string };
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
        {o.status !== 'cancelled' && <section className="panel"><h2>Status</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
            {STEPS.map((s, i) => <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'center', opacity: i <= step ? 1 : .45 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: i <= step ? 'var(--leaf)' : 'var(--line)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12 }}>{i <= step ? '✓' : ''}</span>
              <span style={{ textTransform: 'capitalize' }}>{s}</span></li>)}
          </ol>
          {o.tracking_url && <a className="btn btn-ghost" style={{ marginTop: 12 }} href={o.tracking_url} target="_blank" rel="noopener">Track shipment</a>}
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
