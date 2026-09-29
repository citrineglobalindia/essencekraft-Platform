'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db, fmtDate, statusTone } from '@/lib/admin';
import { inr } from '@/lib/format';

type O = { id: string; order_no: string; full_name: string; total: number; status: string; payment_status: string; payment_method: string; created_at: string; last_touch: Record<string, string> | null };
type V = { id: string; sku: string; label: string; stock: number; low_stock_threshold: number; product: { name: string } };

export default function Dashboard() {
  const [range, setRange] = useState(30);
  const [orders, setOrders] = useState<O[]>([]); const [low, setLow] = useState<V[]>([]); const [leads, setLeads] = useState(0);
  useEffect(() => {
    const since = new Date(Date.now() - range * 864e5).toISOString();
    db().from('orders').select('id,order_no,full_name,total,status,payment_status,payment_method,created_at,last_touch').gte('created_at', since).order('created_at', { ascending: false }).then(({ data }) => setOrders((data ?? []) as O[]));
    db().from('variants').select('id,sku,label,stock,low_stock_threshold,product:products(name)').order('stock').limit(200).then(({ data }) => setLow(((data ?? []) as unknown as V[]).filter(v => v.stock <= v.low_stock_threshold)));
    db().from('leads').select('id', { count: 'exact', head: true }).gte('created_at', since).then(({ count }) => setLeads(count ?? 0));
  }, [range]);
  const valid = orders.filter(o => o.status !== 'cancelled' && (o.payment_status === 'paid' || o.payment_method === 'cod'));
  const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
  const bySource = Object.entries(valid.reduce<Record<string, number>>((m, o) => { const k = o.last_touch?.utm_source ?? (o.last_touch?.referrer ? 'referral' : 'direct'); m[k] = (m[k] ?? 0) + Number(o.total); return m; }, {})).sort((a, b) => b[1] - a[1]);
  return <>
    <div className="admin-bar"><h1 style={{ fontSize: '1.5rem' }}>Overview</h1>
      <select className="select" value={range} onChange={e => setRange(Number(e.target.value))} aria-label="Date range"><option value={1}>Today</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></div>
    <div className="kpis">
      <div className="kpi"><span>Revenue</span><b>{inr(revenue)}</b></div>
      <div className="kpi"><span>Orders</span><b>{valid.length}</b></div>
      <div className="kpi"><span>Avg. order value</span><b>{inr(valid.length ? revenue / valid.length : 0)}</b></div>
      <div className="kpi"><span>New leads</span><b>{leads}</b></div>
    </div>
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
      <section className="table-wrap"><div className="admin-bar" style={{ padding: 12 }}><b>Recent orders</b><Link className="link" href="/admin/orders">All orders</Link></div>
        <table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {orders.slice(0, 8).map(o => <tr key={o.id}><td><Link className="link" href={`/admin/orders/${o.id}`}>{o.order_no}</Link><br /><small className="muted">{fmtDate(o.created_at)}</small></td><td>{o.full_name}</td><td>{inr(o.total)}</td><td><span className={`pill ${statusTone[o.status]}`}>{o.status}</span></td></tr>)}
          {!orders.length && <tr><td colSpan={4} className="muted">No orders in this period.</td></tr>}
        </tbody></table></section>
      <section className="table-wrap"><div className="admin-bar" style={{ padding: 12 }}><b>Low stock ({low.length})</b><Link className="link" href="/admin/inventory?filter=low">Restock</Link></div>
        <table><thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead><tbody>
          {low.slice(0, 8).map(v => <tr key={v.id}><td>{v.product?.name} <span className="muted">{v.label}</span></td><td>{v.sku}</td><td><span className={`pill ${v.stock <= 0 ? 'red' : 'amber'}`}>{v.stock}</span></td></tr>)}
          {!low.length && <tr><td colSpan={3} className="muted">All variants are above their threshold.</td></tr>}
        </tbody></table></section>
      <section className="table-wrap"><div style={{ padding: 12 }}><b>Revenue by source (last touch)</b></div>
        <table><tbody>{bySource.map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{inr(v)}</td></tr>)}{!bySource.length && <tr><td className="muted">No attributed revenue yet.</td></tr>}</tbody></table></section>
    </div>
  </>;
}
