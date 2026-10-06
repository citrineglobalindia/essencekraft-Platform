'use client';
import { useEffect, useState } from 'react';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { PageHead, Stats } from '@/components/AdminUI';

type L = { id: string; source: string; name: string | null; email: string | null; phone: string | null; interest: string | null; landing_page: string | null; consent: boolean; status: string; created_at: string; first_touch: Record<string, string> | null; last_touch: Record<string, string> | null };
export default function Leads() {
  const [rows, setRows] = useState<L[]>([]); const [src, setSrc] = useState('all');
  useEffect(() => { db().from('leads').select('*').order('created_at', { ascending: false }).limit(1000).then(({ data }) => setRows((data ?? []) as L[])); }, []);
  const list = rows.filter(r => src === 'all' || r.source === src);
  const sources = Array.from(new Set(rows.map(r => r.source)));
  return <>
    <PageHead title="Leads" sub="Signups from the popup, newsletter, back-in-stock and WhatsApp — with the campaign that brought them." />
    <Stats items={[['Total leads', rows.length], ['Opted in', rows.filter(r => r.consent).length], ['Last 7 days', rows.filter(r => Date.now() - +new Date(r.created_at) < 7 * 864e5).length], ['Sources', sources.length]]} />
    <div className="admin-bar">
      <select className="select" value={src} onChange={e => setSrc(e.target.value)} aria-label="Lead source"><option value="all">All sources ({rows.length})</option>{sources.map(s => <option key={s} value={s}>{s} ({rows.filter(r => r.source === s).length})</option>)}</select>
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('leads.csv', list.map(l => ({ date: l.created_at, source: l.source, name: l.name, email: l.email, phone: l.phone, interest: l.interest, consent: l.consent, landing: l.landing_page, utm_source: l.last_touch?.utm_source, utm_medium: l.last_touch?.utm_medium, utm_campaign: l.last_touch?.utm_campaign, first_utm_source: l.first_touch?.utm_source, gclid: l.last_touch?.gclid, fbclid: l.last_touch?.fbclid })))}>Export CSV</button>
    </div>
    <div className="table-wrap"><table><thead><tr><th>When</th><th>Source</th><th>Contact</th><th className="hide-sm">Interest</th><th className="hide-sm">Campaign</th><th>Consent</th></tr></thead><tbody>
      {list.map(l => <tr key={l.id}><td>{fmtDate(l.created_at)}</td><td><span className="pill">{l.source}</span></td><td>{l.name && <>{l.name}<br /></>}{l.email}{l.phone && <><br />{l.phone}</>}</td>
        <td className="hide-sm">{l.interest ?? '—'}</td><td className="hide-sm">{l.last_touch?.utm_campaign ?? l.last_touch?.utm_source ?? 'direct'}</td><td>{l.consent ? '✓' : '—'}</td></tr>)}
      {!list.length && <tr><td colSpan={6} className="muted">No leads yet.</td></tr>}
    </tbody></table></div>
  </>;
}
