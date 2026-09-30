'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { CloseIcon, HeartIcon, BoxIcon, TagIcon, LeafIcon } from './Icons';
import { WHATSAPP } from '@/lib/format';

type Nav = { concerns: { slug: string; name: string; color?: string }[]; categories: { slug: string; name: string }[] };

// Rendered into <body> via a portal: the sticky header uses backdrop-filter, which would otherwise
// trap position:fixed children inside the header box (the bug where the menu was clipped).
export function MobileMenu({ open, onClose, nav }: { open: boolean; onClose: () => void; nav: Nav }) {
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  useEffect(() => setMounted(true), []);
  useEffect(() => { onClose(); /* close on route change */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!mounted || !open) return null;
  return createPortal(<>
    <div className="scrim" onClick={onClose} />
    <nav className="drawer left mmenu" aria-label="Main menu" role="dialog" aria-modal="true">
      <div className="drawer-head">
        <span className="logo logo-left"><b style={{ fontSize: 22 }}>EssenceKraft</b><small>NATURE IN EVERY DROP</small></span>
        <button className="icon-btn" aria-label="Close menu" onClick={onClose}><CloseIcon /></button>
      </div>
      <div className="drawer-body" onClick={e => { if ((e.target as HTMLElement).closest('a')) onClose(); }}>
        <div className="mm-quick">
          <Link href="/shop?sort=best"><LeafIcon size={20} />Best sellers</Link>
          <Link href="/shop?sort=new"><BoxIcon size={20} />New</Link>
          <Link href="/shop?offer=1"><TagIcon size={20} />Offers</Link>
        </div>
        <h4 className="mm-h">Shop</h4>
        <div className="mm-list">
          <Link href="/shop">All products <span aria-hidden>›</span></Link>
          {nav.categories.map(c => <Link key={c.slug} href={`/shop?category=${c.slug}`}>{c.name} <span aria-hidden>›</span></Link>)}
        </div>
        <h4 className="mm-h">Shop by concern</h4>
        <div className="mm-chips">
          {nav.concerns.map(c => <Link key={c.slug} href={`/concern/${c.slug}`}><i style={{ background: c.color ?? 'var(--leaf)' }} />{c.name}</Link>)}
        </div>
        <h4 className="mm-h">Help</h4>
        <div className="mm-list">
          <Link href="/wishlist"><span style={{ display: 'flex', gap: 10, alignItems: 'center' }}><HeartIcon size={18} />Wishlist</span><span aria-hidden>›</span></Link>
          <Link href="/account">Track your order <span aria-hidden>›</span></Link>
          <Link href="/pages/safe-use">Safe-use guide <span aria-hidden>›</span></Link>
          <Link href="/pages/contact">Contact us <span aria-hidden>›</span></Link>
        </div>
      </div>
      <div className="drawer-foot">
        <a className="btn btn-primary btn-block" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" data-track="whatsapp_click">Chat with us on WhatsApp</a>
      </div>
    </nav>
  </>, document.body);
}
