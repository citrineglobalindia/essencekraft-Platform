'use client';
import { useEffect, useState } from 'react';
import { deleteProduct } from '@/lib/productDelete';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { db, refreshStore } from '@/lib/admin';
import { Bottle } from '@/components/Bottle';

type Variant = { id?: string; sku: string; label: string; price: number; compare_at: number | null; stock: number; low_stock_threshold: number; allow_backorder: boolean; sort: number; _new?: boolean; _initial?: number };
type Opt = { id: string; name: string; slug: string };
const blank = { slug: '', name: '', botanical_name: '', tagline: '', description: '', category_id: '', aroma: '', extraction: '', origin: 'India', uses: '', suggested_blends: '', safety: '', purity: '', color: '#7a5a9e', images: [] as string[], is_bestseller: false, is_new: true, status: 'active', claim_status: 'pending', seo_title: '', seo_description: '' };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function EditProduct({ params }: { params: { id: string } }) {
  const isNew = params.id === 'new'; const router = useRouter();
  const [p, setP] = useState(blank); const [vars, setVars] = useState<Variant[]>([]);
  const [cats, setCats] = useState<Opt[]>([]); const [cons, setCons] = useState<Opt[]>([]); const [picked, setPicked] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [busy, setBusy] = useState(false);

  useEffect(() => {
    db().from('categories').select('id,name,slug').order('sort').then(({ data }) => setCats(data ?? []));
    db().from('concerns').select('id,name,slug').order('sort').then(({ data }) => setCons(data ?? []));
    if (isNew) { setVars([{ sku: '', label: '15 ml', price: 499, compare_at: 699, stock: 0, low_stock_threshold: 10, allow_backorder: false, sort: 0, _new: true, _initial: 0 }]); return; }
    db().from('products').select('*, variants(*), product_concerns(concern_id)').eq('id', params.id).single().then(({ data }) => {
      if (!data) return;
      const { variants, product_concerns, ...rest } = data;
      setP({ ...blank, ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v ?? ''])), uses: (rest.uses ?? []).join('\n'), suggested_blends: (rest.suggested_blends ?? []).join(', '), images: rest.images ?? [] });
      setVars((variants as Variant[]).sort((a, b) => a.sort - b.sort));
      setPicked(product_concerns.map((x: { concern_id: string }) => x.concern_id));
    });
  }, [isNew, params.id]);

  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setP(s => ({ ...s, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value, ...(k === 'name' && isNew ? { slug: slugify(e.target.value) } : {}) }));
  const setV = (i: number, k: keyof Variant, v: unknown) => setVars(vs => vs.map((x, j) => j === i ? { ...x, [k]: v } : x));

  const upload = async (file: File) => {
    const path = `${p.slug || 'product'}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '-')}`;
    const { error } = await db().storage.from('product-images').upload(path, file, { cacheControl: '31536000' });
    if (error) return setMsg({ t: 'error', m: error.message });
    const { data } = db().storage.from('product-images').getPublicUrl(path);
    setP(s => ({ ...s, images: [...s.images, data.publicUrl] }));
  };

  const save = async () => {
    setMsg(null);
    if (!p.name || !p.slug) return setMsg({ t: 'error', m: 'Name and URL slug are required.' });
    if (vars.some(v => !v.sku || !v.label || v.price < 0)) return setMsg({ t: 'error', m: 'Every variant needs a SKU, size label and price.' });
    setBusy(true);
    const row = { ...p, category_id: p.category_id || null, uses: p.uses.split('\n').map(s => s.trim()).filter(Boolean), suggested_blends: p.suggested_blends.split(',').map(s => s.trim()).filter(Boolean), updated_at: new Date().toISOString() };
    const res = isNew ? await db().from('products').insert(row).select('id').single() : await db().from('products').update(row).eq('id', params.id).select('id').single();
    if (res.error) { setBusy(false); return setMsg({ t: 'error', m: res.error.message }); }
    const pid = res.data.id;
    await db().from('product_concerns').delete().eq('product_id', pid);
    if (picked.length) await db().from('product_concerns').insert(picked.map(concern_id => ({ product_id: pid, concern_id })));
    for (const [i, v] of vars.entries()) {
      const vr = { product_id: pid, sku: v.sku.toUpperCase(), label: v.label, price: v.price, compare_at: v.compare_at || null, low_stock_threshold: v.low_stock_threshold, allow_backorder: v.allow_backorder, sort: i };
      if (v.id) { const { error } = await db().from('variants').update(vr).eq('id', v.id); if (error) { setBusy(false); return setMsg({ t: 'error', m: `${v.sku}: ${error.message}` }); } }
      else {
        const { data, error } = await db().from('variants').insert({ ...vr, stock: 0 }).select('id').single();
        if (error) { setBusy(false); return setMsg({ t: 'error', m: `${v.sku}: ${error.message}` }); }
        if (v._initial) await db().rpc('adjust_stock', { p_variant: data.id, p_change: v._initial, p_reason: 'initial', p_note: 'Opening stock' });
      }
    }
    await db().from('audit_log').insert({ action: isNew ? 'product.create' : 'product.update', entity: 'product', entity_id: pid, detail: { name: p.name } }).then(() => {}, () => {});
    await refreshStore(p.slug);
    setBusy(false); setMsg({ t: 'ok', m: p.status === 'active' ? 'Product saved and live on the store.' : `Product saved as ${p.status} — not visible on the store. Set Status to Active to publish.` });
    if (isNew) router.replace(`/admin/products/${pid}`);
  };

  const T = (k: keyof typeof blank, label: string, area = false, hint?: string) => (
    <div className="field"><label htmlFor={k}>{label}</label>
      {area ? <textarea id={k} className="textarea" value={String(p[k])} onChange={set(k)} /> : <input id={k} className="input" value={String(p[k])} onChange={set(k)} />}
      {hint && <small className="muted">{hint}</small>}</div>);

  return <>
    <div className="admin-bar"><div><Link className="link" href="/admin/products">← Products</Link><h1 style={{ fontSize: '1.5rem', marginTop: 6 }}>{isNew ? 'New product' : p.name}</h1></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{!isNew && <button className="btn btn-ghost btn-sm btn-danger" disabled={busy} onClick={async () => { const r = await deleteProduct(params.id, p.name); if (!r.msg) return; if (!r.ok) setMsg({ t: 'error', m: r.msg }); else if (r.archived) { setMsg({ t: 'ok', m: r.msg }); setP(x => ({ ...x, status: 'archived' })); } else router.replace('/admin/products?deleted=' + encodeURIComponent(p.name)); }}>Delete</button>}{!isNew && <Link className="btn btn-ghost btn-sm" href={`/product/${p.slug}`} target="_blank">View on store</Link>}<button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button></div></div>
    {msg && <p className={`notice ${msg.t}`} role="status">{msg.m}</p>}
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))', alignItems: 'start' }}>
      <section className="panel form-grid"><h2>Details</h2>
        {T('name', 'Product name')}{T('slug', 'URL slug', false, `/product/${p.slug || '…'}`)}{T('botanical_name', 'Botanical name')}{T('tagline', 'Short description')}{T('description', 'Approved long description', true)}
        <div className="form-grid two">
          <div className="field"><label htmlFor="cat">Category</label><select id="cat" className="select" value={p.category_id} onChange={set('category_id')}><option value="">—</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="field"><label htmlFor="status">Status</label><select id="status" className="select" value={p.status} onChange={set('status')}><option value="active">Active (visible on store)</option><option value="draft">Draft (hidden)</option><option value="archived">Archived</option></select></div>
        </div>
        <div className="field"><label>Concerns</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{cons.map(c => <label key={c.id} className="check"><input type="checkbox" checked={picked.includes(c.id)} onChange={() => setPicked(x => x.includes(c.id) ? x.filter(y => y !== c.id) : [...x, c.id])} />{c.name}</label>)}</div></div>
        <div style={{ display: 'flex', gap: 18 }}><label className="check"><input type="checkbox" checked={p.is_bestseller} onChange={set('is_bestseller')} />Best seller</label><label className="check"><input type="checkbox" checked={p.is_new} onChange={set('is_new')} />New arrival</label></div>
      </section>
      <section className="panel form-grid"><h2>Oil profile &amp; safety</h2>
        <div className="form-grid two">{T('aroma', 'Aroma profile')}{T('extraction', 'Extraction method')}{T('origin', 'Origin')}
          <div className="field"><label htmlFor="color">Label colour</label><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input id="color" type="color" value={p.color} onChange={set('color')} style={{ width: 48, height: 40, border: 0 }} /><div style={{ width: 26 }}><Bottle color={p.color} /></div></div></div></div>
        {T('uses', 'How to use (one per line)', true)}{T('suggested_blends', 'Blends well with (comma separated)')}{T('safety', 'Safety & dilution', true, 'Always shown on the product page — cannot be collapsed.')}{T('purity', 'Purity & testing')}
        <div className="field"><label htmlFor="claim">Claims review</label><select id="claim" className="select" value={p.claim_status} onChange={set('claim_status')}><option value="pending">Pending review</option><option value="approved">Approved for ads</option><option value="rejected">Rejected</option></select><small className="muted">Only approved copy should be used in paid campaigns (COMP-001).</small></div>
      </section>
      <section className="panel form-grid"><h2>Images</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{p.images.map(src => <div key={src} style={{ position: 'relative' }}><img src={src} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 8 }} /><button className="btn btn-danger btn-sm" style={{ position: 'absolute', top: 2, right: 2, minHeight: 24, padding: '0 6px' }} aria-label="Remove image" onClick={() => setP(s => ({ ...s, images: s.images.filter(x => x !== src) }))}>×</button></div>)}</div>
        <input type="file" accept="image/webp,image/jpeg,image/png,image/avif" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        <small className="muted">First image is the main product photo. Use WebP, at least 1200×1200. Without images the store shows the illustrated bottle.</small>
      </section>
      <section className="panel form-grid"><h2>SEO</h2>{T('seo_title', 'Page title')}{T('seo_description', 'Meta description', true)}</section>
    </div>
    <section className="panel"><div className="admin-bar" style={{ marginBottom: 12 }}><h2 style={{ margin: 0 }}>Variants &amp; pricing</h2>
      <button className="btn btn-ghost btn-sm" onClick={() => setVars(v => [...v, { sku: '', label: '', price: 0, compare_at: null, stock: 0, low_stock_threshold: 10, allow_backorder: false, sort: v.length, _new: true, _initial: 0 }])}>Add variant</button></div>
      <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Size</th><th>Price ₹</th><th>MRP ₹</th><th>Stock</th><th>Low-stock alert</th><th>Backorder</th><th></th></tr></thead><tbody>
        {vars.map((v, i) => <tr key={v.id ?? `n${i}`}>
          <td><input className="input" style={{ minWidth: 130 }} value={v.sku} onChange={e => setV(i, 'sku', e.target.value)} aria-label="SKU" /></td>
          <td><input className="input" style={{ minWidth: 80 }} value={v.label} onChange={e => setV(i, 'label', e.target.value)} aria-label="Size" /></td>
          <td><input className="input" style={{ width: 90 }} type="number" min={0} value={v.price} onChange={e => setV(i, 'price', Number(e.target.value))} aria-label="Price" /></td>
          <td><input className="input" style={{ width: 90 }} type="number" min={0} value={v.compare_at ?? ''} onChange={e => setV(i, 'compare_at', e.target.value ? Number(e.target.value) : null)} aria-label="MRP" /></td>
          <td>{v._new ? <input className="input" style={{ width: 80 }} type="number" min={0} value={v._initial ?? 0} onChange={e => setV(i, '_initial', Number(e.target.value))} aria-label="Opening stock" /> : <Link className="link" href={`/admin/inventory?sku=${v.sku}`}>{v.stock}</Link>}</td>
          <td><input className="input" style={{ width: 80 }} type="number" min={0} value={v.low_stock_threshold} onChange={e => setV(i, 'low_stock_threshold', Number(e.target.value))} aria-label="Low stock threshold" /></td>
          <td><input type="checkbox" checked={v.allow_backorder} onChange={e => setV(i, 'allow_backorder', e.target.checked)} aria-label="Allow backorder" /></td>
          <td>{v._new && <button className="link" onClick={() => setVars(x => x.filter((_, j) => j !== i))}>Remove</button>}</td>
        </tr>)}</tbody></table></div>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Stock for saved variants is changed in Inventory so every movement is logged.</p>
    </section>
  </>;
}
