'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, fmtDate } from '@/lib/admin';
import { PageHead, Stats } from '@/components/AdminUI';

type R = { id: string; author: string; rating: number; title: string; body: string; verified: boolean; status: string; created_at: string; product: { name: string; slug: string } };
export default function Reviews() {
  const [rows, setRows] = useState<R[]>([]); const [tab, setTab] = useState('pending'); const [err, setErr] = useState('');
  const load = useCallback(() => db().from('reviews').select('*, product:products(name,slug)').order('created_at', { ascending: false }).then(({ data, error }) => { if (error) setErr('Reviews table not found — run supabase/migrations/0002_admin.sql.'); setRows((data ?? []) as R[]); }), []);
  useEffect(() => { load(); }, [load]);
  const set = async (id: string, status: string) => { await db().from('reviews').update({ status }).eq('id', id); load(); };
  const del = async (id: string) => { if (confirm('Delete this review permanently?')) { await db().from('reviews').delete().eq('id', id); load(); } };
  const list = rows.filter(r => tab === 'all' || r.status === tab);
  const avg = rows.filter(r => r.status === 'approved'); const mean = avg.length ? (avg.reduce((s, r) => s + r.rating, 0) / avg.length).toFixed(1) : '—';
  return <>
    <PageHead title="Reviews" sub="Approve genuine reviews before they appear on product pages. Never publish edited or invented reviews." />
    {err && <p className="notice error">{err}</p>}
    <Stats items={[['Awaiting moderation', rows.filter(r => r.status === 'pending').length, 'amber'], ['Published', avg.length], ['Average rating', mean], ['Verified buyers', `${rows.length ? Math.round((rows.filter(r => r.verified).length / rows.length) * 100) : 0}%`]]} />
    <div className="adm-seg">{['pending', 'approved', 'rejected', 'all'].map(k => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} style={{ textTransform: 'capitalize' }}>{k} ({k === 'all' ? rows.length : rows.filter(r => r.status === k).length})</button>)}</div>
    <div className="adm-reviews">{list.map(r => (
      <article key={r.id} className="adm-card">
        <div className="adm-card-h"><div><b className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</b><h3 style={{ marginTop: 4 }}>{r.title}</h3><p>{r.author}{r.verified && ' · ✓ verified buyer'} · {fmtDate(r.created_at)}</p></div><span className={`pill ${r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}`}>{r.status}</span></div>
        <p style={{ fontSize: 14.5 }}>{r.body}</p>
        <p className="muted" style={{ fontSize: 13, margin: '8px 0' }}>on <a className="link" href={`/product/${r.product?.slug}`} target="_blank">{r.product?.name}</a></p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {r.status !== 'approved' && <button className="btn btn-primary btn-sm" onClick={() => set(r.id, 'approved')}>Approve</button>}
          {r.status !== 'rejected' && <button className="btn btn-ghost btn-sm" onClick={() => set(r.id, 'rejected')}>Reject</button>}
          <button className="link" style={{ marginLeft: 'auto' }} onClick={() => del(r.id)}>Delete</button>
        </div>
      </article>))}
      {!list.length && <p className="muted">Nothing here.</p>}</div>
  </>;
}
