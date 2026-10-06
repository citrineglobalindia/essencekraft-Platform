'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { hasSupabase, browserClient } from '@/lib/supabase';
import type { CartLine } from '@/lib/types';
import { inr } from '@/lib/format';
import { Bottle } from '@/components/Bottle';
import { QtyControl } from '@/components/CartDrawer';

// Recovery links (/cart?restore=<token>) rebuild a saved cart.
function Restore() {
  const sp = useSearchParams(); const { lines, add, setOpen } = useCart(); const [done, setDone] = useState(false);
  useEffect(() => {
    const t = sp.get('restore'); if (!t || done || !hasSupabase) return; setDone(true);
    browserClient().rpc('get_cart', { p_token: t }).then(({ data }) => {
      const saved = (data ?? []) as CartLine[];
      saved.filter(s => !lines.some(l => l.variant_id === s.variant_id)).forEach(s => add({ variant_id: s.variant_id, product_slug: s.product_slug, name: s.name, label: s.label, price: s.price, color: s.color }, s.qty));
      setOpen(false); try { localStorage.setItem('ek_cart_token', t); } catch {}
    });
  }, [sp, done, lines, add, setOpen]);
  return null;
}
export default function CartPage() { return <><Suspense><Restore /></Suspense><CartView /></>; }
function CartView() {
  const { lines, subtotal, setQty, remove } = useCart();
  if (!lines.length) return <div className="wrap empty" style={{ minHeight: '50vh' }}><h1 style={{ fontSize: '2rem' }}>Your cart is empty</h1><p className="muted">Start with our best sellers.</p><Link className="btn btn-primary" href="/shop?sort=best">Shop best sellers</Link></div>;
  return (
    <div className="wrap checkout">
      <div className="panel"><h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Your cart</h1>
        {lines.map(l => (
          <div className="cart-line" key={l.variant_id}>
            <div className="thumb"><Bottle color={l.color} /></div>
            <div><Link href={`/product/${l.product_slug}`}><b>{l.name}</b></Link><div className="muted" style={{ fontSize: 13 }}>{l.label} · {inr(l.price)} each</div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}><QtyControl qty={l.qty} label={l.name} onChange={n => setQty(l.variant_id, n)} /><button className="link" onClick={() => remove(l.variant_id)}>Remove</button></div></div>
            <b>{inr(l.qty * l.price)}</b>
          </div>))}
      </div>
      <aside className="panel" style={{ alignSelf: 'start' }}>
        <h2>Summary</h2>
        <div className="totals"><div><span>Subtotal</span><span>{inr(subtotal)}</span></div><div className="muted"><span>Shipping, COD fee and coupons are calculated at checkout.</span></div>
          <div className="grand"><span>Estimated total</span><span>{inr(subtotal)}</span></div></div>
        <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 14 }}>Checkout</Link>
      </aside>
    </div>
  );
}
