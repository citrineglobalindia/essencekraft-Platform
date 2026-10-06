'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { inr } from '@/lib/format';
import { PageHead, Stats } from '@/components/AdminUI';

type O = { id: string; order_no: string; full_name: string; email: string; phone: string; total: number; status: string; created_at: string; marketing_consent: boolean; address: { city: string } };
type C = { email: string; name: string; phone: string; city: string; orders: O[]; spend: number; last: string; first: string; consent: boolean };
export default function Customers() {
  const [orders, setOrders] = useState<O[]>([]); const [q, setQ] = useState(''); const [seg, setSeg] = useState('all'); const [open, setOpen] = useState<C | null>(null);
  useEffect(() => { db().from('orders').select('id,order_no,full_name,email,phone,total,status,created_at,marketing_consent,address').order('created_at', { ascending: false }).limit(2000).then(({ data }) => setOrders((data ?? []) as O[])); }, []);
  const customers = useMemo(() => {
    const m = new Map<string, C>();
    orders.forEach(o => { const k = o.email.toLowerCase(); const c = m.get(k) ?? { email: o.email, name: o.full_name, phone: o.phone, city: o.address?.city, orders: [], spend: 0, last: o.created_at, first: o.created_at, consent: o.marketing_consent };
      c.orders.push(o); if (o.status !== 'cancelled') c.spend += Number(o.total); if (o.created_at > c.last) c.last = o.created_at; if (o.created_at < c.first) c.first = o.created_at; c.consent ||= o.marketing_consent; m.set(k, c); });
    return [...m.values()].sort((a, b) => b.spend - a.spend);
  }, [orders]);
  const lapsed = (c: C) => Date.now() - +new Date(c.last) > 45 * 864e5;
  const list = customers.filter(c => (seg === 'all' || (seg === 'repeat' && c.orders.length > 1) || (seg === 'vip' && c.spend >= 5000) || (seg === 'lapsed' && lapsed(c)) || (seg === 'consent' && c.consent))
    && `${c.name} ${c.email} ${c.phone} ${c.city}`.toLowerCase().includes(q.toLowerCase()));
  const repeat = customers.filter(c => c.orders.length > 1).length;
  return <>
    <PageHead title="Customers" sub="Built from orders — every buyer, their spend and history.">
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('customers.csv', list.map(c => ({ name: c.name, email: c.email, phone: c.phone, city: c.city, orders: c.orders.length, spend: c.spend, first_order: c.first, last_order: c.last, marketing_consent: c.consent })))}>Export CSV</button>
    </PageHead>
    <Stats items={[['Customers', customers.length], ['Repeat buyers', `${customers.length ? Math.round((repeat / customers.length) * 100) : 0}%`], ['Avg. lifetime value', inr(customers.length ? customers.reduce((s, c) => s + c.spend, 0) / customers.length : 0)], ['Marketing opt-in', customers.filter(c => c.consent).length]]} />
    <div className="admin-bar">
      <input className="input" placeholder="Search name, email, phone, city" value={q} onChange={e => setQ(e.target.value)} aria-label="Search customers" />
      <div className="adm-seg">{[['all', 'All'], ['repeat', 'Repeat'], ['vip', 'VIP ₹5k+'], ['lapsed', 'Lapsed 45d'], ['consent', 'Opted in']].map(([k, l]) => <button key={k} aria-pressed={seg === k} onClick={() => setSeg(k)}>{l}</button>)}</div>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>Customer</th><th className="hide-sm">City</th><th>Orders</th><th>Lifetime spend</th><th className="hide-sm">Last order</th></tr></thead>
      <tbody>{list.map(c => <tr key={c.email} onClick={() => setOpen(c)} style={{ cursor: 'pointer' }}>
        <td><b>{c.name}</b><br /><small className="muted">{c.email}</small></td><td className="hide-sm">{c.city}</td><td>{c.orders.length}{c.orders.length > 1 && <span className="pill green" style={{ marginLeft: 6 }}>repeat</span>}</td>
        <td><b>{inr(c.spend)}</b></td><td className="hide-sm">{fmtDate(c.last)}{lapsed(c) && <span className="pill amber" style={{ marginLeft: 6 }}>lapsed</span>}</td></tr>)}
        {!list.length && <tr><td colSpan={5} className="muted">No customers match.</td></tr>}</tbody>
    </table></div>
    {open && <div className="modal" role="dialog" aria-modal="true" aria-label={open.name} onClick={e => e.target === e.currentTarget && setOpen(null)}><div style={{ width: 'min(620px,100%)' }}>
      <div className="admin-bar"><div><h2>{open.name}</h2><p className="muted">{open.email} · {open.phone} · {open.city}</p></div><button className="btn btn-ghost btn-sm" onClick={() => setOpen(null)}>Close</button></div>
      <Stats items={[['Orders', open.orders.length], ['Spend', inr(open.spend)], ['Customer since', new Date(open.first).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })]]} />
      <div className="table-wrap"><table><tbody>{open.orders.map(o => <tr key={o.id}><td><Link className="link" href={`/admin/orders/${o.id}`}>{o.order_no}</Link></td><td>{fmtDate(o.created_at)}</td><td><span className="pill">{o.status}</span></td><td>{inr(o.total)}</td></tr>)}</tbody></table></div>
      <div style={{ display: 'flex', gap: 8 }}><a className="btn btn-primary btn-sm" href={`https://wa.me/91${open.phone.slice(-10)}`} target="_blank" rel="noopener">WhatsApp</a><a className="btn btn-ghost btn-sm" href={`mailto:${open.email}`}>Email</a></div>
    </div></div>}
  </>;
}
