'use client';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { PageHead } from '@/components/AdminUI';

type V = { id: string; sku: string; label: string; stock: number; low_stock_threshold: number; allow_backorder: boolean; product: { name: string; status: string } };
type M = { id: number; change: number; balance: number; reason: string; reference: string | null; note: string | null; created_at: string };
const REASONS = [['purchase', 'Received from supplier'], ['return', 'Customer return'], ['adjustment', 'Stock count correction'], ['damage', 'Damaged / expired']];

function Inventory() {
  const sp = useSearchParams();
  const [rows, setRows] = useState<V[]>([]); const [q, setQ] = useState(sp.get('sku') ?? ''); const [filter, setFilter] = useState(sp.get('filter') ?? 'all');
  const [adj, setAdj] = useState<V | null>(null); const [hist, setHist] = useState<{ v: V; m: M[] } | null>(null);
  const [form, setForm] = useState({ dir: 'in', qty: 1, reason: 'purchase', note: '', ref: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => db().from('variants').select('id,sku,label,stock,low_stock_threshold,allow_backorder,product:products(name,status)').order('sku').then(({ data }) => setRows((data ?? []) as unknown as V[])), []);
  useEffect(() => { load(); }, [load]);

  const list = rows.filter(v => {
    const t = `${v.sku} ${v.product?.name}`.toLowerCase();
    if (q && !t.includes(q.toLowerCase())) return false;
    if (filter === 'low') return v.stock > 0 && v.stock <= v.low_stock_threshold;
    if (filter === 'out') return v.stock <= 0;
    return true;
  });
  const counts = { low: rows.filter(v => v.stock > 0 && v.stock <= v.low_stock_threshold).length, out: rows.filter(v => v.stock <= 0).length, units: rows.reduce((s, v) => s + v.stock, 0) };

  const submit = async () => {
    if (!adj) return; setErr(''); setBusy(true);
    const change = form.dir === 'in' ? form.qty : -form.qty;
    const { error } = await db().rpc('adjust_stock', { p_variant: adj.id, p_change: change, p_reason: form.reason, p_note: form.note || null, p_ref: form.ref || null });
    setBusy(false);
    if (error) return setErr(error.message);
    setAdj(null); load();
  };
  const openHistory = async (v: V) => {
    const { data } = await db().from('stock_movements').select('*').eq('variant_id', v.id).order('created_at', { ascending: false }).limit(100);
    setHist({ v, m: (data ?? []) as M[] });
  };

  return <>
    <PageHead title="Inventory" sub="Every stock change is logged with a reason. Sales and cancellations update stock automatically." />
    <div className="kpis">
      <div className="kpi"><span>SKUs</span><b>{rows.length}</b></div><div className="kpi"><span>Units on hand</span><b>{counts.units}</b></div>
      <div className="kpi"><span>Low stock</span><b style={{ color: 'var(--warn)' }}>{counts.low}</b></div><div className="kpi"><span>Out of stock</span><b style={{ color: 'var(--danger)' }}>{counts.out}</b></div>
    </div>
    <div className="admin-bar">
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input className="input" placeholder="Search SKU or product" value={q} onChange={e => setQ(e.target.value)} aria-label="Search inventory" />
        <select className="select" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter"><option value="all">All</option><option value="low">Low stock</option><option value="out">Out of stock</option></select>
      </div>
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV(`inventory-${new Date().toISOString().slice(0, 10)}.csv`, list.map(v => ({ sku: v.sku, product: v.product?.name, size: v.label, stock: v.stock, threshold: v.low_stock_threshold, backorder: v.allow_backorder })))}>Export CSV</button>
    </div>
    <div className="table-wrap"><table>
      <thead><tr><th>Product</th><th>SKU</th><th>On hand</th><th className="hide-sm">Alert at</th><th></th></tr></thead>
      <tbody>{list.map(v => <tr key={v.id}>
        <td>{v.product?.name}<br /><small className="muted">{v.label}{v.product?.status !== 'active' ? ` · ${v.product?.status}` : ''}</small></td>
        <td>{v.sku}</td>
        <td><span className={`pill ${v.stock <= 0 ? 'red' : v.stock <= v.low_stock_threshold ? 'amber' : 'green'}`}>{v.stock}</span></td>
        <td className="hide-sm">{v.low_stock_threshold}</td>
        <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }}><button className="btn btn-primary btn-sm" onClick={() => { setAdj(v); setForm({ dir: 'in', qty: 1, reason: 'purchase', note: '', ref: '' }); setErr(''); }}>Adjust</button> <button className="btn btn-ghost btn-sm" onClick={() => openHistory(v)}>History</button></td>
      </tr>)}{!list.length && <tr><td colSpan={5} className="muted">Nothing matches.</td></tr>}</tbody>
    </table></div>

    {adj && <div className="modal" role="dialog" aria-modal="true" aria-label="Adjust stock" onClick={e => e.target === e.currentTarget && setAdj(null)}><div>
      <h2>Adjust stock</h2><p>{adj.product?.name} · {adj.label} · <b>{adj.stock}</b> on hand</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <label className="pay-opt" style={{ flex: 1 }}><input type="radio" checked={form.dir === 'in'} onChange={() => setForm(f => ({ ...f, dir: 'in', reason: 'purchase' }))} />Add stock</label>
        <label className="pay-opt" style={{ flex: 1 }}><input type="radio" checked={form.dir === 'out'} onChange={() => setForm(f => ({ ...f, dir: 'out', reason: 'damage' }))} />Remove stock</label>
      </div>
      <div className="form-grid two">
        <div className="field"><label htmlFor="aq">Quantity</label><input id="aq" type="number" min={1} className="input" value={form.qty} onChange={e => setForm(f => ({ ...f, qty: Math.max(1, Number(e.target.value)) }))} /></div>
        <div className="field"><label htmlFor="ar">Reason</label><select id="ar" className="select" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>{REASONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field span2"><label htmlFor="aref">Reference (PO / invoice no.)</label><input id="aref" className="input" value={form.ref} onChange={e => setForm(f => ({ ...f, ref: e.target.value }))} /></div>
        <div className="field span2"><label htmlFor="an">Note</label><input id="an" className="input" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>
      </div>
      <p className="muted">New balance: <b>{adj.stock + (form.dir === 'in' ? form.qty : -form.qty)}</b></p>
      {err && <p className="notice error" role="alert">{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}><button className="btn btn-ghost" onClick={() => setAdj(null)}>Cancel</button><button className="btn btn-primary" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Save adjustment'}</button></div>
    </div></div>}

    {hist && <div className="modal" role="dialog" aria-modal="true" aria-label="Stock history" onClick={e => e.target === e.currentTarget && setHist(null)}><div style={{ width: 'min(720px,100%)' }}>
      <div className="admin-bar"><h2>{hist.v.sku} history</h2><button className="btn btn-ghost btn-sm" onClick={() => setHist(null)}>Close</button></div>
      <div className="table-wrap"><table><thead><tr><th>When</th><th>Change</th><th>Balance</th><th>Reason</th><th>Ref / note</th></tr></thead><tbody>
        {hist.m.map(m => <tr key={m.id}><td>{fmtDate(m.created_at)}</td><td style={{ color: m.change > 0 ? 'var(--ok)' : 'var(--danger)', fontWeight: 600 }}>{m.change > 0 ? '+' : ''}{m.change}</td><td>{m.balance}</td><td>{m.reason}</td><td>{m.reference}{m.note ? ` · ${m.note}` : ''}</td></tr>)}
        {!hist.m.length && <tr><td colSpan={5} className="muted">No movements yet.</td></tr>}
      </tbody></table></div>
    </div></div>}
  </>;
}
export default function Page() { return <Suspense><Inventory /></Suspense>; }
