'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SearchIcon, FlaskIcon } from './Icons';

type Card = { slug: string; title: string; category: string; subcategory: string; readTime: string; author: string; publishedDate: string };
const PAGE = 36;

export function WikiDirectory({ entries, categories }: { entries: Card[]; categories: string[] }) {
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [shown, setShown] = useState(PAGE);
  const list = useMemo(() => { const s = q.toLowerCase(); return entries.filter(e => (cat === 'All' || e.category === cat) && (e.title.toLowerCase().includes(s) || e.category.toLowerCase().includes(s) || e.subcategory.toLowerCase().includes(s))); }, [q, cat, entries]);
  const reset = () => setShown(PAGE);
  return <>
    <section className="wiki-hero">
      <div className="wrap wiki-hero-in">
        <span className="wiki-pill"><FlaskIcon size={14} /> EssenceKraft Botanical Encyclopedia</span>
        <h1>Botanical Knowledge &amp; <span>Clinical Research</span></h1>
        <p>Over 1,200 peer-reviewed botanical articles, laboratory testing protocols, and practical usage guides compiled by Lead Clinical Aromatherapist EssenceKraft Team.</p>
        <div className="wiki-search">
          <SearchIcon size={20} />
          <input type="search" aria-label="Search encyclopedia" placeholder="Search 1,200+ topics (e.g. hair growth, lavender sleep, dilution ratio)..." value={q} onChange={e => { setQ(e.target.value); reset(); }} />
          {q && <button onClick={() => { setQ(''); reset(); }}>CLEAR</button>}
        </div>
        <p className="wiki-count" aria-live="polite">Showing {list.length} of {entries.length} encyclopedia entries</p>
      </div>
    </section>
    <section className="wrap section">
      <div className="wiki-chips" role="group" aria-label="Filter by category">
        <button aria-pressed={cat === 'All'} onClick={() => { setCat('All'); reset(); }}>All Topics ({entries.length})</button>
        {categories.map(c => <button key={c} aria-pressed={cat === c} onClick={() => { setCat(c); reset(); }}>{c}</button>)}
      </div>
      <div className="wiki-team">
        <div className="wiki-team-l">
          <span className="wiki-logo" aria-hidden>ek</span>
          <div><h3>EssenceKraft Research Team <span className="pill green">Lead Botanical Researchers</span></h3>
            <p className="muted">Every article in this encyclopedia contains laboratory protocols, spectrophotometric observation notes, and safety dilution math reviewed for maximum trust and clinical precision.</p></div>
        </div>
        <span className="wiki-verified"><FlaskIcon size={16} />1,200+ Articles Verified</span>
      </div>
      {list.length ? <>
        <div className="wiki-grid">
          {list.slice(0, shown).map(e => (
            <Link key={e.slug} href={`/wiki/${e.slug}`} className="wiki-card">
              <div className="wiki-card-top"><span className="wiki-tag">{e.category}</span><span className="muted">{e.readTime}</span></div>
              <h3>{e.title}</h3>
              <div className="wiki-card-foot"><span>By {e.author} • {e.publishedDate}</span><b>Read Article →</b></div>
            </Link>))}
        </div>
        <div className="wiki-more">
          {shown < list.length
            ? <button className="btn btn-ghost" onClick={() => setShown(s => s + PAGE * 2)}>Load more ({list.length - shown} remaining)</button>
            : <p><b>Showing all {list.length} entries in the Botanical Encyclopedia</b></p>}
        </div>
      </> : (
        <div className="empty panel"><h3>No encyclopedia topics match your search</h3><p className="muted">Try searching for keywords like &quot;hair&quot;, &quot;skin&quot;, &quot;lavender&quot;, or &quot;dilution&quot;.</p><button className="btn btn-ghost" onClick={() => setQ('')}>Clear Search Filter</button></div>
      )}
    </section>
  </>;
}
