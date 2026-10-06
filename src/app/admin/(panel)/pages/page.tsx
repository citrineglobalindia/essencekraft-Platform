'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, fmtDate } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type P = { path: string; kind: string; title: string; description: string | null; eyebrow: string | null; h1: string; html: string; products: string[]; status: string; updated_at: string };
const KIND: Record<string, string> = { support: 'Help', policy: 'Policy', category: 'Category', landing: 'Shop by use', hub: 'Hub', guide: 'Guide' };
function Pages() {
  const sp = useSearchParams(); const [rows, setRows] = useState<P[]>([]); const [ed, setEd] = useState<P | null>(null); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = useCallback(() => db().from('site_pages').select('*').order('path').then(({ data }) => { const r = (data ?? []) as P[]; setRows(r); const want = sp.get('path'); if (want) setEd(r.find(x => x.path === want) ?? null); }), [sp]);
  useEffect(() => { load(); }, [load]);
  const save = async () => { if (!ed) return; setMsg(null);
    if (ed.title.length > 70) return setMsg({ t: 'error', m: 'Search title is over 70 characters — Google will cut it off.' });
    const { error } = await db().from('site_pages').update({ title: ed.title, description: ed.description, eyebrow: ed.eyebrow, h1: ed.h1, html: ed.html, products: ed.products, status: ed.status, updated_at: new Date().toISOString() }).eq('path', ed.path);
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: `Saved. ${ed.path} updates within 10 minutes.` }); load(); };
  if (ed) return <>
    <PageHead title={ed.h1} sub={ed.path}><button className="btn btn-ghost btn-sm" onClick={() => { setEd(null); setMsg(null); }}>← All pages</button><a className="btn btn-ghost btn-sm" href={ed.path} target="_blank" rel="noopener">View ↗</a><button className="btn btn-primary btn-sm" onClick={save}>Save</button></PageHead>
    <Saved msg={msg} />
    <section className="adm-card form-grid"><div className="form-grid two">
      <div className="field"><label htmlFor="pg-h1">Page heading</label><input id="pg-h1" className="input" value={ed.h1} onChange={e => setEd({ ...ed, h1: e.target.value })} /></div>
      <div className="field"><label htmlFor="pg-eb">Eyebrow</label><input id="pg-eb" className="input" value={ed.eyebrow ?? ''} onChange={e => setEd({ ...ed, eyebrow: e.target.value || null })} /></div>
      <div className="field"><label htmlFor="pg-t">Search title <small className="muted">{ed.title.length}/60</small></label><input id="pg-t" className="input" value={ed.title} onChange={e => setEd({ ...ed, title: e.target.value })} /></div>
      <div className="field"><label htmlFor="pg-st">Status</label><select id="pg-st" className="select" value={ed.status} onChange={e => setEd({ ...ed, status: e.target.value })}><option value="published">Published</option><option value="draft">Hidden (draft)</option></select></div>
      <div className="field span2"><label htmlFor="pg-d">Search description <small className="muted">{(ed.description ?? '').length}/160</small></label><input id="pg-d" className="input" value={ed.description ?? ''} onChange={e => setEd({ ...ed, description: e.target.value })} /></div>
      <div className="field span2"><label htmlFor="pg-p">Products shown (slugs, comma separated)</label><input id="pg-p" className="input" value={ed.products.join(', ')} onChange={e => setEd({ ...ed, products: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} /></div></div>
      <div className="field"><label htmlFor="pg-html">Content (HTML: h2–h4, p, ul/ol, table, details/summary for FAQs, links)</label><textarea id="pg-html" className="textarea" style={{ minHeight: 420, fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} value={ed.html} onChange={e => setEd({ ...ed, html: e.target.value })} /></div>
    </section>
  </>;
  return <>
    <PageHead title="Site pages" sub="FAQ, contact, policies, shop-by-use pages and guides migrated word-for-word from essencekraft.in. Old URLs keep working." />
    <div className="table-wrap"><table><thead><tr><th>Page</th><th>URL</th><th>Type</th><th>Status</th><th>Updated</th></tr></thead><tbody>
      {rows.map(r => <tr key={r.path} onClick={() => setEd(r)} style={{ cursor: 'pointer' }}><td><b>{r.h1}</b></td><td><code>{r.path}</code></td><td>{KIND[r.kind]}</td><td><span className={`pill ${r.status === 'published' ? 'green' : 'grey'}`}>{r.status}</span></td><td>{fmtDate(r.updated_at)}</td></tr>)}
      {!rows.length && <tr><td colSpan={5} className="muted">No pages.</td></tr>}</tbody></table></div>
  </>;
}
export default function Page() { return <Suspense><Pages /></Suspense>; }
