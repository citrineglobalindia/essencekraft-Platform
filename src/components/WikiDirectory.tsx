'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { SearchIcon, FlaskIcon, LeafIcon, DropIcon } from './Icons';
import { Sprig, Bottle } from './Bottle';

type Card = { slug: string; title: string; category: string; subcategory: string; readTime: string; author: string; publishedDate: string };
const PAGE = 36;
export const CAT_COLOR: Record<string, string> = {
  'Essential Oils Overview': '#0f3d2e', 'Lavender Oil': '#7a5a9e', 'Peppermint Oil': '#3d8a68', 'Rosemary Oil': '#3f6b3a', 'Clary Sage Oil': '#8a7aa0',
  'Geranium Oil': '#c2566e', 'Eucalyptus Oil': '#5f8a7a', 'Tea Tree Oil': '#4f7a4a', 'Lemongrass Oil': '#8f9a2e', 'Cedarwood Oil': '#8a5d3b',
  'Holy Basil Oil': '#4a7a3a', 'Citronella Oil': '#a8902a', 'Orange Oil': '#d9741f', 'Bergamot Oil': '#a39232', 'Jojoba Oil': '#b8913a', Miscellaneous: '#6b6f6c',
};
const col = (c: string) => CAT_COLOR[c] ?? '#3e7b4f';
const QUICK = ['hair growth', 'sleep', 'dilution', 'skin', 'diffuser', 'safety'];

export function WikiDirectory({ entries, categories, counts, featured }: { entries: Card[]; categories: string[]; counts: Record<string, number>; featured: Card[] }) {
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [shown, setShown] = useState(PAGE);
  const results = useRef<HTMLDivElement>(null);
  const list = useMemo(() => { const s = q.toLowerCase(); return entries.filter(e => (cat === 'All' || e.category === cat) && (e.title.toLowerCase().includes(s) || e.category.toLowerCase().includes(s) || e.subcategory.toLowerCase().includes(s))); }, [q, cat, entries]);
  const pick = (c: string) => { setCat(c); setShown(PAGE); results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const browsing = !q && cat === 'All';

  return <>
    <section className="wk-hero">
      <svg className="wk-hero-leaves" viewBox="0 0 600 400" aria-hidden><g fill="none" stroke="currentColor" strokeWidth="1.2">
        {[[80, 330, -30], [520, 90, 150], [470, 340, -60], [140, 70, 120]].map(([x, y, r], i) => <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}><path d="M0 0 C40 -10 80 -10 120 0" />{[20, 45, 70, 95].map(t => <g key={t}><path d={`M${t} -2 c6 -18 22 -26 34 -26 c-4 14 -18 24 -34 26z`} /><path d={`M${t} 2 c6 18 22 26 34 26 c-4 -14 -18 -24 -34 -26z`} /></g>)}</g>)}
      </g></svg>
      <div className="wrap wk-hero-in">
        <span className="wiki-pill"><FlaskIcon size={14} /> EssenceKraft Botanical Encyclopedia</span>
        <h1>Botanical Knowledge &amp; <span>Clinical Research</span></h1>
        <p className="wk-lede">Over 1,200 peer-reviewed botanical articles, laboratory testing protocols, and practical usage guides compiled by Lead Clinical Aromatherapist EssenceKraft Team.</p>
        <div className="wk-search">
          <SearchIcon size={20} />
          <input type="search" aria-label="Search encyclopedia" placeholder="Search 1,200+ topics (e.g. hair growth, lavender sleep, dilution ratio)..." value={q} onChange={e => { setQ(e.target.value); setShown(PAGE); }} />
          {q && <button onClick={() => setQ('')}>CLEAR</button>}
        </div>
        <div className="wk-quick" aria-label="Popular searches"><span>Popular:</span>{QUICK.map(t => <button key={t} onClick={() => { setQ(t); setCat('All'); setShown(PAGE); }}>{t}</button>)}</div>
        <p className="wk-count" aria-live="polite">Showing {list.length} of {entries.length} encyclopedia entries</p>
        <dl className="wk-stats">
          <div><dt>Articles</dt><dd>{entries.length.toLocaleString('en-IN')}</dd></div>
          <div><dt>Botanicals</dt><dd>{categories.length}</dd></div>
          <div><dt>Lab protocols</dt><dd>3-step</dd></div>
        </dl>
      </div>
    </section>

    <section className="wrap wk-sec">
      <div className="wk-sec-head"><div><span className="hero-eyebrow">BROWSE BY BOTANICAL</span><h2>Choose an oil to explore</h2></div>
        {cat !== 'All' && <button className="btn btn-ghost btn-pill" onClick={() => pick('All')}>All Topics ({entries.length})</button>}</div>
      <div className="wk-cats" role="group" aria-label="Filter by category">
        <button className="wk-cat" aria-pressed={cat === 'All'} onClick={() => pick('All')} style={{ ['--c' as string]: '#0f3d2e' }}>
          <span className="wk-cat-art"><LeafIcon size={26} /></span><b>All Topics</b><small>{entries.length} articles</small></button>
        {categories.map(c => (
          <button key={c} className="wk-cat" aria-pressed={cat === c} onClick={() => pick(c)} style={{ ['--c' as string]: col(c) }}>
            <span className="wk-cat-art">{c === 'Essential Oils Overview' ? <DropIcon size={26} /> : c === 'Miscellaneous' ? <FlaskIcon size={24} /> : <Sprig color={col(c)} />}</span>
            <b>{c}</b><small>{counts[c]} articles</small>
          </button>))}
      </div>
    </section>

    {browsing && <section className="wrap wk-sec">
      <div className="wk-sec-head"><div><span className="hero-eyebrow">START HERE</span><h2>Essential reading</h2></div></div>
      <div className="wk-featured">
        {featured.map((e, i) => (
          <Link key={e.slug} href={`/wiki/${e.slug}`} className={`wk-feat${i === 0 ? ' big' : ''}`}>
            <div className="wk-feat-art" aria-hidden><Bottle color={['#7a5a9e', '#3f6b3a', '#c2566e', '#d9741f'][i % 4]} /></div>
            <div className="wk-feat-body"><span className="wk-tag" style={{ ['--c' as string]: col(e.category) }}>{e.category}</span><h3>{e.title}</h3>
              <span className="wk-meta">{e.readTime} · {e.publishedDate}</span><b className="wk-read">Read Article →</b></div>
          </Link>))}
      </div>
    </section>}

    <section className="wrap wk-sec" ref={results} style={{ scrollMarginTop: 140 }}>
      <div className="wiki-team">
        <div className="wiki-team-l">
          <span className="wiki-logo" aria-hidden>ek</span>
          <div><h3>EssenceKraft Research Team <span className="pill green">Lead Botanical Researchers</span></h3>
            <p className="muted">Every article in this encyclopedia contains laboratory protocols, spectrophotometric observation notes, and safety dilution math reviewed for maximum trust and clinical precision.</p></div>
        </div>
        <span className="wiki-verified"><FlaskIcon size={16} />1,200+ Articles Verified</span>
      </div>
      <div className="wk-sec-head"><div><span className="hero-eyebrow">{cat === 'All' ? 'ALL TOPICS' : cat.toUpperCase()}</span><h2>{q ? `Results for “${q}”` : cat === 'All' ? 'Latest from the encyclopedia' : `${cat} guides`}</h2></div>
        <span className="muted wk-num">{list.length} articles</span></div>
      {list.length ? <>
        <div className="wk-grid">
          {list.slice(0, shown).map(e => (
            <Link key={e.slug} href={`/wiki/${e.slug}`} className="wk-card" style={{ ['--c' as string]: col(e.category) }}>
              <div className="wk-card-top"><span className="wk-tag">{e.category}</span><span className="wk-time">{e.readTime}</span></div>
              <h3>{e.title}</h3>
              <span className="wk-sub">{e.subcategory}</span>
              <div className="wk-card-foot"><span>By {e.author} • {e.publishedDate}</span><b>Read Article →</b></div>
            </Link>))}
        </div>
        <div className="wiki-more">
          {shown < list.length
            ? <button className="btn btn-primary" onClick={() => setShown(s => s + PAGE * 2)}>Load more · {list.length - shown} remaining</button>
            : <p><b>Showing all {list.length} entries in the Botanical Encyclopedia</b></p>}
        </div>
      </> : (
        <div className="empty panel"><h3>No encyclopedia topics match your search</h3><p className="muted">Try searching for keywords like &quot;hair&quot;, &quot;skin&quot;, &quot;lavender&quot;, or &quot;dilution&quot;.</p><button className="btn btn-ghost" onClick={() => setQ('')}>Clear Search Filter</button></div>
      )}
    </section>
  </>;
}
