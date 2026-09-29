'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/lib/types';
import { inr, pctOff } from '@/lib/format';
import { useCart } from '@/lib/cart';
import { track } from '@/lib/attribution';
import { submitLead } from './LeadForm';
import { Bottle } from './Bottle';
import { Stars } from './Stars';
import { CartIcon, HeartIcon } from './Icons';
import { QtyControl } from './CartDrawer';

export function Gallery({ p }: { p: Product }) {
  const [zoom, setZoom] = useState(false);
  const [idx, setIdx] = useState(0);
  const imgs = p.images.length ? p.images : [''];
  return (
    <div className="gallery">
      <button className={`gallery-main${zoom ? ' zoom' : ''}`} onClick={() => setZoom(z => !z)} aria-label={zoom ? 'Zoom out' : 'Zoom in'} style={{ border: 0 }}>
        {imgs[idx] ? <img src={imgs[idx]} alt={p.name} /> : <Bottle color={p.color} label={p.name} title={`${p.name} bottle`} />}
      </button>
      {imgs.length > 1 && <div className="thumbs">{imgs.map((src, i) => <button key={i} aria-pressed={i === idx} aria-label={`Image ${i + 1}`} onClick={() => setIdx(i)}><img src={src} alt="" /></button>)}</div>}
    </div>
  );
}

export function ProductBuy({ p, pairWith }: { p: Product; pairWith?: Product | null }) {
  const { add, wishlist, toggleWish, setOpen } = useCart();
  const router = useRouter();
  const [vid, setVid] = useState((p.variants.find(v => v.stock > 0) ?? p.variants[0]).id);
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState(''); const [eta, setEta] = useState<string | null>(null);
  const [notify, setNotify] = useState<'idle' | 'done'>('idle');
  const [pair, setPair] = useState(false);
  const v = p.variants.find(x => x.id === vid)!;
  const out = v.stock <= 0 && !v.allow_backorder;
  const off = pctOff(v.price, v.compare_at);
  const wished = wishlist.includes(p.slug);

  useEffect(() => { track('view_item', { currency: 'INR', value: v.price, items: [{ item_id: v.id, item_name: p.name, item_variant: v.label, price: v.price }] }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [p.slug]);

  const addAll = () => {
    add({ variant_id: v.id, product_slug: p.slug, name: p.name, label: v.label, price: v.price, color: p.color }, qty);
    const pv = pairWith?.variants[0];
    if (pair && pairWith && pv) add({ variant_id: pv.id, product_slug: pairWith.slug, name: pairWith.name, label: pv.label, price: pv.price, color: pairWith.color });
  };

  const checkPin = () => {
    if (!/^[1-9][0-9]{5}$/.test(pin)) { setEta('Enter a valid 6-digit pincode.'); return; }
    // Placeholder until courier serviceability API (Shiprocket/Delhivery) is connected — PDP-004 fallback.
    const metro = /^(11|40|56|60|70|50)/.test(pin);
    const d = new Date(); d.setDate(d.getDate() + (metro ? 3 : 6));
    setEta(`Delivers to ${pin} by ${d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })} (estimate)`);
  };

  return (
    <div className="pdp-info">
      <div>
        <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.5rem)' }}>{p.name}</h1>
        {p.botanical_name && <p className="botanical">{p.botanical_name}</p>}
      </div>
      <Stars rating={p.rating} count={p.review_count} />
      <p>{p.tagline}</p>
      <div className="price-row" style={{ paddingTop: 0 }}>
        <span className="price" style={{ fontSize: 26 }}>{inr(v.price)}</span>
        {off > 0 && <><span className="cmp" style={{ fontSize: 16 }}>MRP {inr(v.compare_at!)}</span><span className="off">{off}% OFF</span></>}
        <span className="muted" style={{ fontSize: 12, width: '100%' }}>Inclusive of all taxes</span>
      </div>
      {p.variants.length > 1 && <div><p style={{ fontWeight: 600, marginBottom: 6 }}>Size</p>
        <div className="variant-picker">{p.variants.map(x => <button key={x.id} aria-pressed={x.id === vid} onClick={() => { setVid(x.id); setQty(1); }}>{x.label}{x.stock <= 0 && !x.allow_backorder ? ' · sold out' : ''}</button>)}</div></div>}
      <p className={`stock ${out ? 'out' : v.stock <= v.low_stock_threshold ? 'low' : 'in'}`}>{out ? 'Out of stock' : v.stock <= v.low_stock_threshold ? `Only ${v.stock} left — order soon` : 'In stock, ready to ship'}</p>

      {out ? (
        <div id="notify" className="panel" style={{ padding: 16 }}>
          {notify === 'done' ? <p className="notice ok">We’ll message you when {v.label} is back.</p> : (
            <form className="form-grid" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget);
              await submitLead({ source: 'back_in_stock', email: String(f.get('email')), variant_id: v.id, interest: `${p.name} ${v.label}`, consent: true }).catch(() => {}); setNotify('done'); }}>
              <label className="field"><span style={{ fontWeight: 600 }}>Get notified when it’s back</span><input className="input" name="email" type="email" required placeholder="Email address" /></label>
              <button className="btn btn-primary">Notify me</button>
            </form>)}
        </div>
      ) : <>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <QtyControl qty={qty} label={p.name} onChange={n => setQty(Math.max(1, Math.min(n, v.allow_backorder ? 20 : Math.min(20, v.stock))))} />
          <button className="icon-btn" aria-pressed={wished} aria-label="Save to wishlist" onClick={() => toggleWish(p.slug)} style={{ border: '1px solid var(--line)', borderRadius: 10 }}><HeartIcon /></button>
        </div>
        {pairWith && pairWith.variants[0] && <label className="check panel" style={{ padding: 12 }}>
          <input type="checkbox" checked={pair} onChange={e => setPair(e.target.checked)} />
          <span>Add <b>{pairWith.name}</b> ({pairWith.variants[0].label}) for {inr(pairWith.variants[0].price)} — you’ll need a carrier oil to dilute before skin use.</span></label>}
        <div className="buy-row">
          <button className="btn btn-primary" onClick={addAll}><CartIcon size={18} /> Add to Cart</button>
          <button className="btn btn-ghost" onClick={() => { addAll(); setOpen(false); router.push('/checkout'); }}>Buy Now</button>
        </div>
      </>}

      <div className="field"><label htmlFor="pin">Check delivery</label>
        <div className="pin"><input id="pin" className="input" inputMode="numeric" maxLength={6} placeholder="Pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} /><button className="btn btn-ghost" onClick={checkPin}>Check</button></div>
        {eta && <p className="muted" style={{ fontSize: 13.5 }} aria-live="polite">{eta}</p>}</div>

      {!out && <div className="sticky-buy"><div><b>{inr(v.price * qty)}</b><div className="muted" style={{ fontSize: 12 }}>{v.label} × {qty}</div></div><button className="btn btn-primary" onClick={addAll}><CartIcon size={18} /> Add to Cart</button></div>}
    </div>
  );
}
