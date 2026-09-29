'use client';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CartLine } from './types';
import { track } from './attribution';

type Ctx = {
  lines: CartLine[]; count: number; subtotal: number; open: boolean;
  setOpen: (o: boolean) => void; add: (l: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void; remove: (variantId: string) => void; clear: () => void;
  wishlist: string[]; toggleWish: (slug: string) => void;
};
const CartCtx = createContext<Ctx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setLines(JSON.parse(localStorage.getItem('ek_cart') || '[]'));
      setWishlist(JSON.parse(localStorage.getItem('ek_wish') || '[]'));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => { if (ready) try { localStorage.setItem('ek_cart', JSON.stringify(lines)); } catch {} }, [lines, ready]);
  useEffect(() => { if (ready) try { localStorage.setItem('ek_wish', JSON.stringify(wishlist)); } catch {} }, [wishlist, ready]);

  const value = useMemo<Ctx>(() => ({
    lines, open, setOpen, wishlist,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.qty * l.price, 0),
    add: (l, qty = 1) => {
      setLines(cur => {
        const ex = cur.find(c => c.variant_id === l.variant_id);
        return ex ? cur.map(c => c.variant_id === l.variant_id ? { ...c, qty: Math.min(c.qty + qty, 20) } : c) : [...cur, { ...l, qty }];
      });
      track('add_to_cart', { currency: 'INR', value: l.price * qty, items: [{ item_id: l.variant_id, item_name: l.name, item_variant: l.label, price: l.price, quantity: qty }] });
      setOpen(true);
    },
    setQty: (id, qty) => setLines(cur => qty <= 0 ? cur.filter(c => c.variant_id !== id) : cur.map(c => c.variant_id === id ? { ...c, qty: Math.min(qty, 20) } : c)),
    remove: id => setLines(cur => cur.filter(c => c.variant_id !== id)),
    clear: () => setLines([]),
    toggleWish: slug => setWishlist(w => w.includes(slug) ? w.filter(s => s !== slug) : [...w, slug]),
  }), [lines, open, wishlist]);

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}
export function useCart() {
  const c = useContext(CartCtx);
  if (!c) throw new Error('useCart must be inside CartProvider');
  return c;
}
