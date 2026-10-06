'use client';
import { useEffect, useMemo, useState } from 'react';
import { db, fmtDate } from '@/lib/admin';
import { PageHead, Stats, Saved } from '@/components/AdminUI';

type I = { slug: string; title: string; category: string };
type Ov = { slug: string; title: string | null; fields: Record<string, unknown>; status: string; claim_status: string; updated_at: string };
const FIELDS: [string, string][] = [['overview', '1. Executive summary'], ['highlightBox', 'Key finding (highlight box)'], ['drNotes', '2. Lab & clinical notes'], ['drQuote', 'Lab quote'], ['biochemistry', '3. Botanical chemistry'], ['step1Desc', 'Step 1 · Preparation'], ['step2Desc', 'Step 2 · Application'], ['step3Desc', 'Step 3 · Storage'], ['caseStudyContent', '5. Case study'], ['safetyContent', '6. Safety & dilution']];
const CLAIMY = /\b(cure|cures|treat|treats|heal|heals|clinical(ly)? (proven|study)|guarantee|prevents?|disease|doctor|phd|peer-reviewed|\d+%\s*(reduction|improvement))\b/i;
export default function Encyclopedia() {
  const [idx, setIdx] = useState<I[]>([]); const [ovs, setOvs] = useState<Ov[]>([]); const [q, setQ] = useState(''); const [cat, setCat] = useState('');
  const [sel, setSel] = useState<string | null>(null); const [title, setTitle] = useState(''); const [fields, setFields] = useState<Record<string, string>>({}); const [orig, setOrig] = useState<Record<string, string>>({});
  const [claim, setClaim] = useState('pending'); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const loadOv = () => db().from('wiki_overrides').select('*').order('updated_at', { ascending: false }).then(({ data }) => setOvs((data ?? []) as Ov[]));
  useEffect(() => { fetch('/api/wiki').then(r => r.json()).then(setIdx); loadOv(); const s = new URLSearchParams(window.location.search).get('slug'); if (s) setTimeout(() => open(s), 300); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const cats = useMemo(() => [...new Set(idx.map(i => i.category))], [idx]);
  const list = idx.filter(i => (!cat || i.category === cat) && i.title.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const open = async (slug: string) => { setMsg(null); setSel(slug);
    const r = await fetch(`/api/wiki?slug=${encodeURIComponent(slug)}`).then(x => x.json()); const o = ovs.find(x => x.slug === slug);
    const base: Record<string, string> = Object.fromEntries(FIELDS.map(([k]) => [k, typeof r.fields[k] === 'string' ? r.fields[k] : '']));
    setOrig(base); setFields({ ...base, ...Object.fromEntries(Object.entries(o?.fields ?? {}).map(([k, v]) => [k, String(v)])) }); setTitle(o?.title ?? r.entry.title); setClaim(o?.claim_status ?? 'pending'); };
  const save = async (status: string) => { if (!sel) return;
    const changed = Object.fromEntries(Object.entries(fields).filter(([k, v]) => v !== orig[k]));
    const base = idx.find(i => i.slug === sel)?.title;
    const { error } = await db().from('wiki_overrides').upsert({ slug: sel, title: title !== base ? title : null, fields: changed, status, claim_status: claim, updated_at: new Date().toISOString() });
    setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: status === 'published' ? `Published. /wiki/${sel} updates within 5 minutes.` : 'Draft saved — not visible on the site yet.' }); loadOv(); };
  const revert = async () => { if (!sel || !confirm('Remove all edits and go back to the original article?')) return; await db().from('wiki_overrides').delete().eq('slug', sel); await loadOv(); open(sel); setMsg({ t: 'ok', m: 'Reverted to the original.' }); };
  const flagged = Object.values(fields).some(v => CLAIMY.test(v)) || CLAIMY.test(title);
  return <>
    <PageHead title="Encyclopedia editor" sub="Edit any of the 1,239 articles. Edits are stored separately from the original, so you can always revert." />
    <Stats items={[['Articles', idx.length.toLocaleString('en-IN')], ['Edited & live', ovs.filter(o => o.status === 'published').length], ['Drafts', ovs.filter(o => o.status === 'draft').length], ['Claims approved', ovs.filter(o => o.claim_status === 'approved').length]]} />
    <Saved msg={msg} />
    <div className="adm-wiki">
      <aside className="adm-card"><input className="input" placeholder="Search 1,239 titles" value={q} onChange={e => setQ(e.target.value)} aria-label="Search articles" />
        <select className="select" style={{ marginTop: 8 }} value={cat} onChange={e => setCat(e.target.value)} aria-label="Category"><option value="">All categories</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
        <div className="adm-wiki-list">{list.map(i => { const o = ovs.find(x => x.slug === i.slug); return <button key={i.slug} aria-pressed={sel === i.slug} onClick={() => open(i.slug)}><b>{i.title}</b><small>{i.category}{o && <> · <span className={`pill ${o.status === 'published' ? 'green' : 'amber'}`}>{o.status === 'published' ? 'edited' : 'draft'}</span></>}</small></button>; })}</div>
        {ovs.length > 0 && <><p className="muted" style={{ fontSize: 12, margin: '12px 0 4px' }}>RECENTLY EDITED</p>{ovs.slice(0, 5).map(o => <button key={o.slug} className="link" style={{ display: 'block', fontSize: 13, padding: '3px 0' }} onClick={() => open(o.slug)}>{o.slug} · {fmtDate(o.updated_at)}</button>)}</>}
      </aside>
      {sel ? <section className="adm-card form-grid">
        <div className="adm-card-h"><div><h3>Editing</h3><p><a className="link" href={`/wiki/${sel}`} target="_blank" rel="noopener">/wiki/{sel} ↗</a></p></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button className="btn btn-ghost btn-sm" onClick={revert}>Revert</button><button className="btn btn-ghost btn-sm" onClick={() => save('draft')}>Save draft</button><button className="btn btn-primary btn-sm" onClick={() => save('published')}>Publish</button></div></div>
        {flagged && <p className="notice error">This text contains medical or clinical-sounding claims (e.g. “cure”, “clinically proven”, “PhD”). Review before publishing or using in ads.</p>}
        <div className="form-grid two"><div className="field span2"><label htmlFor="w-title">Title</label><input id="w-title" className="input" value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div className="field"><label htmlFor="w-claim">Claims review</label><select id="w-claim" className="select" value={claim} onChange={e => setClaim(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Needs changes</option></select></div></div>
        {FIELDS.map(([k, l]) => <div key={k} className="field"><label htmlFor={`w-${k}`}>{l} {fields[k] !== orig[k] && <span className="pill amber">changed</span>}</label>
          <textarea id={`w-${k}`} className="textarea" style={{ minHeight: k.startsWith('step') || k === 'drQuote' || k === 'highlightBox' ? 70 : 140 }} value={fields[k] ?? ''} onChange={e => setFields({ ...fields, [k]: e.target.value })} />
          {!orig[k] && <small className="muted">Empty in the original — the page shows standard template text here unless you write something.</small>}</div>)}
        <p className="muted" style={{ fontSize: 13 }}>Basic HTML is allowed (&lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, links).</p>
      </section> : <section className="adm-card"><p className="muted">Pick an article on the left to edit it.</p></section>}
    </div>
  </>;
}
