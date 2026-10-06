'use client';
import { useEffect, useState } from 'react';
import { db, isDemo } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type S = { free_shipping_min: number; shipping_flat: number; cod_fee: number; support_email: string; whatsapp: string; legal_name: string; gstin: string; address: string; [k: string]: unknown };
const DEF: S = { free_shipping_min: 999, shipping_flat: 79, cod_fee: 49, support_email: '', whatsapp: '', legal_name: 'EssenceKraft', gstin: '', address: '' };
export default function Settings() {
  const [s, setS] = useState<S>(DEF); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  useEffect(() => { db().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS({ ...DEF, ...(data.value as S) })); }, []);
  const save = async () => { setMsg(null);
    if (s.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(s.gstin)) return setMsg({ t: 'error', m: 'GSTIN format looks wrong (15 characters, e.g. 29ABCDE1234F1Z5).' });
    const { data } = await db().from('settings').select('value').eq('key', 'store').maybeSingle();
    const { error } = await db().from('settings').upsert({ key: 'store', value: { ...(data?.value ?? {}), ...s } });
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Settings saved.' }); };
  const N = (k: keyof S, l: string, hint?: string) => <div className="field"><label htmlFor={String(k)}>{l}</label><input id={String(k)} type="number" min={0} className="input" value={Number(s[k])} onChange={e => setS({ ...s, [k]: Number(e.target.value) })} />{hint && <small className="muted">{hint}</small>}</div>;
  const T = (k: keyof S, l: string, ph?: string) => <div className="field"><label htmlFor={String(k)}>{l}</label><input id={String(k)} className="input" placeholder={ph} value={String(s[k] ?? '')} onChange={e => setS({ ...s, [k]: e.target.value })} /></div>;
  const ok = (v: boolean) => <span className={`pill ${v ? 'green' : 'amber'}`}>{v ? 'Connected' : 'Not set'}</span>;
  return <>
    <PageHead title="Settings" sub="Shipping rules, business details for invoices, and integration status."><button className="btn btn-primary btn-sm" onClick={save}>Save settings</button></PageHead>
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Shipping & payments</h3><p>Used at checkout.</p></div></div>
        <div className="form-grid two">{N('free_shipping_min', 'Free shipping above (₹)')}{N('shipping_flat', 'Flat shipping fee (₹)')}{N('cod_fee', 'COD handling fee (₹)', 'Set 0 to waive')}</div></section>
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Business details</h3><p>Shown on tax invoices and the contact page.</p></div></div>
        <div className="form-grid two">{T('legal_name', 'Legal name')}{T('gstin', 'GSTIN', '29ABCDE1234F1Z5')}{T('support_email', 'Support email', 'hello@essencekraft.in')}{T('whatsapp', 'WhatsApp number', '9190000 00000')}</div>{T('address', 'Registered address')}</section>
      <section className="adm-card adm-span"><div className="adm-card-h"><div><h3>Integrations</h3><p>Keys are added in Vercel → Settings → Environment Variables, never here.</p></div></div>
        <div className="table-wrap"><table><tbody>
          <tr><td><b>Supabase</b> — database, login, storage</td><td>{ok(!isDemo)}</td></tr>
          <tr><td><b>Razorpay</b> — UPI, cards, net banking</td><td><span className="pill grey">Check in Vercel</span></td></tr>
          <tr><td><b>Google Tag Manager</b> — GA4, Ads, Meta Pixel</td><td>{ok(!!process.env.NEXT_PUBLIC_GTM_ID)}</td></tr>
          <tr><td><b>WhatsApp</b> — chat button & order help</td><td>{ok(!!process.env.NEXT_PUBLIC_WHATSAPP_NUMBER)}</td></tr>
        </tbody></table></div></section>
    </div>
  </>;
}
