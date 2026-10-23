'use client';
import { useCallback, useEffect, useState } from 'react';
import { browserClient, hasSupabase } from '@/lib/supabase';
import { db } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type S = { free_shipping_min: number; shipping_flat: number; cod_fee: number; support_email: string; whatsapp: string; legal_name: string; gstin: string; address: string; [k: string]: unknown };
const DEF: S = { sr_auto: false, sr_pickup: 'Home-1', sr_pickup_pincode: '570020', sr_weight: 0.2, sr_l: 10, sr_b: 6, sr_h: 6, free_shipping_min: 999, shipping_flat: 79, cod_fee: 49, support_email: '', whatsapp: '', legal_name: 'EssenceKraft', gstin: '', address: '' };
export default function Settings() {
  const [s, setS] = useState<S>(DEF); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  useEffect(() => { db().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS({ ...DEF, ...(data.value as S) })); }, []);
  const save = async () => { setMsg(null);
    if (s.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s.gstin)) return setMsg({ t: 'error', m: 'GSTIN format looks wrong (15 characters, e.g. 29ABCDE1234F1Z5).' });
    const { data } = await db().from('settings').select('value').eq('key', 'store').maybeSingle();
    const { error } = await db().from('settings').upsert({ key: 'store', value: { ...(data?.value ?? {}), ...s } });
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Settings saved.' }); };
  const N = (k: keyof S, l: string, hint?: string) => <div className="field"><label htmlFor={String(k)}>{l}</label><input id={String(k)} type="number" min={0} step="any" className="input" value={Number(s[k])} onChange={e => setS({ ...s, [k]: Number(e.target.value) })} />{hint && <small className="muted">{hint}</small>}</div>;
  const T = (k: keyof S, l: string, ph?: string) => <div className="field"><label htmlFor={String(k)}>{l}</label><input id={String(k)} className="input" placeholder={ph} value={String(s[k] ?? '')} onChange={e => setS({ ...s, [k]: e.target.value })} /></div>;
  type Integ = { checked_at: string; rows: { key: string; name: string; what: string; status: 'ok' | 'error' | 'off'; detail: string }[] };
  const [integ, setInteg] = useState<Integ | null>(null); const [integBusy, setIntegBusy] = useState(false); const [integErr, setIntegErr] = useState('');
  const loadInteg = useCallback(async () => {
    if (!hasSupabase) { setIntegErr('Demo mode — connect Supabase to see live status.'); return; }
    setIntegBusy(true); setIntegErr('');
    try { const { data } = await browserClient().auth.getSession();
      const r = await fetch('/api/integrations', { headers: { authorization: `Bearer ${data.session?.access_token ?? ''}` }, cache: 'no-store' });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? `Status check failed (${r.status})`); setInteg(j);
    } catch (e) { setIntegErr(e instanceof Error ? e.message : 'Status check failed'); }
    setIntegBusy(false);
  }, []);
  useEffect(() => { loadInteg(); }, [loadInteg]);
  return <>
    <PageHead title="Settings" sub="Shipping rules, business details for invoices, and integration status."><button className="btn btn-primary btn-sm" onClick={save}>Save settings</button></PageHead>
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Shipping & payments</h3><p>Used at checkout.</p></div></div>
        <div className="form-grid two">{N('free_shipping_min', 'Free shipping above (₹)')}{N('shipping_flat', 'Flat shipping fee (₹)')}{N('cod_fee', 'COD handling fee (₹)', 'Set 0 to waive')}</div></section>
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Shiprocket</h3><p>Used when an order is sent to Shiprocket. Login is set in Vercel (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD).</p></div></div>
        <label className="check"><input type="checkbox" checked={!!s.sr_auto} onChange={e => setS({ ...s, sr_auto: e.target.checked })} />Send confirmed orders to Shiprocket automatically (paid online or COD)</label>
        <div className="form-grid two">{T('sr_pickup', 'Pickup address nickname', 'Home-1')}{T('sr_pickup_pincode', 'Pickup pincode', '570020')}{N('sr_weight', 'Weight per bottle (kg)', 'e.g. 0.2')}{N('sr_l', 'Box length (cm)')}{N('sr_b', 'Box breadth (cm)')}{N('sr_h', 'Box height (cm)')}</div></section>
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Business details</h3><p>Shown on tax invoices and the contact page.</p></div></div>
        <div className="form-grid two">{T('legal_name', 'Legal name')}{T('gstin', 'GSTIN', '29ABCDE1234F1Z5')}{T('support_email', 'Support email', 'hello@essencekraft.in')}{T('whatsapp', 'WhatsApp number', '9190000 00000')}</div>{T('address', 'Registered address')}</section>
      <section className="adm-card adm-span"><div className="adm-card-h"><div><h3>Integrations</h3><p>{integ?.checked_at ? `Live check · ${new Date(integ.checked_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Checking each service…'} · keys live in Vercel → Environment Variables, never here.</p></div>
        <button className="btn btn-ghost btn-sm" onClick={loadInteg} disabled={integBusy}>{integBusy ? 'Checking…' : 'Re-check'}</button></div>
        <div className="table-wrap"><table><tbody>
          {(integ?.rows ?? []).map(r => <tr key={r.key}><td><b>{r.name}</b> — {r.what}<br /><small className="muted">{r.detail}</small></td><td style={{ whiteSpace: 'nowrap' }}><span className={`pill ${r.status === 'ok' ? 'green' : r.status === 'error' ? 'red' : 'amber'}`}>{r.status === 'ok' ? 'Connected' : r.status === 'error' ? 'Error' : 'Not set'}</span></td></tr>)}
          {!integ && <tr><td colSpan={2} className="muted">{integErr || 'Checking Supabase, Razorpay, Brevo, Shiprocket…'}</td></tr>}
        </tbody></table></div></section>
    </div>
  </>;
}
