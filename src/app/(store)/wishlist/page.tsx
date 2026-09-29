'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';
import type { Product } from '@/lib/types';
import { ProductCard } from '@/components/ProductCard';

export default function Wishlist() {
  const { wishlist } = useCart();
  const [all, setAll] = useState<Product[] | null>(null);
  useEffect(() => { fetch('/api/catalog').then(r => r.json()).then(setAll); }, []);
  const items = (all ?? []).filter(p => wishlist.includes(p.slug));
  return (
    <div className="wrap section">
      <h1 style={{ fontSize: '2rem', marginBottom: 18 }}>Wishlist</h1>
      {all === null ? <p>Loading…</p> : items.length ? <div className="grid">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>
        : <div className="empty"><p className="muted">Tap the heart on any product to save it here.</p><Link href="/shop" className="btn btn-primary">Browse products</Link></div>}
    </div>
  );
}
