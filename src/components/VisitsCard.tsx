'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/admin';

type Stats = { pageviews: number; visits: number; visitors: number; daily: { day: string; visits: number; pageviews: number }[]; top_pages: { path: string; views: number }[] };
const R: [string, string][] = [['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['90', '3 months']];
function since(k: string) {
  if (k === 'today') { const ist = new Date(Date.now() + 5.5 * 3600e3); ist.setUTCHours(0, 0, 0, 0); return new Date(ist.getTime() - 5.5 * 3600e3); } // midnight IST
  return new Date(Date.now() - Number(k) * 864e5);
}
const n = (v: number) => v.toLocaleString('en-IN');

// Admin dashboard: website visits (store pages only; bots and admin excluded).
export function VisitsCard() {
  const [k, setK] = useState('7'); const [s, setS] = useState<Stats | null>(null); const [err, setErr] = useState('');
  useEffect(() => {
    setS(null); setErr('');
    db().rpc('visit_stats', { p_from: since(k).toISOString() }).then(({ data, error }) => {
      if (error) setErr(/visit_stats|function|schema cache/i.test(error.message) ? 'Visit tracking is waiting for a one-time database update.' : error.message);
      else setS(data as Stats);
    });
  }, [k]);
  const max = Math.max(...(s?.daily ?? []).map(d => d.visits), 1);
  return <section className="adm-card visits-card">
    <div className="adm-card-h"><div><h3>Website visits</h3><p>Store pages only · bots and admin excluded</p></div>
      <div className="adm-seg" role="group" aria-label="Visits range">{R.map(([v, l]) => <button key={v} aria-pressed={k === v} onClick={() => setK(v)}>{l}</button>)}</div></div>
    {err ? <p className="muted">{err}</p> : !s ? <p className="muted">Loading…</p> : <>
      <div className="visits-kpis">
        <div><b>{n(s.visits)}</b><span>Visits</span></div>
        <div><b>{n(s.visitors)}</b><span>Unique visitors</span></div>
        <div><b>{n(s.pageviews)}</b><span>Page views</span></div>
        <div><b>{s.visits ? (s.pageviews / s.visits).toFixed(1) : '—'}</b><span>Pages / visit</span></div>
      </div>
      {k !== 'today' && s.daily.length > 0 && <div className="visits-bars" aria-label="Visits per day">{s.daily.map(d => <i key={d.day} style={{ height: `${Math.max(4, (d.visits / max) * 100)}%` }} title={`${new Date(d.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${d.visits} visits, ${d.pageviews} page views`} />)}</div>}
      {s.top_pages.length > 0 && <div className="visits-top"><small className="muted">Top pages</small>{s.top_pages.map(p => <div key={p.path}><span>{p.path}</span><b>{n(p.views)}</b></div>)}</div>}
      {s.visits === 0 && <p className="muted" style={{ marginTop: 8 }}>No visits recorded in this period yet.</p>}
    </>}
  </section>;
}
