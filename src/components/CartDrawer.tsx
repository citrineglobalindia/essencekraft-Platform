'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { inr } from '@/lib/format';
import { Bottle } from './Bottle';
import { CloseIcon } from './Icons';

export function QtyControl({ qty, onChange, label }: { qty: number; onChange: (n: number) => void; label: string }) {
  return (
    <div className="qty" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" aria-label="Decrease" onClick={() => onChange(qty - 1)}>−</button>
      <span aria-live="polite">{qty}</span>
      <button type="button" aria-label="Increase" onClick={() => onChange(qty + 1)}>+</button>
    </div>
  );
}

export function CartDrawer({ freeShip }: { freeShip: number }) {
  const { open, setOpen, lines, subtotal, setQty } = useCart();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, setOpen]);
  if (!open) return null;
  const left = Math.max(0, freeShip - subtotal);
  return <>
    <div className="scrim" onClick={() => setOpen(false)} />
    <aside className="drawer right" role="dialog" aria-modal="true" aria-label="Your cart">
      <div className="drawer-head"><h3>Your cart</h3><button className="icon-btn" aria-label="Close cart" onClick={() => setOpen(false)}><CloseIcon /></button></div>
      <div className="drawer-body">
        {lines.length === 0 ? (
          <div className="empty"><p>Your cart is empty.</p><Link className="btn btn-primary" href="/shop" onClick={() => setOpen(false)}>Shop essential oils</Link></div>
        ) : <>
          <div style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
            <p style={{ fontSize: 13.5 }}>{left > 0 ? <>Add <b>{inr(left)}</b> more for free shipping</> : <b>You’ve unlocked free shipping</b>}</p>
            <div className="progress"><i style={{ width: `${Math.min(100, (subtotal / freeShip) * 100)}%` }} /></div>
          </div>
          {lines.map(l => (
            <div className="cart-line" key={l.variant_id}>
              <div className="thumb"><Bottle color={l.color} /></div>
              <div><Link href={`/product/${l.product_slug}`} onClick={() => setOpen(false)}><b>{l.name}</b></Link><div className="muted" style={{ fontSize: 13 }}>{l.label} · {inr(l.price)}</div>
                <div style={{ marginTop: 6 }}><QtyControl qty={l.qty} label={l.name} onChange={n => setQty(l.variant_id, n)} /></div></div>
              <b>{inr(l.price * l.qty)}</b>
            </div>))}
        </>}
      </div>
      {lines.length > 0 && <div className="drawer-foot">
        <div className="totals"><div><span>Subtotal</span><b>{inr(subtotal)}</b></div><div className="muted"><span>Shipping and discounts at checkout</span></div></div>
        <Link className="btn btn-primary btn-block" href="/checkout" onClick={() => setOpen(false)}>Checkout</Link>
        <Link className="btn btn-ghost btn-block" href="/cart" onClick={() => setOpen(false)}>View cart</Link>
      </div>}
    </aside>
  </>;
}
