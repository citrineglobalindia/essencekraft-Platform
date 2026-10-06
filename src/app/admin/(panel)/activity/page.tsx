'use client';
import { useEffect, useState } from 'react';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { PageHead } from '@/components/AdminUI';

type L = { id: number; actor: string | null; actor_name?: string; action: string; entity: string | null; entity_id: string | null; detail: Record<string, unknown> | null; created_at: string };
const ICON: Record<string, string> = { order: '🧾', stock: '📦', products: '🌿', coupons: '🏷️', settings: '⚙️', redirects: '↪️', reviews: '⭐' };
export default function Activity() {
  const [rows, setRows] = useState<L[]>([]); const [f, setF] = useState('all');
  useEffect(() => { db().from('audit_log').select('*').order('created_at', { ascending: false }).limit(500).then(({ data }) => setRows((data ?? []) as L[])); }, []);
  const kinds = [...new Set(rows.map(r => r.action.split('.')[0]))];
  const list = rows.filter(r => f === 'all' || r.action.startsWith(f));
  return <>
    <PageHead title="Activity log" sub="Every price, stock, order, coupon, content and SEO change — who did it and when.">
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('activity.csv', list.map(r => ({ when: r.created_at, who: r.actor_name ?? r.actor, action: r.action, item: r.entity_id, detail: r.detail })))}>Export CSV</button>
    </PageHead>
    <div className="adm-seg">{['all', ...kinds].map(k => <button key={k} aria-pressed={f === k} onClick={() => setF(k)} style={{ textTransform: 'capitalize' }}>{k}</button>)}</div>
    <section className="adm-card"><ol className="adm-timeline">{list.map(r => (
      <li key={r.id}><span>{ICON[r.action.split('.')[0]] ?? '•'}</span><div><b>{r.action.replace('.', ' · ')}</b> <code>{r.entity_id}</code>
        <small>{r.actor_name ?? r.actor ?? 'system'} · {fmtDate(r.created_at)}{r.detail && Object.keys(r.detail).length > 0 && <> · {Object.entries(r.detail).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === 'object' ? '…' : v}`).join(', ')}</>}</small></div></li>))}
      {!list.length && <li className="muted">No activity yet.</li>}</ol></section>
  </>;
}
