'use client';
import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { SearchIcon, FlaskIcon, LeafIcon, DropIcon } from './Icons';
import { tileImg, cardImg } from '@/lib/wikiImages';

type Card = { slug: string; title: string; category: string; subcategory: string; readTime: string; author: string; publishedDate: string };
const PAGE = 24;
const QUICK = ['Hair growth', 'Sleep', 'Skin care', 'Diffuser', 'Relaxation', 'Dilution'];
const BookIcon = () => <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1z" /><path d="M12 6v14" /></svg>;
const ShieldIcon = () => <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
const Clock = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;

// Every word must appear somewhere (so "lavender sleep" works).
const matches = (e: Card, q: string) => { const h = `${e.title} ${e.category} ${e.subcategory}`.toLowerCase(); return q.toLowerCase().split(/\s+/).filter(Boolean).every(w => h.includes(w)); };

export function WikiDirectory({ entries, categories, counts = {} }: { entries: Card[]; categories: string[]; counts?: Record<string, number>; featured?: Card[] }) {
  const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [shown, setShown] = useState(PAGE);
  const results = useRef<HTMLElement>(null); const strip = useRef<HTMLDivElement>(null);
  const list = useMemo(() => entries.filter(e => (cat === 'All' || e.category === cat) && matches(e, q)), [q, cat, entries]);
  const toResults = () => setTimeout(() => results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  const pick = (c: string) => { setCat(c); setShown(PAGE); toResults(); };
  const search = (t: string) => { setQ(t); setCat('All'); setShown(PAGE); };
  const scroll = (d: number) => strip.current?.scrollBy({ left: d * strip.current.clientWidth * 0.8, behavior: 'smooth' });

  return <>
    <section className="ek-hero">
      <div className="ek-hero-media" aria-hidden><img src="/img/wiki/hero-botanical.webp" alt="" width={1000} height={698} fetchPriority="high" /></div>
      <div className="wrap ek-hero-in">
        <div className="ek-hero-copy">
          <span className="hero-eyebrow">ESSENCEKRAFT BOTANICAL ENCYCLOPEDIA</span>
          <h1>Pure Essential Oils <br />for a Healthier You</h1>
          <p>Discover natural solutions for wellness, beauty and everyday living.</p>
          <Link href="/shop?category=essential-oils" className="btn btn-primary btn-pill ek-cta">Explore Essential Oils →</Link>
          <form className="ek-search" role="search" onSubmit={e => { e.preventDefault(); toResults(); }}>
            <SearchIcon size={20} />
            <input type="search" aria-label="Search encyclopedia" placeholder="Search by oil name, benefit, concern or botanical..." value={q} onChange={e => search(e.target.value)} />
            <button aria-label="Search"><SearchIcon size={18} /></button>
          </form>
          <div className="ek-popular"><span>Popular:</span>{QUICK.map(t => <button key={t} type="button" aria-pressed={q.toLowerCase() === t.toLowerCase()} onClick={() => { search(t); toResults(); }}>{t}</button>)}</div>
        </div>
        <ul className="ek-badges" aria-label="Our promise">
          <li><i><LeafIcon size={22} /></i><span><b>100%</b> Pure Essential Oils</span></li>
          <li><i><DropIcon size={22} /></i><span>Nature Crafted</span></li>
          <li><i><FlaskIcon size={22} /></i><span>Therapeutic Wellness</span></li>
          <li><i><LeafIcon size={22} /></i><span>Ethically Sourced</span></li>
        </ul>
      </div>
    </section>

    <section className="ek-stats" aria-label="Encyclopedia at a glance">
      <div className="wrap">
        <div><BookIcon /><p><b>{entries.length.toLocaleString('en-IN')}</b><span>Articles</span></p></div>
        <div><LeafIcon size={34} /><p><b>{categories.length}</b><span>Botanicals</span></p></div>
        <div><FlaskIcon size={34} /><p><b>3-Step</b><span>Lab Protocols</span></p></div>
        <div><ShieldIcon /><p><b>1,200+</b><span>Articles Verified</span></p></div>
      </div>
    </section>

    <section className="wrap ek-sec">
      <div className="ek-head"><div><span className="hero-eyebrow">BROWSE BY BOTANICAL</span><h2>Choose an oil to explore</h2></div>
        <button className="btn btn-ghost btn-pill" onClick={() => pick('All')}>View All Oils →</button></div>
      <div className="ek-strip-wrap">
        <button className="ek-arrow left" aria-label="Scroll botanicals left" onClick={() => scroll(-1)}>‹</button>
        <div className="ek-strip" ref={strip} role="group" aria-label="Filter by botanical">
          <button className="ek-tile all" aria-pressed={cat === 'All'} onClick={() => pick('All')}>
            <img src="/img/wiki/tile-lavender.webp" alt="" loading="lazy" width={320} height={320} />
            <span className="ek-tile-txt"><b>All Oils</b><small>{entries.length} articles</small></span><i aria-hidden>→</i>
          </button>
          {categories.map(c => (
            <button key={c} className="ek-tile" aria-pressed={cat === c} onClick={() => pick(c)}>
              <img src={tileImg(c)} alt="" loading="lazy" width={320} height={320} />
              <span className="ek-tile-txt"><b>{c}</b><small>{counts[c]} articles</small></span>
            </button>))}
        </div>
        <button className="ek-arrow right" aria-label="Scroll botanicals right" onClick={() => scroll(1)}>›</button>
      </div>
    </section>

    <section className="wrap ek-sec">
      <div className="ek-team">
        <span className="ek-team-leaf l" aria-hidden><img src="/img/wiki/tile-peppermint.webp" alt="" loading="lazy" /></span>
        <span className="wiki-logo" aria-hidden>ek</span>
        <div className="ek-team-txt"><h3>EssenceKraft Research Team <span className="pill green">Lead Botanical Researchers</span></h3>
          <p>Every article in this encyclopedia contains laboratory protocols, spectrophotometric observation notes, and safety dilution math reviewed for maximum trust and clinical precision.</p></div>
        <Link href="/pages/purity" className="ek-verified"><FlaskIcon size={16} />1,200+ Articles Verified →</Link>
      </div>
    </section>

    <section className="wrap ek-sec" ref={results} style={{ scrollMarginTop: 120 }}>
      <div className="ek-head">
        <div><span className="hero-eyebrow">{cat === 'All' ? 'ALL TOPICS' : cat.toUpperCase()}</span>
          <h2>{q ? `Results for “${q}”` : cat === 'All' ? 'Latest from the encyclopedia' : `${cat} guides`}</h2></div>
        <div className="ek-head-r"><span aria-live="polite">Showing {list.length} of {entries.length} encyclopedia entries</span>
          {(cat !== 'All' || q) && <button className="link" onClick={() => { setCat('All'); setQ(''); }}>View All →</button>}</div>
      </div>
      {list.length ? <>
        <div className="ek-grid">
          {list.slice(0, shown).map(e => (
            <Link key={e.slug} href={`/wiki/${e.slug}`} className="ek-card">
              <img src={cardImg(e.category, e.slug)} alt="" loading="lazy" width={640} height={400} />
              <div className="ek-card-b">
                <div className="ek-card-top"><span className="ek-tag">{e.category}</span><span className="ek-time"><Clock />{e.readTime}</span></div>
                <h3>{e.title}</h3>
                <div className="ek-card-foot"><span>{e.publishedDate}</span><b>Read Article →</b></div>
              </div>
            </Link>))}
        </div>
        <div className="wiki-more">
          {shown < list.length
            ? <button className="btn btn-primary btn-pill" onClick={() => setShown(s => s + PAGE * 2)}>Load more · {list.length - shown} remaining</button>
            : <p><b>Showing all {list.length} entries in the Botanical Encyclopedia</b></p>}
        </div>
      </> : (
        <div className="empty panel"><h3>No encyclopedia topics match your search</h3><p className="muted">Try searching for keywords like &quot;hair&quot;, &quot;skin&quot;, &quot;lavender&quot;, or &quot;dilution&quot;.</p><button className="btn btn-ghost" onClick={() => setQ('')}>Clear Search Filter</button></div>
      )}
    </section>
  </>;
}
