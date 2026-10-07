'use client';
import Link from 'next/link';
import { deleteProduct } from '@/lib/productDelete';
import { useEffect, useState } from 'react';
import { db, refreshStore } from '@/lib/admin';
import { inr } from '@/lib/format';
import { Bottle } from '@/components/Bottle';
import { PageHead, Stats } from '@/components/AdminUI';

type Row = { id: string; slug: string; name: string; status: string; claim_status: string; color: string; images: string[]; is_bestseller: boolean; category: { name: string } | null; variants: { price: number; stock: number }[] };
export default function Products() {
  const [rows, setRows] = useState<Row[]>([]); const [q, setQ] = useState(''); const [status, setStatus] = useState('all');
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = () => db().from('products').select('id,slug,name,status,claim_status,color,images,is_bestseller,category:categories(name),variants(price,stock)').order('name').then(({ data }) => setRows((data ?? []) as unknown as Row[]));
  useEffect(() => { load(); const d = new URLSearchParams(window.location.search).get('deleted'); if (d) setMsg({ t: 'ok', m: `“${d}” deleted.` }); }, []);
  const publish = async (r: Row) => { const { error } = await db().from('products').update({ status: 'active' }).eq('id', r.id); if (error) return setMsg({ t: 'error', m: error.message }); await refreshStore(r.slug); setMsg({ t: 'ok', m: `“${r.name}” is now live on the store.` }); load(); };
  const remove = async (r: Row) => { const res = await deleteProduct(r.id, r.name); if (res.msg) setMsg({ t: res.ok ? 'ok' : 'error', m: res.msg }); if (res.ok) load(); };
  const list = rows.filter(r => (status === 'all' || r.status === status) && r.name.toLowerCase().includes(q.toLowerCase()));
  return <>
    <PageHead title="Products" sub="Catalogue, pricing, content and claims review." />
    <Stats items={[['Products', rows.length], ['Active', rows.filter(r => r.status === 'active').length], ['Drafts', rows.filter(r => r.status === 'draft').length], ['Claims pending review', rows.filter(r => r.claim_status === 'pending').length, 'amber']]} />
    <div className="admin-bar">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search products" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" />
        <select className="select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Status"><option value="all">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select>
      </div>
      <Link className="btn btn-primary btn-sm" href="/admin/products/new">Add product</Link>
    </div>
    {msg && <p className={`notice ${msg.t}`} role="status">{msg.m}</p>}
    <div className="table-wrap"><table>
      <thead><tr><th></th><th>Product</th><th className="hide-sm">Category</th><th>Price</th><th>Stock</th><th>Status</th><th className="hide-sm">Claims</th><th></th></tr></thead>
      <tbody>{list.map(r => { const stock = r.variants.reduce((s, v) => s + v.stock, 0); const min = Math.min(...r.variants.map(v => Number(v.price))); return (
        <tr key={r.id}>
          <td style={{ width: 52 }}>{r.images?.[0] ? <img src={r.images[0]} alt="" width={40} height={40} style={{ borderRadius: 8, objectFit: 'cover', display: 'block' }} /> : <div style={{ width: 28 }}><Bottle color={r.color} /></div>}</td>
          <td><Link className="link" href={`/admin/products/${r.id}`}>{r.name}</Link>{r.is_bestseller && <span className="pill green" style={{ marginLeft: 6 }}>Best seller</span>}<br /><small className="muted">{r.variants.length} variant{r.variants.length === 1 ? '' : 's'}</small></td>
          <td className="hide-sm">{r.category?.name}</td>
          <td>{r.variants.length ? inr(min) : '—'}</td>
          <td><span className={`pill ${stock <= 0 ? 'red' : stock < 20 ? 'amber' : 'green'}`}>{stock}</span></td>
          <td><span className={`pill ${r.status === 'active' ? 'green' : 'grey'}`}>{r.status}</span>{r.status === 'draft' && <><br /><button className="link" onClick={() => publish(r)}>Publish</button></>}</td>
          <td className="hide-sm"><span className={`pill ${r.claim_status === 'approved' ? 'green' : r.claim_status === 'rejected' ? 'red' : 'amber'}`}>{r.claim_status}</span></td>
          <td style={{ textAlign: 'right' }}><button className="link link-danger" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}>Delete</button></td>
        </tr>); })}
        {!list.length && <tr><td colSpan={8} className="muted">No products match.</td></tr>}</tbody>
    </table></div>
  </>;
}
