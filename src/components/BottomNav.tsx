'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { CartIcon, HeartIcon, SearchIcon } from './Icons';

const HomeIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></svg>;
const GridIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>;

// Mobile-only app-style tab bar. Hidden on PDP (sticky Add to Cart takes its place), cart and checkout.
export function BottomNav() {
  const path = usePathname(); const router = useRouter();
  const { count, setOpen, wishlist } = useCart();
  if (path.startsWith('/product/') || path.startsWith('/checkout') || path.startsWith('/cart') || path.startsWith('/order/')) return null;
  const focusSearch = () => {
    const go = () => { const i = document.querySelector<HTMLInputElement>('.mobile-search input'); if (i) { window.scrollTo({ top: 0, behavior: 'smooth' }); i.focus({ preventScroll: true }); } };
    if (path === '/' || path.startsWith('/shop') || path.startsWith('/concern')) go(); else { router.push('/shop'); setTimeout(go, 400); }
  };
  const is = (p: string) => (p === '/' ? path === '/' : path.startsWith(p));
  return (
    <nav className="bottom-nav" aria-label="Quick navigation">
      <Link href="/" aria-current={is('/') ? 'page' : undefined}><HomeIcon /><span>Home</span></Link>
      <Link href="/shop" aria-current={is('/shop') || is('/concern') ? 'page' : undefined}><GridIcon /><span>Shop</span></Link>
      <button type="button" onClick={focusSearch}><SearchIcon /><span>Search</span></button>
      <Link href="/wishlist" aria-current={is('/wishlist') ? 'page' : undefined}><span className="bn-ic"><HeartIcon />{wishlist.length > 0 && <b className="badge-count">{wishlist.length}</b>}</span><span>Wishlist</span></Link>
      <button type="button" onClick={() => setOpen(true)}><span className="bn-ic"><CartIcon />{count > 0 && <b className="badge-count">{count}</b>}</span><span>Cart</span></button>
    </nav>
  );
}
