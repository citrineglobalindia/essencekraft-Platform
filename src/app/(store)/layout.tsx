import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Attribution } from '@/components/Attribution';
import { BottomNav } from '@/components/BottomNav';
import { getCategories, getConcerns, getProducts, getSettings } from '@/lib/data';
import { SITE_URL } from '@/lib/format';

export const revalidate = 60;

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [products, concerns, categories, settings] = await Promise.all([getProducts(), getConcerns(), getCategories(), getSettings()]);
  const index = products.map(p => ({ slug: p.slug, name: p.name, tagline: p.tagline ?? '', botanical: p.botanical_name ?? '', color: p.color, concerns: p.concerns }));
  const org = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', name: 'EssenceKraft', url: SITE_URL },
    { '@type': 'WebSite', name: 'EssenceKraft', url: SITE_URL, potentialAction: { '@type': 'SearchAction', target: `${SITE_URL}/shop?q={q}`, 'query-input': 'required name=q' } },
  ] };
  return <>
    <a href="#main" className="sr">Skip to content</a>
    <div className="announce"><div className="wrap">{settings.announcement.map(a => <span key={a}>{a}</span>)}</div></div>
    <Header index={index} nav={{ concerns: concerns.map(c => ({ slug: c.slug, name: c.name, color: c.color })), categories: categories.map(c => ({ slug: c.slug, name: c.name })) }} />
    <main id="main">{children}</main>
    <Footer />
    <BottomNav />
    <CartDrawer freeShip={settings.free_shipping_min} />
    <Attribution />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} />
  </>;
}
