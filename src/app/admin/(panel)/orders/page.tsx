'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, downloadCSV, fmtDate, statusTone } from '@/lib/admin';
import { inr } from '@/lib/format';
import { PageHead, Stats } from '@/components/AdminUI';

type O = { id: string; order_no: string; full_name: string; email: string; phone: string; total: number; status: string; payment_status: string; payment_method: string; created_at: string; address: { city: string; pincode: string }; coupon_code: string | null; first_touch: Record<string, string> | null; last_touch: Record<string, string> | null };
const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled', 'returned'];

function Orders() {
  const sp = useSearchParams();
  const [rows, setRows] = useState<O[]>([]); const [q, setQ] = useState(sp.get('q') ?? ''); const [status, setStatus] = useState('all'); const [pay, setPay] = useState('all');
  useEffect(() => {
    let query = db().from('orders').select('id,order_no,full_name,email,phone,total,status,payment_status,payment_method,created_at,address,coupon_code,first_touch,last_touch').order('created_at', { ascending: false }).limit(500);
    if (status !== 'all') query = query.eq('status', status);
    if (pay !== 'all') query = query.eq('payment_status', pay);
    query.then(({ data }) => setRows((data ?? []) as O[]));
  }, [status, pay]);
  const list = rows.filter(o => !q || `${o.order_no} ${o.full_name} ${o.email} ${o.phone}`.toLowerCase().includes(q.toLowerCase()));
  const toShip = rows.filter(o => ['placed', 'confirmed', 'packed'].includes(o.status)).length;
  const codDue = rows.filter(o => o.payment_method === 'cod' && o.payment_status !== 'paid' && o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0);
  return <>
    <PageHead title="Orders" sub="Fulfil, track and refund. Cancelling or returning restocks automatically." />
    <Stats items={[['To fulfil', toShip, toShip ? 'amber' : ''], ['Shipped', rows.filter(o => o.status === 'shipped').length], ['COD to collect', inr(codDue)], ['Showing', list.length]]} />
    <div className="admin-bar">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Order no., name, phone, email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search orders" />
        <select className="select" value={status} onChange={e => setStatus(e.target.value)} aria-label="Order status"><option value="all">All statuses</option>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
        <select className="select" value={pay} onChange={e => setPay(e.target.value)} aria-label="Payment status"><option value="all">All payments</option><option>paid</option><option>pending</option><option>failed</option><option>refunded</option></select>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('orders.csv', list.map(o => ({ order_no: o.order_no, date: o.created_at, customer: o.full_name, email: o.email, phone: o.phone, city: o.address?.city, pincode: o.address?.pincode, total: o.total, status: o.status, payment: `${o.payment_method}/${o.payment_status}`, coupon: o.coupon_code, first_source: o.first_touch?.utm_source, first_campaign: o.first_touch?.utm_campaign, last_source: o.last_touch?.utm_source, last_campaign: o.last_touch?.utm_campaign, gclid: o.last_touch?.gclid })))}>Export CSV</button>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>Order</th><th>Customer</th><th className="hide-sm">Payment</th><th>Total</th><th>Status</th></tr></thead>
      <tbody>{list.map(o => <tr key={o.id}>
        <td><Link className="link" href={`/admin/orders/${o.id}`}>{o.order_no}</Link><br /><small className="muted">{fmtDate(o.created_at)}</small></td>
        <td>{o.full_name}<br /><small className="muted">{o.address?.city} {o.address?.pincode}</small></td>
        <td className="hide-sm"><span className={`pill ${statusTone[o.payment_status]}`}>{o.payment_method === 'cod' ? 'COD' : 'Online'} · {o.payment_status}</span></td>
        <td>{inr(o.total)}</td>
        <td><span className={`pill ${statusTone[o.status]}`}>{o.status}</span></td>
      </tr>)}{!list.length && <tr><td colSpan={5} className="muted">No orders found.</td></tr>}</tbody>
    </table></div>
  </>;
}

export default function Page() { return <Suspense><Orders /></Suspense>; }
