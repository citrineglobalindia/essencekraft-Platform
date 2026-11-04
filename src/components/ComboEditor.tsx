'use client';
import { useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/admin';
import type { Combo } from '@/lib/types';

type VOpt = { id: string; label: string; sku: string; stock: number; product: { id: string; name: string; status: string; combo: unknown } | null };
// Admin: “Pick any N” combo settings for a product.
export function ComboEditor({ value, onChange, selfId }: { value: Combo | null; onChange: (c: Combo | null) => void; selfId?: string }) {
  const [all, setAll] = useState<VOpt[]>([]); const [q, setQ] = useState('');
  useEffect(() => {
    db().from('variants').select('id,label,sku,stock,product:products(id,name,status,combo)').order('sku').then(({ data, error }) => {
      if (error && /combo/.test(error.message)) return db().from('variants').select('id,label,sku,stock,product:products(id,name,status)').order('sku').then(r => setAll((r.data ?? []) as unknown as VOpt[]));
      setAll((data ?? []) as unknown as VOpt[]);
    });
  }, []);
  // Choices: sizes of other non-combo, non-archived products
  const list = useMemo(() => all.filter(v => v.product && v.product.id !== selfId && !v.product.combo && v.product.status !== 'archived')
    .sort((a, b) => a.product!.name.localeCompare(b.product!.name) || a.label.localeCompare(b.label)), [all, selfId]);
  const name = (v: VOpt) => `${v.product?.name} · ${v.label}`;
  if (!value) return <section className="panel form-grid"><h2>Combo</h2>
    <p className="muted" style={{ margin: 0 }}>Turn this product into a “Pick any N” combo — customers choose items from a list you set, at one combo price, with optional free items.</p>
    <button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => onChange({ pick: 2, options: [], includes: [], allow_repeat: true })}>Make this a combo</button></section>;

  const c = value; const set = (patch: Partial<Combo>) => onChange({ ...c, ...patch });
  const toggle = (id: string) => set({ options: c.options.includes(id) ? c.options.filter(x => x !== id) : [...c.options, id] });
  const shown = list.filter(v => !q || name(v).toLowerCase().includes(q.toLowerCase()) || v.sku.toLowerCase().includes(q.toLowerCase()));
  const sizes = Array.from(new Set(list.map(v => v.label))).slice(0, 6);
  const inc = c.includes ?? [];
  return <section className="panel form-grid combo-ed"><div className="admin-bar" style={{ margin: 0 }}><h2 style={{ margin: 0 }}>Combo — pick any {c.pick}</h2>
      <button className="link link-danger" onClick={() => { if (confirm('Turn off combo for this product? It becomes a normal product.')) onChange(null); }}>Not a combo</button></div>
    <div className="form-grid two">
      <div className="field"><label htmlFor="cpick">Customer picks</label><select id="cpick" className="select" value={c.pick} onChange={e => set({ pick: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} item{n > 1 ? 's' : ''}</option>)}</select></div>
      <label className="check" style={{ alignSelf: 'end', paddingBottom: 10 }}><input type="checkbox" checked={c.allow_repeat !== false} onChange={e => set({ allow_repeat: e.target.checked })} />Allow picking the same item more than once</label>
    </div>
    <div className="field"><label>Customers choose from <small className="muted">({c.options.length} selected)</small></label>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search products…" value={q} onChange={e => setQ(e.target.value)} />
        {sizes.map(s => <button key={s} type="button" className="btn btn-ghost btn-sm" onClick={() => set({ options: Array.from(new Set([...c.options, ...list.filter(v => v.label === s).map(v => v.id)])) })}>+ All {s}</button>)}
        {c.options.length > 0 && <button type="button" className="link" onClick={() => set({ options: [] })}>Clear</button>}
      </div>
      <div className="combo-ed-list">{shown.map(v => <label key={v.id} className={`check${c.options.includes(v.id) ? ' on' : ''}`}><input type="checkbox" checked={c.options.includes(v.id)} onChange={() => toggle(v.id)} />
        <span>{v.product?.name} <small className="muted">{v.label} · stock {v.stock}</small></span></label>)}
        {!shown.length && <p className="muted">No products match.</p>}</div>
      <small className="muted">Only these sizes appear in the combo picker. Out-of-stock items show as “Sold out”. Each pick reduces that item’s stock.</small></div>
    <div className="field"><label>Free items included (optional)</label>
      {inc.map((it, i) => <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
        <select className="select" value={it.variant_id} onChange={e => set({ includes: inc.map((x, j) => j === i ? { ...x, variant_id: e.target.value } : x) })}>
          <option value="">Choose a product…</option>{list.map(v => <option key={v.id} value={v.id}>{name(v)}</option>)}</select>
        <input className="input" type="number" min={1} style={{ width: 80 }} value={it.qty} onChange={e => set({ includes: inc.map((x, j) => j === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x) })} aria-label="Quantity" />
        <button type="button" className="link link-danger" onClick={() => set({ includes: inc.filter((_, j) => j !== i) })}>Remove</button></div>)}
      <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => set({ includes: [...inc, { variant_id: '', qty: 1 }] })}>+ Add free item</button>
      <small className="muted">e.g. a free diffuser in every box. Its stock is reduced with each combo sold.</small></div>
    <p className="notice" style={{ margin: 0 }}>Set the combo’s price, MRP and stock in <b>Variants &amp; pricing</b> below — use one row (e.g. size “Combo”).</p>
  </section>;
}
