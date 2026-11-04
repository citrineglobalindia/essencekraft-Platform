'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { inr, pctOff } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { track } from '@/lib/attribution';
import { Bottle } from './Bottle';
import { Stars } from './Stars';
import { CartIcon } from './Icons';
import { QtyControl } from './CartDrawer';

export type ComboOption = { variant_id: string; slug: string; name: string; label: string; image?: string; color: string; available: boolean };
type Props = { p: Product; options: ComboOption[]; includes: (ComboOption & { qty: number; worth: number })[] };

// “Pick any N” combo: one row of choices per slot, a live “Your box” summary, then add to cart with the picks.
export function ComboBuy({ p, options, includes }: Props) {
  const { add, setOpen } = useCart(); const router = useRouter();
  const combo = p.combo!; const N = Math.max(1, combo.pick); const repeat = combo.allow_repeat !== false;
  const v = p.variants[0];
  const [picks, setPicks] = useState<(string | null)[]>(() => Array(N).fill(null));
  const [qty, setQty] = useState(1); const [added, setAdded] = useState(false);
  const byId = useMemo(() => new Map(options.map(o => [o.variant_id, o])), [options]);
  const done = picks.every(Boolean); const next = picks.findIndex(x => !x);
  const out = !v || (v.stock <= 0 && !v.allow_backorder);
  const off = v ? pctOff(v.price, v.compare_at) : 0;
  const worth = includes.reduce((s, i) => s + i.worth * i.qty, 0);
  useEffect(() => { if (v) track('view_item', { currency: 'INR', value: v.price, items: [{ item_id: v.id, item_name: p.name, item_variant: 'combo', price: v.price }] }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [p.slug]);

  const choose = (slot: number, id: string) => { setAdded(false); setPicks(ps => ps.map((x, i) => (i === slot ? (x === id ? null : id) : x))); };
  const addCombo = () => {
    if (!done || !v) return;
    const ids = picks as string[]; const names = ids.map(id => byId.get(id)?.name ?? '');
    add({ variant_id: v.id, product_slug: p.slug, name: p.name, label: `${N} picks${includes.length ? ' + free gift' : ''}`, price: v.price, color: p.color,
      selections: ids, picks: [...names, ...includes.map(i => `${i.name} (free)`)], key: `${v.id}:${ids.join(',')}` }, qty);
    setAdded(true);
  };

  return (
    <div className="pdp-info combo-buy">
      <div><span className="combo-tag">COMBO · PICK ANY {N}</span>
        <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)' }}>{p.name}</h1></div>
      <Stars rating={p.rating} count={p.review_count} />
      {p.tagline && <p>{p.tagline}</p>}
      {v && <div className="price-row" style={{ paddingTop: 0 }}>
        <span className="price" style={{ fontSize: 26 }}>{inr(v.price)}</span>
        {off > 0 && <><span className="cmp" style={{ fontSize: 16 }}>MRP {inr(v.compare_at!)}</span><span className="off">SAVE {inr(v.compare_at! - v.price)}</span></>}
        <span className="muted" style={{ fontSize: 12, width: '100%' }}>Inclusive of all taxes</span>
      </div>}
      {includes.length > 0 && <div className="combo-free">🎁 Includes {includes.map(i => `${i.qty > 1 ? `${i.qty} × ` : ''}${i.name}${i.label ? ` (${i.label})` : ''}`).join(' + ')} FREE{worth > 0 ? ` — worth ${inr(worth)}` : ''}</div>}

      {picks.map((sel, slot) => <section key={slot} className={`combo-slot${slot === next ? ' active' : ''}`} aria-label={`Choose item ${slot + 1}`}>
        <div className="combo-slot-h"><b>Choose item {slot + 1}</b>{sel ? <span className="combo-chosen">✓ {byId.get(sel)?.name}</span> : <span className="muted">Select one</span>}</div>
        <div className="combo-grid" role="radiogroup" aria-label={`Item ${slot + 1}`}>
          {options.map(o => { const taken = !repeat && picks.some((x, i) => i !== slot && x === o.variant_id); const dis = !o.available || taken;
            return <button key={o.variant_id} type="button" role="radio" aria-checked={sel === o.variant_id} disabled={dis} className="combo-opt" onClick={() => choose(slot, o.variant_id)}
              title={!o.available ? 'Out of stock' : taken ? 'Already picked' : `${o.name} ${o.label}`}>
              <span className="combo-img">{o.image ? <img src={o.image} alt="" loading="lazy" /> : <Bottle color={o.color} />}</span>
              <span className="combo-name">{o.name.replace(/ Essential Oil$/i, '')}</span>
              {!o.available && <span className="combo-oos">Sold out</span>}
            </button>; })}
        </div>
      </section>)}

      <div className="combo-box">
        <b>Your box</b>
        {picks.some(Boolean) || includes.length ? <ul>
          {picks.map((x, i) => <li key={i}>{x ? <>{byId.get(x)?.name} <span className="muted">{byId.get(x)?.label}</span></> : <span className="muted">Item {i + 1} — not chosen yet</span>}</li>)}
          {includes.map(i => <li key={i.variant_id}>{i.qty > 1 ? `${i.qty} × ` : ''}{i.name} <span className="combo-free-tag">FREE</span></li>)}
        </ul> : <p className="muted">Select your {N} items above.</p>}
      </div>

      {out ? <p className="stock out">This combo is sold out right now.</p> : <>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <QtyControl qty={qty} label={p.name} onChange={n => setQty(Math.max(1, Math.min(n, v.allow_backorder ? 20 : Math.min(20, v.stock))))} />
          {!done && <span className="muted" style={{ fontSize: 13.5 }}>Pick {picks.filter(x => !x).length} more to add to cart</span>}
        </div>
        <div className="buy-row">
          <button className="btn btn-primary" disabled={!done} onClick={addCombo}><CartIcon size={18} /> {added ? 'Added — add another' : 'Add to Cart'}</button>
          <button className="btn btn-ghost" disabled={!done} onClick={() => { addCombo(); setOpen(false); router.push('/checkout'); }}>Buy Now</button>
        </div>
        <div className="sticky-buy"><div><b>{inr(v.price * qty)}</b><div className="muted" style={{ fontSize: 12 }}>{done ? 'Box ready' : `Pick ${picks.filter(x => !x).length} more`}</div></div>
          <button className="btn btn-primary" disabled={!done} onClick={addCombo}><CartIcon size={18} /> Add to Cart</button></div>
      </>}
    </div>
  );
}
