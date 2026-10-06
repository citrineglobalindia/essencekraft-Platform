'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { db, downloadCSV } from '@/lib/admin';
import { PageHead, Stats, Saved } from '@/components/AdminUI';

type Rd = { id: string; source: string; destination: string; permanent: boolean; hits: number };
type P = { id: string; name: string; slug: string; seo_title: string | null; seo_description: string | null; status: string };
export default function Seo() {
  const [rd, setRd] = useState<Rd[]>([]); const [ps, setPs] = useState<P[]>([]); const [f, setF] = useState({ source: '', destination: '' }); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = useCallback(() => { db().from('redirects').select('*').order('source').then(({ data }) => setRd((data ?? []) as Rd[])); db().from('products').select('id,name,slug,seo_title,seo_description,status').order('name').then(({ data }) => setPs((data ?? []) as P[])); }, []);
  useEffect(() => { load(); }, [load]);
  const add = async (e: React.FormEvent) => { e.preventDefault(); setMsg(null);
    const source = '/' + f.source.trim().replace(/^https?:\/\/[^/]+/, '').replace(/^\/+/, ''); const destination = f.destination.trim();
    if (source === destination) return setMsg({ t: 'error', m: 'Source and destination are the same.' });
    if (rd.some(r => r.source === source)) return setMsg({ t: 'error', m: `${source} already redirects.` });
    if (rd.some(r => r.source === destination)) return setMsg({ t: 'error', m: 'Destination is itself redirected — that would create a chain.' });
    const { error } = await db().from('redirects').insert({ source, destination, permanent: true });
    if (error) setMsg({ t: 'error', m: error.message }); else { setF({ source: '', destination: '' }); setMsg({ t: 'ok', m: 'Redirect added.' }); load(); } };
  const issues = (p: P) => [!p.seo_title && 'no title', p.seo_title && p.seo_title.length > 60 && 'title > 60', !p.seo_description && 'no description', p.seo_description && p.seo_description.length > 160 && 'description > 160'].filter(Boolean) as string[];
  const bad = ps.filter(p => issues(p).length);
  return <>
    <PageHead title="SEO & redirects" sub="Keep old essencekraft.in links working and every product page well described for Google.">
      <a className="btn btn-ghost btn-sm" href="/sitemap.xml" target="_blank">View sitemap</a>
    </PageHead>
    <Stats items={[['Redirects', rd.length], ['Redirect hits', rd.reduce((s, r) => s + (r.hits ?? 0), 0)], ['Products with SEO issues', bad.length, bad.length ? 'amber' : ''], ['Encyclopedia pages', '1,239']]} />
    <Saved msg={msg} />
    <section className="adm-card">
      <div className="adm-card-h"><div><h3>301 redirects</h3><p>Send old URLs to their new pages. Stored in the database; applied site-wide once Supabase is connected.</p></div>
        <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('redirects.csv', rd.map(({ source, destination, hits }) => ({ source, destination, hits })))}>Export</button></div>
      <form onSubmit={add} className="adm-inline"><input className="input" required placeholder="/old-url" value={f.source} onChange={e => setF({ ...f, source: e.target.value })} aria-label="Old URL" /><span aria-hidden>→</span>
        <input className="input" required placeholder="/new-url" value={f.destination} onChange={e => setF({ ...f, destination: e.target.value })} aria-label="New URL" /><button className="btn btn-primary btn-sm">Add</button></form>
      <div className="table-wrap" style={{ marginTop: 12 }}><table><thead><tr><th>From</th><th>To</th><th>Hits</th><th></th></tr></thead><tbody>
        {rd.map(r => <tr key={r.id}><td><code>{r.source}</code></td><td><code>{r.destination}</code></td><td>{r.hits ?? 0}</td><td><button className="link" onClick={async () => { await db().from('redirects').delete().eq('id', r.id); load(); }}>Remove</button></td></tr>)}
      </tbody></table></div>
    </section>
    <section className="adm-card">
      <div className="adm-card-h"><div><h3>Product search listings</h3><p>Titles ≤ 60 characters, descriptions ≤ 160.</p></div></div>
      <div className="table-wrap"><table><thead><tr><th>Product</th><th>Google preview</th><th>Status</th></tr></thead><tbody>
        {ps.map(p => { const i = issues(p); return <tr key={p.id}><td><Link className="link" href={`/admin/products/${p.id}`}>{p.name}</Link></td>
          <td><div className="adm-serp"><b>{p.seo_title || p.name}</b><span>essencekraft.in › product › {p.slug}</span><p>{p.seo_description || '—'}</p></div></td>
          <td>{i.length ? i.map(x => <span key={x} className="pill amber" style={{ margin: 2 }}>{x}</span>) : <span className="pill green">good</span>}</td></tr>; })}
      </tbody></table></div>
    </section>
  </>;
}
