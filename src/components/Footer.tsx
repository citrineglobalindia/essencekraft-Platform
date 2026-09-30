import Link from 'next/link';
import { WHATSAPP } from '@/lib/format';
import { FlaskIcon, LeafIcon, PinIcon } from './Icons';

const WaIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3z" /></svg>;

const GROUPS: [string, [string, string][]][] = [
  ['Shop', [['Essential oils', '/shop?category=essential-oils'], ['Carrier oils', '/shop?category=carrier-oils'], ['Best sellers', '/shop?sort=best'], ['Offers', '/shop?offer=1']]],
  ['Help', [['Track order', '/account'], ['Shipping', '/pages/shipping'], ['Returns', '/pages/returns'], ['Contact', '/pages/contact']]],
  ['Learn', [['Purity & testing', '/pages/purity'], ['Safe-use guide', '/pages/safe-use'], ['Our story', '/pages/about']]],
  ['Policies', [['Privacy', '/pages/privacy'], ['Terms', '/pages/terms'], ['Refunds', '/pages/refund']]],
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="logo logo-left"><b>EssenceKraft</b><small>NATURE IN EVERY DROP</small></span>
            <p>Pure essential and carrier oils, bottled in India.</p>
            <div className="footer-cta">
              <a className="btn btn-pill footer-wa" aria-label="Chat on WhatsApp" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener" data-track="whatsapp_click"><WaIcon /><span>Chat on WhatsApp</span></a>
              <a className="footer-mail" href="mailto:care@essencekraft.in">care@essencekraft.in</a>
            </div>
          </div>
          <nav className="footer-links" aria-label="Footer">
            {GROUPS.map(([h, links]) => (
              <div key={h}><h4>{h}</h4><ul>{links.map(([l, href]) => <li key={href}><Link href={href}>{l}</Link></li>)}</ul></div>
            ))}
          </nav>
          <nav className="footer-acc" aria-label="Footer links">
            {GROUPS.map(([h, links]) => (
              <details key={h}><summary>{h}</summary><ul>{links.map(([l, href]) => <li key={href}><Link href={href}>{l}</Link></li>)}</ul></details>
            ))}
          </nav>
        </div>
        <ul className="footer-trust" aria-label="Our promise">
          <li><LeafIcon size={18} />100% pure &amp; natural</li>
          <li><FlaskIcon size={18} />GC-MS tested batches</li>
          <li><PinIcon size={18} />Made in India</li>
          <li><span aria-hidden>₹</span>UPI · Cards · COD</li>
        </ul>
        <div className="footer-base">
          <p>© {new Date().getFullYear()} EssenceKraft. All rights reserved.</p>
          <p className="footer-note">Essential oils are not a substitute for medical advice.</p>
          <p className="footer-credit">Designed &amp; developed by <a href="https://stepstones.in" target="_blank" rel="noopener">Stepstones</a></p>
        </div>
      </div>
    </footer>
  );
}
