'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';
import { CartIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from './Icons';
import { Bottle } from './Bottle';
import { MobileMenu } from './MobileMenu';

export type SearchItem = { slug: string; name: string; tagline: string; botanical: string; color: string; concerns: string[] };
type Nav = { concerns: { slug: string; name: string; color?: string }[]; categories: { slug: string; name: string }[] };

function Search({ index, concerns, autoFocus, onDone }: { index: SearchItem[]; concerns: Nav['concerns']; autoFocus?: boolean; onDone?: () => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const term = q.trim().toLowerCase();
  const products = useMemo(() => term.length < 2 ? [] : index.filter(i =>
    [i.name, i.tagline, i.botanical, ...i.concerns].join(' ').toLowerCase().includes(term)).slice(0, 6), [term, index]);
  const cons = useMemo(() => term.length < 2 ? [] : concerns.filter(c => c.name.toLowerCase().includes(term) || c.slug.includes(term)), [term, concerns]);
  const links = [...cons.map(c => `/concern/${c.slug}`), ...products.map(p => `/product/${p.slug}`)];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const go = (href: string) => { setOpen(false); setQ(''); onDone?.(); router.push(href); };
  return (
    <div className="search-box" ref={box}>
      <form role="search" onSubmit={e => { e.preventDefault(); if (active >= 0 && links[active]) go(links[active]); else if (term) go(`/shop?q=${encodeURIComponent(q.trim())}`); }}>
        <SearchIcon size={18} />
        <input type="search" aria-label="Search products" placeholder="Search oils, concerns, botanicals…" value={q} autoFocus={autoFocus}
          role="combobox" aria-expanded={open && links.length > 0} aria-controls="search-suggest" aria-autocomplete="list"
          onChange={e => { setQ(e.target.value); setOpen(true); setActive(-1); }} onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, links.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, -1)); }
            if (e.key === 'Escape') setOpen(false);
          }} />
      </form>
      {open && term.length >= 2 && (
        <div className="suggest" id="search-suggest" role="listbox">
          {cons.length > 0 && <h5>Shop by concern</h5>}
          {cons.map((c, i) => <a key={c.slug} href={`/concern/${c.slug}`} role="option" aria-selected={active === i} onClick={e => { e.preventDefault(); go(`/concern/${c.slug}`); }}>{c.name}</a>)}
          {products.length > 0 && <h5>Products</h5>}
          {products.map((p, j) => (
            <a key={p.slug} href={`/product/${p.slug}`} role="option" aria-selected={active === cons.length + j} onClick={e => { e.preventDefault(); go(`/product/${p.slug}`); }}>
              <span style={{ width: 22, flex: 'none', display: 'block' }}><Bottle color={p.color} /></span><span><b>{p.name}</b><br /><small className="muted">{p.botanical}</small></span>
            </a>))}
          {links.length === 0 && <p style={{ padding: 14 }} className="muted">No matches for “{q}”. Try “sleep”, “hair” or “lavender”.</p>}
          {links.length > 0 && <a href={`/shop?q=${encodeURIComponent(q.trim())}`} onClick={e => { e.preventDefault(); go(`/shop?q=${encodeURIComponent(q.trim())}`); }}><b>See all results for “{q}”</b></a>}
        </div>
      )}
    </div>
  );
}

export function Header({ index, nav }: { index: SearchItem[]; nav: Nav }) {
  const { count, setOpen } = useCart();
  const [menu, setMenu] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  return (
    <header className="header">
      <div className="wrap">
        <div className="header-row">
          <button className="icon-btn menu-toggle" aria-label="Open menu" onClick={() => setMenu(true)}><MenuIcon /></button>
          <Link href="/" className="logo" aria-label="EssenceKraft home"><b>EssenceKraft</b><small>NATURE IN EVERY DROP</small></Link>
          <ul className="nav">
            <li><Link href="/shop?category=essential-oils">Essential Oils</Link>
              <div className="mega"><div><h4>Shop by concern</h4>{nav.concerns.map(c => <Link key={c.slug} href={`/concern/${c.slug}`}>{c.name}</Link>)}</div>
                <div><h4>Collections</h4><Link href="/shop?sort=best">Best sellers</Link><Link href="/shop?sort=new">New arrivals</Link><Link href="/shop">All products</Link></div></div></li>
            {nav.categories.filter(c => c.slug !== 'essential-oils').map(c => <li key={c.slug}><Link href={`/shop?category=${c.slug}`}>{c.name}</Link></li>)}
            <li><Link href="/concern/sleep-calm">Wellness</Link>
              <div className="mega" style={{ gridTemplateColumns: '200px' }}><div>{nav.concerns.map(c => <Link key={c.slug} href={`/concern/${c.slug}`}>{c.name}</Link>)}</div></div></li>
            <li><Link href="/categories">Learn</Link></li>
            <li><Link href="/shop?offer=1">Offers</Link></li>
          </ul>
          <div className="header-search"><Search index={index} concerns={nav.concerns} /></div>
          <div className="header-tools">
            <Link href="/wishlist" className="icon-btn only-desktop" aria-label="Wishlist"><HeartIcon /></Link>
            <Link href="/account" className="icon-btn only-desktop" aria-label="Account"><UserIcon /></Link>
            <button className="icon-btn" aria-label={`Cart, ${count} items`} onClick={() => setOpen(true)}><CartIcon />{count > 0 && <span className="badge-count">{count}</span>}</button>
          </div>
        </div>
        <div className="mobile-search"><Search index={index} concerns={nav.concerns} /></div>
      </div>
      <MobileMenu open={menu} onClose={closeMenu} nav={nav} />
    </header>
  );
}
