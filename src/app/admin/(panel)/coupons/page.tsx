'use client';
import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/admin';
import { inr } from '@/lib/format';

type C = { id: string; code: string; kind: 'percent' | 'flat'; value: number; min_cart: number; max_uses: number | null; used: number; ends_at: string | null; active: boolean };
export default function Coupons() {
  const [rows, setRows] = useState<C[]>([]); const [err, setErr] = useState('');
  const [f, setF] = useState({ code: '', kind: 'percent', value: 10, min_cart: 0, max_uses: '', ends_at: '' });
  const load = useCallback(() => db().from('coupons').select('*').order('code').then(({ data }) => setRows((data ?? []) as C[])), []);
  useEffect(() => { load(); }, [load]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (f.kind === 'percent' && (f.value <= 0 || f.value > 90)) return setErr('Percentage must be between 1 and 90.');
    if (rows.some(r => r.active && r.code.toUpperCase() === f.code.toUpperCase())) return setErr('An active coupon with this code already exists.');
    const { error } = await db().from('coupons').insert({ code: f.code.toUpperCase().trim(), kind: f.kind, value: f.value, min_cart: f.min_cart, max_uses: f.max_uses ? Number(f.max_uses) : null, ends_at: f.ends_at || null });
    if (error) setErr(error.message); else { setF({ ...f, code: '' }); load(); }
  };
  return <>
    <form className="panel form-grid" onSubmit={create}><h2>New coupon</h2>
      <div className="form-grid two">
        <div className="field"><label htmlFor="cc">Code</label><input id="cc" className="input" required value={f.code} onChange={e => setF({ ...f, code: e.target.value })} placeholder="DIWALI15" /></div>
        <div className="field"><label htmlFor="ck">Type</label><select id="ck" className="select" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}><option value="percent">Percent off</option><option value="flat">Flat ₹ off</option></select></div>
        <div className="field"><label htmlFor="cv">Value</label><input id="cv" type="number" className="input" min={1} value={f.value} onChange={e => setF({ ...f, value: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="cm">Minimum cart ₹</label><input id="cm" type="number" className="input" min={0} value={f.min_cart} onChange={e => setF({ ...f, min_cart: Number(e.target.value) })} /></div>
        <div className="field"><label htmlFor="cu">Usage limit (blank = unlimited)</label><input id="cu" type="number" className="input" min={1} value={f.max_uses} onChange={e => setF({ ...f, max_uses: e.target.value })} /></div>
        <div className="field"><label htmlFor="ce">Ends</label><input id="ce" type="datetime-local" className="input" value={f.ends_at} onChange={e => setF({ ...f, ends_at: e.target.value })} /></div>
      </div>
      {err && <p className="notice error" role="alert">{err}</p>}
      <button className="btn btn-primary" style={{ justifySelf: 'start' }}>Create coupon</button>
    </form>
    <div className="table-wrap"><table><thead><tr><th>Code</th><th>Discount</th><th>Min cart</th><th>Used</th><th className="hide-sm">Ends</th><th>Active</th></tr></thead><tbody>
      {rows.map(c => <tr key={c.id}><td><b>{c.code}</b></td><td>{c.kind === 'percent' ? `${c.value}%` : inr(c.value)}</td><td>{inr(c.min_cart)}</td><td>{c.used}{c.max_uses ? ` / ${c.max_uses}` : ''}</td>
        <td className="hide-sm">{c.ends_at ? new Date(c.ends_at).toLocaleDateString('en-IN') : '—'}</td>
        <td><label className="check"><input type="checkbox" checked={c.active} onChange={async () => { await db().from('coupons').update({ active: !c.active }).eq('id', c.id); load(); }} /><span className="sr">Active</span></label></td></tr>)}
    </tbody></table></div>
  </>;
}
