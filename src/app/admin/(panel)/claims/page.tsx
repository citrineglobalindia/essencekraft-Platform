'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { PageHead, Stats, Saved } from '@/components/AdminUI';

type Flag = { severity: 'high' | 'medium' | 'low'; rule: string; term: string; count: number; snippet: string };
type C = { key: string; kind: 'wiki' | 'page'; ref: string; title: string; flags: Flag[]; severity: string; score: number; status: string; note: string | null; reviewed_at: string | null };
const ST: Record<string, [string, string]> = { pending: ['Pending', 'amber'], approved: ['Approved for ads', 'green'], needs_changes: ['Needs changes', 'red'], not_for_ads: ['Site only — not for ads', 'grey'] };
const SEV: Record<string, string> = { high: 'red', medium: 'amber', low: 'grey', none: 'green' };
const hi = (s: string, t: string) => { const i = s.toLowerCase().indexOf(t); return i < 0 ? s : <>{s.slice(0, i)}<mark>{s.slice(i, i + t.length)}</mark>{s.slice(i + t.length)}</>; };

export default function Claims() {
  const [rows, setRows] = useState<C[]>([]); const [f, setF] = useState({ sev: 'high', status: 'pending', kind: 'all', q: '', rule: '' }); const [open, setOpen] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [page, setPage] = useState(0);
  const load = useCallback(async () => { const all: C[] = []; for (let from = 0; ; from += 1000) { const { data } = await db().from('claim_reviews').select('*').order('score', { ascending: false }).range(from, from + 999); all.push(...((data ?? []) as C[])); if (!data || data.length < 1000) break; } setRows(all); }, []);
  useEffect(() => { load(); }, [load]);
  const rules = useMemo(() => { const m = new Map<string, number>(); rows.forEach(r => r.flags.forEach(x => m.set(x.rule, (m.get(x.rule) ?? 0) + 1))); return [...m.entries()].sort((a, b) => b[1] - a[1]); }, [rows]);
  const list = rows.filter(r => (f.sev === 'all' || r.severity === f.sev) && (f.status === 'all' || r.status === f.status) && (f.kind === 'all' || r.kind === f.kind)
    && (!f.rule || r.flags.some(x => x.rule === f.rule)) && (!f.q || `${r.title} ${r.ref}`.toLowerCase().includes(f.q.toLowerCase())));
  const shown = list.slice(page * 50, page * 50 + 50);
  const set = async (keys: string[], status: string, note?: string) => {
    for (let i = 0; i < keys.length; i += 100) { const { error } = await db().from('claim_reviews').update({ status, ...(note !== undefined ? { note } : {}) }).in('key', keys.slice(i, i + 100)); if (error) return setMsg({ t: 'error', m: error.message }); }
    setRows(rs => rs.map(r => keys.includes(r.key) ? { ...r, status, note: note ?? r.note, reviewed_at: new Date().toISOString() } : r)); setMsg({ t: 'ok', m: `${keys.length} item${keys.length > 1 ? 's' : ''} marked “${ST[status][0]}”.` }); };
  const link = (r: C) => r.kind === 'wiki' ? `/wiki/${r.ref}` : r.ref;
  const count = (k: string, v: string) => rows.filter(r => (r as unknown as Record<string, string>)[k] === v).length;
  return <>
    <PageHead title="Claims review" sub="Every encyclopedia article and content page is scanned for medical or unverifiable claims before you use it in ads (Drugs & Magic Remedies Act, ASCI, Meta/Google health policies). Approve, or send for edits.">
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('ads-approved-urls.csv', rows.filter(r => r.status === 'approved').map(r => ({ url: `https://www.essencekraft.in${link(r)}`, title: r.title, reviewed: r.reviewed_at, note: r.note })))}>Export ads-approved URLs</button>
    </PageHead>
    <Saved msg={msg} />
    <Stats items={[['High risk', count('severity', 'high'), 'amber'], ['Medium', count('severity', 'medium')], ['Low / none', count('severity', 'low') + count('severity', 'none')], ['Approved for ads', count('status', 'approved')], ['Needs changes', count('status', 'needs_changes')]]} />
    <section className="adm-card"><div className="adm-card-h"><div><h3>Most common issues</h3><p>Many come from repeated template wording — fixing that wording once clears hundreds of articles.</p></div></div>
      <div className="adm-chips">{rules.map(([r, n]) => <button key={r} className={`adm-chip${f.rule === r ? ' on' : ''}`} onClick={() => { setF({ ...f, rule: f.rule === r ? '' : r, sev: 'all' }); setPage(0); }}>{r} · {n}</button>)}</div></section>
    <div className="admin-bar" style={{ flexWrap: 'wrap', gap: 8 }}>
      <input className="input" style={{ maxWidth: 260 }} placeholder="Search title or URL" value={f.q} onChange={e => { setF({ ...f, q: e.target.value }); setPage(0); }} aria-label="Search" />
      <div className="adm-seg">{['high', 'medium', 'low', 'none', 'all'].map(k => <button key={k} aria-pressed={f.sev === k} onClick={() => { setF({ ...f, sev: k }); setPage(0); }} style={{ textTransform: 'capitalize' }}>{k}</button>)}</div>
      <select className="select" style={{ width: 'auto' }} value={f.status} onChange={e => { setF({ ...f, status: e.target.value }); setPage(0); }} aria-label="Status"><option value="all">Any status</option>{Object.entries(ST).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
      <select className="select" style={{ width: 'auto' }} value={f.kind} onChange={e => { setF({ ...f, kind: e.target.value }); setPage(0); }} aria-label="Type"><option value="all">Articles & pages</option><option value="wiki">Encyclopedia</option><option value="page">Site pages</option></select>
      {list.length > 0 && f.status !== 'approved' && (f.sev === 'none' || f.sev === 'low') && <button className="btn btn-ghost btn-sm" onClick={() => confirm(`Approve all ${list.length} low/no-risk items for ads?`) && set(list.map(r => r.key), 'approved')}>Approve all {list.length}</button>}
    </div>
    <p className="muted" style={{ fontSize: 13 }}>{list.length} items</p>
    <div className="claims">{shown.map(r => <article key={r.key} className="adm-card">
      <div className="adm-card-h"><div><span className={`pill ${SEV[r.severity]}`}>{r.severity}</span> <span className="pill">{r.kind === 'wiki' ? 'Encyclopedia' : 'Page'}</span> <span className={`pill ${ST[r.status][1]}`}>{ST[r.status][0]}</span>
        <h3 style={{ marginTop: 6 }}><a className="link" href={link(r)} target="_blank" rel="noopener">{r.title}</a></h3><p>{link(r)} · score {r.score}{r.reviewed_at && ` · reviewed ${fmtDate(r.reviewed_at)}`}</p></div></div>
      {r.flags.length > 0 && <ul className="claim-flags">{(open === r.key ? r.flags : r.flags.slice(0, 3)).map((x, i) => <li key={i}><span className={`pill ${SEV[x.severity]}`}>{x.rule}</span>{x.count > 1 && <small> ×{x.count}</small>}<p>{hi(x.snippet, x.term)}</p></li>)}</ul>}
      {r.flags.length > 3 && <button className="link" onClick={() => setOpen(open === r.key ? null : r.key)}>{open === r.key ? 'Show fewer' : `Show all ${r.flags.length} flags`}</button>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={() => set([r.key], 'approved')}>Approve for ads</button>
        <button className="btn btn-ghost btn-sm" onClick={() => { const n = prompt('What needs to change? (optional)', r.note ?? ''); if (n !== null) set([r.key], 'needs_changes', n); }}>Needs changes</button>
        <button className="btn btn-ghost btn-sm" onClick={() => set([r.key], 'not_for_ads')}>Site only</button>
        {r.kind === 'wiki' ? <Link className="btn btn-ghost btn-sm" href={`/admin/encyclopedia?slug=${r.ref}`}>Edit article</Link> : <Link className="btn btn-ghost btn-sm" href={`/admin/pages?path=${encodeURIComponent(r.ref)}`}>Edit page</Link>}
      </div>{r.note && <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>Note: {r.note}</p>}
    </article>)}</div>
    {list.length > 50 && <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><button className="btn btn-ghost btn-sm" disabled={!page} onClick={() => setPage(page - 1)}>← Prev</button><span className="muted">Page {page + 1} of {Math.ceil(list.length / 50)}</span><button className="btn btn-ghost btn-sm" disabled={(page + 1) * 50 >= list.length} onClick={() => setPage(page + 1)}>Next →</button></div>}
    <p className="muted" style={{ fontSize: 12.5 }}>Automated screening only — it highlights wording to check; a person decides. Approval here syncs to the encyclopedia editor’s “Claims review” field.</p>
  </>;
}
