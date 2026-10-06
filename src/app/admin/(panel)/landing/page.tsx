'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, fmtDate } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';
import type { Block } from '@/lib/growth';

type LP = { id: string; slug: string; title: string; status: string; blocks: Block[]; seo_title: string | null; seo_description: string | null; updated_at: string };
type P = { slug: string; name: string };
const NEW: Record<Block['type'], Block> = {
  hero: { type: 'hero', heading: 'Sleep deeper, naturally', sub: 'Pure lavender & cedarwood, steam-distilled in India.', cta: 'Shop sleep oils', href: '/concern/sleep-calm' },
  products: { type: 'products', title: 'Our picks', slugs: [] },
  benefits: { type: 'benefits', title: 'Why EssenceKraft', items: [{ title: '100% pure', text: 'No fillers or synthetic fragrance.' }, { title: 'GC-MS tested', text: 'Every batch checked before bottling.' }, { title: 'Made in India', text: 'Bottled in amber glass in Mysuru.' }] },
  text: { type: 'text', title: 'How to use', body: 'Add 4–6 drops to your diffuser 30 minutes before bed.' },
  faq: { type: 'faq', title: 'Questions', items: [{ q: 'Is it safe on skin?', a: 'Always dilute 2–3 drops in 10 ml of a carrier oil and patch-test first.' }] },
  offer: { type: 'offer', title: '10% off your first order', body: 'Use the code at checkout.', code: 'WELCOME10', cta: 'Shop now', href: '/shop' },
};
const LABEL: Record<string, string> = { hero: 'Hero', products: 'Products', benefits: 'Benefits', text: 'Text', faq: 'FAQ', offer: 'Offer' };
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export default function Landing() {
  const [rows, setRows] = useState<LP[]>([]); const [ed, setEd] = useState<LP | null>(null); const [prods, setProds] = useState<P[]>([]);
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = useCallback(() => db().from('landing_pages').select('*').order('updated_at', { ascending: false }).then(({ data }) => setRows((data ?? []) as LP[])), []);
  useEffect(() => { load(); db().from('products').select('slug,name').eq('status', 'active').order('name').then(({ data }) => setProds((data ?? []) as P[])); }, [load]);
  const setB = (i: number, b: Block) => ed && setEd({ ...ed, blocks: ed.blocks.map((x, j) => j === i ? b : x) });
  const move = (i: number, d: number) => { if (!ed) return; const b = [...ed.blocks]; const [x] = b.splice(i, 1); b.splice(i + d, 0, x); setEd({ ...ed, blocks: b }); };
  const save = async (status?: string) => { if (!ed) return; setMsg(null);
    if (!ed.title || !ed.slug) return setMsg({ t: 'error', m: 'Title and URL are required.' });
    if (rows.some(r => r.slug === ed.slug && r.id !== ed.id)) return setMsg({ t: 'error', m: `/lp/${ed.slug} is already used.` });
    const row = { slug: slugify(ed.slug), title: ed.title, status: status ?? ed.status, blocks: ed.blocks, seo_title: ed.seo_title, seo_description: ed.seo_description, updated_at: new Date().toISOString() };
    const r = ed.id ? await db().from('landing_pages').update(row).eq('id', ed.id).select('*').single() : await db().from('landing_pages').insert(row).select('*').single();
    if (r.error) return setMsg({ t: 'error', m: r.error.message });
    setEd(r.data as LP); load(); setMsg({ t: 'ok', m: row.status === 'published' ? `Live at /lp/${row.slug} (updates within a minute).` : 'Draft saved.' }); };

  if (!ed) return <>
    <PageHead title="Landing pages" sub="Build ad and campaign pages from ready blocks — no developer needed. Every visit keeps its UTM and click IDs for attribution.">
      <button className="btn btn-primary btn-sm" onClick={() => setEd({ id: '', slug: '', title: '', status: 'draft', blocks: [NEW.hero, NEW.products, NEW.benefits, NEW.offer], seo_title: '', seo_description: '', updated_at: '' })}>New page</button></PageHead>
    <Saved msg={msg} />
    <div className="table-wrap"><table><thead><tr><th>Page</th><th>URL</th><th>Blocks</th><th>Status</th><th>Updated</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.id} onClick={() => setEd(r)} style={{ cursor: 'pointer' }}><td><b>{r.title}</b></td><td><code>/lp/{r.slug}</code></td><td>{r.blocks.length}</td><td><span className={`pill ${r.status === 'published' ? 'green' : 'grey'}`}>{r.status}</span></td><td>{fmtDate(r.updated_at)}</td></tr>)}
      {!rows.length && <tr><td colSpan={5} className="muted">No pages yet. Create one for your next Meta or Google ad.</td></tr>}</tbody></table></div>
  </>;

  const T = (v: string | undefined, on: (s: string) => void, l: string, area = false) => <div className="field"><label>{l}</label>{area ? <textarea className="textarea" value={v ?? ''} onChange={e => on(e.target.value)} /> : <input className="input" value={v ?? ''} onChange={e => on(e.target.value)} />}</div>;
  return <>
    <PageHead title={ed.id ? ed.title : 'New landing page'} sub={ed.slug ? `/lp/${slugify(ed.slug)}` : 'Choose a title and URL'}>
      <button className="btn btn-ghost btn-sm" onClick={() => { setEd(null); setMsg(null); }}>← All pages</button>
      {ed.id && ed.status === 'published' && <a className="btn btn-ghost btn-sm" href={`/lp/${ed.slug}?utm_source=preview`} target="_blank" rel="noopener">View live ↗</a>}
      <button className="btn btn-ghost btn-sm" onClick={() => save('draft')}>Save draft</button><button className="btn btn-primary btn-sm" onClick={() => save('published')}>Publish</button></PageHead>
    <Saved msg={msg} />
    <section className="adm-card form-grid"><div className="form-grid two">
      {T(ed.title, v => setEd({ ...ed, title: v, slug: ed.id ? ed.slug : slugify(v) }), 'Page title')}{T(ed.slug, v => setEd({ ...ed, slug: v }), 'URL (after /lp/)')}
      {T(ed.seo_title ?? '', v => setEd({ ...ed, seo_title: v }), 'Search title')}{T(ed.seo_description ?? '', v => setEd({ ...ed, seo_description: v }), 'Search description')}</div>
      <p className="muted" style={{ fontSize: 13 }}>Ad link example: <code>/lp/{slugify(ed.slug) || 'your-page'}?utm_source=meta&amp;utm_campaign=sleep_oct</code> — the order records where the visitor came from.</p></section>
    {ed.blocks.map((b, i) => <section key={i} className="adm-card form-grid adm-block">
      <div className="adm-card-h"><div><span className="pill">{LABEL[b.type]}</span></div><div style={{ display: 'flex', gap: 6 }}>
        <button className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button><button className="btn btn-ghost btn-sm" disabled={i === ed.blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setEd({ ...ed, blocks: ed.blocks.filter((_, j) => j !== i) })}>Remove</button></div></div>
      {b.type === 'hero' && <div className="form-grid two">{T(b.heading, v => setB(i, { ...b, heading: v }), 'Heading')}{T(b.sub, v => setB(i, { ...b, sub: v }), 'Subheading')}{T(b.cta, v => setB(i, { ...b, cta: v }), 'Button text')}{T(b.href, v => setB(i, { ...b, href: v }), 'Button link')}{T(b.image, v => setB(i, { ...b, image: v }), 'Background image URL (optional)')}</div>}
      {b.type === 'products' && <>{T(b.title, v => setB(i, { ...b, title: v }), 'Section title')}<div className="adm-chips">{prods.map(p => <label key={p.slug} className={`adm-chip${b.slugs.includes(p.slug) ? ' on' : ''}`}><input type="checkbox" checked={b.slugs.includes(p.slug)} onChange={e => setB(i, { ...b, slugs: e.target.checked ? [...b.slugs, p.slug] : b.slugs.filter(s => s !== p.slug) })} />{p.name}</label>)}</div></>}
      {b.type === 'benefits' && <>{T(b.title, v => setB(i, { ...b, title: v }), 'Section title')}{b.items.map((x, j) => <div key={j} className="form-grid two">{T(x.title, v => setB(i, { ...b, items: b.items.map((y, k) => k === j ? { ...y, title: v } : y) }), `Point ${j + 1}`)}{T(x.text, v => setB(i, { ...b, items: b.items.map((y, k) => k === j ? { ...y, text: v } : y) }), 'Detail')}</div>)}
        <button className="link" style={{ justifySelf: 'start' }} onClick={() => setB(i, { ...b, items: [...b.items, { title: '', text: '' }] })}>+ Add point</button></>}
      {b.type === 'text' && <>{T(b.title, v => setB(i, { ...b, title: v }), 'Section title')}{T(b.body, v => setB(i, { ...b, body: v }), 'Text (blank line = new paragraph)', true)}</>}
      {b.type === 'faq' && <>{T(b.title, v => setB(i, { ...b, title: v }), 'Section title')}{b.items.map((x, j) => <div key={j} className="form-grid two">{T(x.q, v => setB(i, { ...b, items: b.items.map((y, k) => k === j ? { ...y, q: v } : y) }), `Question ${j + 1}`)}{T(x.a, v => setB(i, { ...b, items: b.items.map((y, k) => k === j ? { ...y, a: v } : y) }), 'Answer')}</div>)}
        <button className="link" style={{ justifySelf: 'start' }} onClick={() => setB(i, { ...b, items: [...b.items, { q: '', a: '' }] })}>+ Add question</button></>}
      {b.type === 'offer' && <div className="form-grid two">{T(b.title, v => setB(i, { ...b, title: v }), 'Offer headline')}{T(b.body, v => setB(i, { ...b, body: v }), 'Detail')}{T(b.code, v => setB(i, { ...b, code: v.toUpperCase() }), 'Coupon code')}{T(b.ends_at, v => setB(i, { ...b, ends_at: v }), 'Ends (YYYY-MM-DD)')}{T(b.cta, v => setB(i, { ...b, cta: v }), 'Button text')}{T(b.href, v => setB(i, { ...b, href: v }), 'Button link')}</div>}
    </section>)}
    <div className="adm-card"><p style={{ fontWeight: 600, marginBottom: 8 }}>Add a block</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(Object.keys(NEW) as Block['type'][]).map(k => <button key={k} className="btn btn-ghost btn-sm" onClick={() => setEd({ ...ed, blocks: [...ed.blocks, JSON.parse(JSON.stringify(NEW[k]))] })}>+ {LABEL[k]}</button>)}</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Product facts and prices always come from the catalogue. Health claims in headlines need approval before you run them in ads.</p></div>
  </>;
}
