'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { db, fmtDate, statusTone } from '@/lib/admin';
import { inr } from '@/lib/format';
import { Bottle } from '@/components/Bottle';

type O = { id: string; order_no: string; full_name: string; total: number; status: string; payment_status: string; payment_method: string; created_at: string; last_touch: Record<string, string> | null; order_items?: { product_name: string; qty: number; unit_price: number }[] };
type V = { id: string; sku: string; label: string; stock: number; low_stock_threshold: number; product: { name: string } };
const DAY = 864e5;
const RANGES: [number, string][] = [[7, '7 days'], [30, '30 days'], [90, '90 days']];
const STATUS_COL: Record<string, string> = { placed: '#d6a23c', confirmed: '#5c9dc4', packed: '#7f7bc6', shipped: '#3e9b8a', delivered: '#2f7d4f', cancelled: '#c0473e', returned: '#8a8f8c' };
const counted = (o: O) => o.status !== 'cancelled' && (o.payment_status === 'paid' || o.payment_method === 'cod');
const color = (name: string) => ({ Lavender: '#7a5a9e', Rosemary: '#3f6b3a', Peppermint: '#3d8a68', 'Tea Tree': '#4f7a4a', Geranium: '#c2566e', Orange: '#e0802a', Lemongrass: '#9aa53a', Cedarwood: '#8a5d3b', Eucalyptus: '#5f8a7a', Bergamot: '#b3a23a', Jojoba: '#c8a24a' } as Record<string, string>)[Object.keys({ Lavender: 1, Rosemary: 1, Peppermint: 1, 'Tea Tree': 1, Geranium: 1, Orange: 1, Lemongrass: 1, Cedarwood: 1, Eucalyptus: 1, Bergamot: 1, Jojoba: 1 }).find(k => name.includes(k)) ?? ''] ?? '#3e7b4f';

function Spark({ data, stroke = '#2f7d4f' }: { data: number[]; stroke?: string }) {
  const max = Math.max(...data, 1); const pts = data.map((v, i) => `${(i / Math.max(data.length - 1, 1)) * 100},${30 - (v / max) * 26}`).join(' ');
  return <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="adm-spark" aria-hidden><polyline points={pts} fill="none" stroke={stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" /><polygon points={`0,32 ${pts} 100,32`} fill={stroke} opacity=".08" /></svg>;
}

export default function Dashboard() {
  const [range, setRange] = useState(30);
  const [orders, setOrders] = useState<O[]>([]); const [vars, setVars] = useState<V[]>([]); const [leads, setLeads] = useState<{ created_at: string }[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - range * 2 * DAY).toISOString();
    db().from('orders').select('id,order_no,full_name,total,status,payment_status,payment_method,created_at,last_touch,order_items(product_name,qty,unit_price)').gte('created_at', since).order('created_at', { ascending: false }).then(({ data }) => setOrders((data ?? []) as O[]));
    db().from('variants').select('id,sku,label,stock,low_stock_threshold,product:products(name)').order('stock').limit(300).then(({ data }) => setVars((data ?? []) as unknown as V[]));
    db().from('leads').select('created_at').gte('created_at', since).then(({ data }) => setLeads(data ?? []));
  }, [range]);

  const m = useMemo(() => {
    const now = Date.now(), cur = (d: string) => now - +new Date(d) < range * DAY, prev = (d: string) => !cur(d);
    const co = orders.filter(o => cur(o.created_at)), po = orders.filter(o => prev(o.created_at));
    const rev = (l: O[]) => l.filter(counted).reduce((s, o) => s + Number(o.total), 0);
    const r = rev(co), pr = rev(po), n = co.filter(counted).length, pn = po.filter(counted).length;
    const days = Array.from({ length: range }, (_, i) => { const start = now - (range - i) * DAY; return co.filter(o => +new Date(o.created_at) >= start && +new Date(o.created_at) < start + DAY); });
    const daily = days.map(rev); const dailyN = days.map(d => d.filter(counted).length);
    const lc = leads.filter(l => cur(l.created_at)).length, pl = leads.length - lc;
    const dailyL = Array.from({ length: range }, (_, i) => { const start = now - (range - i) * DAY; return leads.filter(l => +new Date(l.created_at) >= start && +new Date(l.created_at) < start + DAY).length; });
    const status: Record<string, number> = {}; co.forEach(o => { status[o.status] = (status[o.status] ?? 0) + 1; });
    const src: Record<string, number> = {}; co.filter(counted).forEach(o => { const k = o.last_touch?.utm_source ?? (o.last_touch?.referrer ? 'organic / referral' : 'direct'); src[k] = (src[k] ?? 0) + Number(o.total); });
    const prod: Record<string, { rev: number; units: number }> = {}; co.filter(counted).forEach(o => o.order_items?.forEach(i => { const p = (prod[i.product_name] ??= { rev: 0, units: 0 }); p.rev += i.unit_price * i.qty; p.units += i.qty; }));
    const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
    return { r, n, aov: n ? r / n : 0, lc, dR: delta(r, pr), dN: delta(n, pn), dA: delta(n ? r / n : 0, pn ? pr / pn : 0), dL: delta(lc, pl), daily, dailyN, dailyL, status, total: co.length,
      src: Object.entries(src).sort((a, b) => b[1] - a[1]), prod: Object.entries(prod).sort((a, b) => b[1].rev - a[1].rev).slice(0, 5), recent: co.slice(0, 7), toShip: co.filter(o => ['placed', 'confirmed', 'packed'].includes(o.status)).length };
  }, [orders, leads, range]);
  const low = vars.filter(v => v.stock <= v.low_stock_threshold);
  const maxDay = Math.max(...m.daily, 1);
  const hour = new Date().getHours(); const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const Kpi = ({ label, value, d, spark, tone }: { label: string; value: string; d: number | null; spark: number[]; tone?: string }) => (
    <div className="adm-kpi"><span>{label}</span><b>{value}</b>
      <p className={d == null ? '' : d >= 0 ? 'up' : 'down'}>{d == null ? '—' : `${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}%`}<small> vs previous {range} days</small></p><Spark data={spark} stroke={tone} /></div>);

  return <>
    <div className="adm-hello">
      <div><h2>{greet}</h2><p>{m.toShip > 0 ? <>You have <b>{m.toShip} orders</b> to fulfil and <b>{low.length} SKUs</b> running low.</> : 'All orders are fulfilled.'}</p></div>
      <div className="adm-seg" role="group" aria-label="Date range">{RANGES.map(([d, l]) => <button key={d} aria-pressed={range === d} onClick={() => setRange(d)}>{l}</button>)}</div>
    </div>

    <section className="adm-kpis">
      <Kpi label="Revenue" value={inr(m.r)} d={m.dR} spark={m.daily} />
      <Kpi label="Orders" value={String(m.n)} d={m.dN} spark={m.dailyN} tone="#5c7fc4" />
      <Kpi label="Average order value" value={inr(m.aov)} d={m.dA} spark={m.daily.map((v, i) => (m.dailyN[i] ? v / m.dailyN[i] : 0))} tone="#a8661a" />
      <Kpi label="New leads" value={String(m.lc)} d={m.dL} spark={m.dailyL} tone="#7a5a9e" />
    </section>

    <div className="adm-row">
      <section className="adm-card adm-chart">
        <div className="adm-card-h"><div><h3>Revenue</h3><p>Paid and COD orders, daily</p></div><b>{inr(m.r)}</b></div>
        <div className="adm-bars" style={{ ['--n' as string]: range }}>
          {m.daily.map((v, i) => { const d = new Date(Date.now() - (range - 1 - i) * DAY); return (
            <div key={i} className="adm-bar" title={`${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${inr(v)} · ${m.dailyN[i]} orders`}><i style={{ height: `${(v / maxDay) * 100}%` }} /></div>); })}
        </div>
        <div className="adm-axis"><span>{new Date(Date.now() - (range - 1) * DAY).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span><span>Today</span></div>
      </section>
      <section className="adm-card">
        <div className="adm-card-h"><div><h3>Order status</h3><p>{m.total} orders in this period</p></div></div>
        <div className="adm-stack">{Object.entries(STATUS_COL).map(([s, c]) => m.status[s] ? <i key={s} style={{ flex: m.status[s], background: c }} title={`${s}: ${m.status[s]}`} /> : null)}</div>
        <ul className="adm-legend">{Object.entries(STATUS_COL).filter(([s]) => m.status[s]).map(([s, c]) => <li key={s}><i style={{ background: c }} />{s}<b>{m.status[s]}</b></li>)}</ul>
      </section>
    </div>

    <div className="adm-row three">
      <section className="adm-card">
        <div className="adm-card-h"><div><h3>Recent orders</h3></div><Link className="link" href="/admin/orders">View all</Link></div>
        <div className="adm-list">{m.recent.map(o => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} className="adm-li">
            <span className="adm-av">{o.full_name.split(' ').map(x => x[0]).join('').slice(0, 2)}</span>
            <div><b>{o.full_name}</b><small>{o.order_no} · {fmtDate(o.created_at)}</small></div>
            <span className={`pill ${statusTone[o.status]}`}>{o.status}</span><b className="adm-amt">{inr(o.total)}</b>
          </Link>))}{!m.recent.length && <p className="muted" style={{ padding: 12 }}>No orders in this period.</p>}</div>
      </section>
      <section className="adm-card">
        <div className="adm-card-h"><div><h3>Low stock</h3><p>{low.length} SKUs at or below alert level</p></div><Link className="link" href="/admin/inventory?filter=low">Restock</Link></div>
        <div className="adm-list">{low.slice(0, 6).map(v => (
          <Link key={v.id} href={`/admin/inventory?sku=${v.sku}`} className="adm-li">
            <span className="adm-thumb"><Bottle color={color(v.product?.name ?? '')} /></span>
            <div><b>{v.product?.name}</b><small>{v.label} · {v.sku}</small></div>
            <span className={`pill ${v.stock <= 0 ? 'red' : 'amber'}`}>{v.stock <= 0 ? 'Out' : `${v.stock} left`}</span>
          </Link>))}{!low.length && <p className="muted" style={{ padding: 12 }}>Everything is well stocked.</p>}</div>
      </section>
    </div>

    <div className="adm-row">
      <section className="adm-card">
        <div className="adm-card-h"><div><h3>Top products</h3><p>By revenue</p></div></div>
        <div className="adm-list">{m.prod.map(([name, p], i) => (
          <div key={name} className="adm-li static"><span className="adm-rank">{i + 1}</span><span className="adm-thumb"><Bottle color={color(name)} /></span>
            <div><b>{name}</b><small>{p.units} units sold</small></div><b className="adm-amt">{inr(p.rev)}</b></div>))}</div>
      </section>
      <section className="adm-card">
        <div className="adm-card-h"><div><h3>Revenue by channel</h3><p>Last-touch attribution</p></div></div>
        <ul className="adm-src">{m.src.map(([k, v]) => <li key={k}><div><span>{k}</span><b>{inr(v)}</b></div><i><em style={{ width: `${(v / (m.src[0]?.[1] || 1)) * 100}%` }} /></i></li>)}</ul>
      </section>
    </div>
  </>;
}
