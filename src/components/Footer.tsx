import Link from 'next/link';
import { WHATSAPP } from '@/lib/format';
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
            <span className="logo logo-left"><b>EssenceKraft</b><small>NATURE IN EVERY DROP</small></span>
            <p>Pure essential and carrier oils, bottled in India.</p>
            <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" data-track="whatsapp_click">Chat on WhatsApp</a>
          </div>
          <div><h4>Shop</h4><Link href="/shop?category=essential-oils">Essential oils</Link><Link href="/shop?category=carrier-oils">Carrier oils</Link><Link href="/shop?sort=best">Best sellers</Link><Link href="/shop?offer=1">Offers</Link></div>
          <div><h4>Help</h4><Link href="/account">Track order</Link><Link href="/pages/shipping">Shipping</Link><Link href="/pages/returns">Returns</Link><Link href="/pages/contact">Contact</Link></div>
          <div><h4>Learn</h4><Link href="/pages/purity">Purity &amp; testing</Link><Link href="/pages/safe-use">Safe-use guide</Link><Link href="/pages/about">Our story</Link></div>
          <div><h4>Policies</h4><Link href="/pages/privacy">Privacy</Link><Link href="/pages/terms">Terms</Link><Link href="/pages/refund">Refunds</Link></div>
        </div>
        <div className="footer-base"><span>© {new Date().getFullYear()} EssenceKraft. All rights reserved.</span><span>Essential oils are not a substitute for medical advice.</span></div>
      </div>
    </footer>
  );
}
