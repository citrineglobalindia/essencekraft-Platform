'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { PageHead, Stats, Saved } from '@/components/AdminUI';

type E = { id: number; email: string; points: number; reason: string; order_no: string | null; note: string | null; created_at: string };
type R = { email: string; code: string; created_at: string };
type S = { enabled: boolean; earn_per_100: number; point_value: number; referral_bonus: number; referral_discount: number; min_redeem: number };
const DEF: S = { enabled: true, earn_per_100: 1, point_value: 0.5, referral_bonus: 100, referral_discount: 10, min_redeem: 100 };
export default function Loyalty() {
  const [led, setLed] = useState<E[]>([]); const [refs, setRefs] = useState<R[]>([]); const [s, setS] = useState<S>(DEF); const [q, setQ] = useState('');
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [uses, setUses] = useState<Record<string, number>>({});
  const load = useCallback(() => {
    db().from('loyalty_ledger').select('*').order('created_at', { ascending: false }).limit(5000).then(({ data }) => setLed((data ?? []) as E[]));
    db().from('referral_codes').select('*').order('created_at', { ascending: false }).limit(2000).then(({ data }) => setRefs((data ?? []) as R[]));
    db().from('coupons').select('code,used').like('code', 'REF-%').then(({ data }) => setUses(Object.fromEntries((data ?? []).map(c => [c.code, c.used]))));
    db().from('settings').select('value').eq('key', 'loyalty').maybeSingle().then(({ data }) => data && setS({ ...DEF, ...(data.value as S) }));
  }, []);
  useEffect(() => { load(); }, [load]);
  const members = useMemo(() => { const m = new Map<string, { email: string; balance: number; earned: number; last: string }>();
    led.forEach(e => { const x = m.get(e.email) ?? { email: e.email, balance: 0, earned: 0, last: e.created_at }; x.balance += e.points; if (e.points > 0) x.earned += e.points; if (e.created_at > x.last) x.last = e.created_at; m.set(e.email, x); });
    return [...m.values()].sort((a, b) => b.balance - a.balance); }, [led]);
  const saveSettings = async () => { const { error } = await db().from('settings').upsert({ key: 'loyalty', value: s }); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Programme settings saved. Referral discount applies to new codes; existing codes keep theirs.' }); };
  const redeem = async (email: string, bal: number) => {
    const pts = Number(prompt(`Convert how many points for ${email}? (balance ${bal}, minimum ${s.min_redeem}; 1 point = ₹${s.point_value})`, String(bal))); if (!pts) return;
    const { data, error } = await db().rpc('redeem_points', { p_email: email, p_points: pts });
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: `Created single-use coupon ${data} worth ₹${Math.round(pts * s.point_value)} for ${email} (valid 90 days). Share it with them.` }); load(); };
  const N = (k: keyof S, l: string, step = '1') => <div className="field"><label htmlFor={`l-${k}`}>{l}</label><input id={`l-${k}`} type="number" step={step} min={0} className="input" value={Number(s[k])} onChange={e => setS({ ...s, [k]: Number(e.target.value) })} /></div>;
  const outstanding = members.reduce((a, m) => a + Math.max(0, m.balance), 0);
  const list = members.filter(m => m.email.includes(q.toLowerCase()));
  return <>
    <PageHead title="Loyalty & referrals" sub="Customers earn points when an order is delivered (reversed on returns). Every buyer gets a referral code — friends save, the referrer earns bonus points.">
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('loyalty.csv', members.map(m => ({ email: m.email, balance: m.balance, lifetime_earned: m.earned, last_activity: m.last, referral_code: refs.find(r => r.email === m.email)?.code })))}>Export</button>
    </PageHead>
    <Saved msg={msg} />
    <Stats items={[['Members with points', members.length], ['Points outstanding', outstanding], ['Liability', `₹${Math.round(outstanding * s.point_value).toLocaleString('en-IN')}`, 'amber'], ['Referral codes', refs.length], ['Referral orders', Object.values(uses).reduce((a, b) => a + (b ?? 0), 0)]]} />
    <div className="adm-2col">
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Programme rules</h3></div><label className="adm-toggle" style={{ padding: '6px 10px' }}><input type="checkbox" checked={s.enabled} onChange={e => setS({ ...s, enabled: e.target.checked })} /><span>{s.enabled ? 'On' : 'Off'}</span></label></div>
        <div className="form-grid two">{N('earn_per_100', 'Points per ₹100 spent')}{N('point_value', 'Value of 1 point (₹)', '0.1')}{N('min_redeem', 'Minimum points to redeem')}{N('referral_bonus', 'Referrer bonus (points)')}{N('referral_discount', 'Friend’s discount (%)')}</div>
        <p className="muted" style={{ fontSize: 13 }}>At these rules a ₹1,000 order earns {Math.floor(10 * s.earn_per_100)} points = ₹{Math.round(10 * s.earn_per_100 * s.point_value)} back ({((s.earn_per_100 * s.point_value)).toFixed(1)}%).</p>
        <button className="btn btn-primary btn-sm" style={{ justifySelf: 'start' }} onClick={saveSettings}>Save rules</button></section>
      <section className="adm-card"><div className="adm-card-h"><div><h3>Top referrers</h3></div></div>
        <div className="adm-list">{refs.filter(r => uses[r.code]).sort((a, b) => (uses[b.code] ?? 0) - (uses[a.code] ?? 0)).slice(0, 8).map(r => <div key={r.code} className="adm-li static" style={{ gridTemplateColumns: '1fr auto' }}><div><b>{r.email}</b><small><code>{r.code}</code></small></div><span className="pill green">{uses[r.code]} uses</span></div>)}
          {!refs.some(r => uses[r.code]) && <p className="muted">No referral orders yet. Codes appear on every order confirmation page with a WhatsApp share button.</p>}</div></section>
    </div>
    <input className="input" style={{ maxWidth: 320 }} placeholder="Search member email" value={q} onChange={e => setQ(e.target.value)} aria-label="Search members" />
    <div className="table-wrap"><table><thead><tr><th>Member</th><th>Balance</th><th className="hide-sm">Lifetime earned</th><th className="hide-sm">Referral code</th><th></th></tr></thead><tbody>
      {list.map(m => <tr key={m.email}><td>{m.email}<br /><small className="muted">last activity {fmtDate(m.last)}</small></td><td><b>{m.balance}</b> <small className="muted">= ₹{Math.round(m.balance * s.point_value)}</small></td><td className="hide-sm">{m.earned}</td>
        <td className="hide-sm"><code>{refs.find(r => r.email === m.email)?.code ?? '—'}</code></td>
        <td style={{ textAlign: 'right' }}>{m.balance >= s.min_redeem ? <button className="btn btn-primary btn-sm" onClick={() => redeem(m.email, m.balance)}>Convert to coupon</button> : <small className="muted">{s.min_redeem - m.balance} to go</small>}</td></tr>)}
      {!list.length && <tr><td colSpan={5} className="muted">No points earned yet — points are added automatically when orders are marked delivered.</td></tr>}</tbody></table></div>
    <section className="adm-card"><div className="adm-card-h"><div><h3>Recent activity</h3></div></div>
      <ol className="adm-timeline">{led.slice(0, 15).map(e => <li key={e.id}><span>{e.points > 0 ? '＋' : '−'}</span><div><b>{e.points > 0 ? '+' : ''}{e.points} pts</b> · {e.reason}{e.order_no && <> · <code>{e.order_no}</code></>}{e.note && <> · {e.note}</>}<small>{e.email} · {fmtDate(e.created_at)}</small></div></li>)}
        {!led.length && <li className="muted">Nothing yet.</li>}</ol></section>
  </>;
}
