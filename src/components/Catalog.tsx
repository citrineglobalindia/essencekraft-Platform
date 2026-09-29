'use client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { CloseIcon } from './Icons';

type Opt = { slug: string; name: string };
const PRICES = [['0-500', 'Under ₹500'], ['500-800', '₹500 – ₹800'], ['800-99999', '₹800 and above']];

export function Catalog({ products, concerns, categories, lockedConcern }: { products: Product[]; concerns: Opt[]; categories: Opt[]; lockedConcern?: string }) {
  const sp = useSearchParams(); const router = useRouter(); const path = usePathname();
  const [drawer, setDrawer] = useState(false);
  const list = (k: string) => (sp.get(k) ?? '').split(',').filter(Boolean);
  const set = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp.toString());
    if (v) n.set(k, v); else n.delete(k);
    router.replace(`${path}${n.size ? `?${n}` : ''}`, { scroll: false });
  };
  const toggle = (k: string, v: string) => { const cur = list(k); set(k, (cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v]).join(',') || null); };

  const q = (sp.get('q') ?? '').toLowerCase().trim();
  const cats = list('category'), cons = list('concern'), price = list('price');
  const inStock = sp.get('stock') === '1', offer = sp.get('offer') === '1', sort = sp.get('sort') ?? 'recommended';

  let items = products.filter(p => {
    const v = p.variants[0]; if (!v) return false;
    if (q && ![p.name, p.tagline, p.botanical_name, p.aroma, ...p.concerns].join(' ').toLowerCase().includes(q)) return false;
    if (cats.length && !cats.includes(p.category)) return false;
    if (cons.length && !cons.some(c => p.concerns.includes(c))) return false;
    if (price.length && !price.some(r => { const [a, b] = r.split('-').map(Number); return v.price >= a && v.price < b; })) return false;
    if (inStock && !p.variants.some(x => x.stock > 0)) return false;
    if (offer && !p.variants.some(x => x.compare_at && x.compare_at > x.price)) return false;
    return true;
  });
  const cmp: Record<string, (a: Product, b: Product) => number> = {
    best: (a, b) => Number(b.is_bestseller) - Number(a.is_bestseller) || b.review_count - a.review_count,
    new: (a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    'price-asc': (a, b) => a.variants[0].price - b.variants[0].price,
    'price-desc': (a, b) => b.variants[0].price - a.variants[0].price,
    rating: (a, b) => b.rating - a.rating,
    recommended: (a, b) => Number(b.is_bestseller) - Number(a.is_bestseller) || b.rating - a.rating,
  };
  items = [...items].sort(cmp[sort] ?? cmp.recommended);
  const active = cats.length + cons.length + price.length + Number(inStock) + Number(offer);

  const Filters = (
    <div className="filters">
      <div><h4>Category</h4>{categories.map(c => <label className="check" key={c.slug}><input type="checkbox" checked={cats.includes(c.slug)} onChange={() => toggle('category', c.slug)} />{c.name}</label>)}</div>
      {!lockedConcern && <div><h4>Concern</h4>{concerns.map(c => <label className="check" key={c.slug}><input type="checkbox" checked={cons.includes(c.slug)} onChange={() => toggle('concern', c.slug)} />{c.name}</label>)}</div>}
      <div><h4>Price</h4>{PRICES.map(([k, l]) => <label className="check" key={k}><input type="checkbox" checked={price.includes(k)} onChange={() => toggle('price', k)} />{l}</label>)}</div>
      <div><h4>Availability</h4>
        <label className="check"><input type="checkbox" checked={inStock} onChange={() => set('stock', inStock ? null : '1')} />In stock only</label>
        <label className="check"><input type="checkbox" checked={offer} onChange={() => set('offer', offer ? null : '1')} />On offer</label></div>
      {active > 0 && <button className="link" style={{ justifySelf: 'start' }} onClick={() => router.replace(path + (q ? `?q=${encodeURIComponent(q)}` : ''), { scroll: false })}>Clear all filters</button>}
    </div>
  );

  return (
    <div className="plp">
      {Filters}
      <div>
        <div className="toolbar">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm filters-mobile" onClick={() => setDrawer(true)}>Filters{active ? ` (${active})` : ''}</button>
            <span className="muted" style={{ fontSize: 14 }} aria-live="polite">{items.length} product{items.length === 1 ? '' : 's'}{q && <> for “{q}”</>}</span>
          </div>
          <label><span className="sr">Sort by</span>
            <select className="select" value={sort} onChange={e => set('sort', e.target.value === 'recommended' ? null : e.target.value)}>
              <option value="recommended">Recommended</option><option value="best">Best selling</option><option value="new">Newest</option>
              <option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Top rated</option>
            </select></label>
        </div>
        {items.length ? <div className="grid g3">{items.map(p => <ProductCard key={p.id} p={p} list="plp" />)}</div> : (
          <div className="empty"><h3>No products match these filters</h3><p className="muted">Remove a filter or search for a botanical such as “lavender” or a concern like “sleep”.</p>
            <button className="btn btn-primary" onClick={() => router.replace(path)}>Show all products</button></div>)}
      </div>
      {drawer && <>
        <div className="scrim" onClick={() => setDrawer(false)} />
        <aside className="drawer right" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="drawer-head"><h3>Filters</h3><button className="icon-btn" aria-label="Close filters" onClick={() => setDrawer(false)}><CloseIcon /></button></div>
          <div className="drawer-body">{Filters}</div>
          <div className="drawer-foot"><button className="btn btn-primary btn-block" onClick={() => setDrawer(false)}>Show {items.length} products</button></div>
        </aside></>}
    </div>
  );
}
