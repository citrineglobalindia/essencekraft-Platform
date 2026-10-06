import Link from 'next/link';
import { getConcerns, getProducts, getSettings } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';
import { Hero } from '@/components/Hero';
import { LeadForm } from '@/components/LeadForm';
import { Bottle, Sprig } from '@/components/Bottle';

export default async function Home() {
  const [products, concerns, settings] = await Promise.all([getProducts(), getConcerns(), getSettings()]);
  const on = (k: string) => settings.sections[k] !== false;
  const best = products.filter(p => p.is_bestseller).slice(0, 4);
  const fresh = [...products].filter(p => p.is_new).sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '')).slice(0, 4);
  const bySlug = (s: string) => products.find(p => p.slug === s) ?? products[0];
  const slides = [
    { id: 'hero-pure', heading: settings.hero?.heading || '100% Pure Essential Oils', copy: settings.hero?.subheading || 'Natural care for a calmer mind, healthier skin, stronger hair and a more balanced you.', cta: settings.hero?.cta || 'Shop Essential Oils', href: settings.hero?.href || '/shop?category=essential-oils', ...pick(bySlug('lavender-essential-oil')) },
    { id: 'hero-hair', heading: 'Rosemary for hair routines', copy: 'Steam-distilled rosemary, ready to blend with jojoba for a weekly scalp massage.', cta: 'Shop Hair & Scalp', href: '/concern/hair-scalp', ...pick(bySlug('rosemary-essential-oil')) },
    { id: 'hero-focus', heading: 'Bright oils for busy days', copy: 'Peppermint, lemongrass and sweet orange for a fresher-smelling desk.', cta: 'Shop Focus & Energy', href: '/concern/focus-energy', ...pick(bySlug('peppermint-essential-oil')) },
  ];
  return <>
    <Hero slides={slides} />

    {on('concerns') && <section className="section wrap" aria-labelledby="concern-h">
      <div className="section-head"><div><h2 id="concern-h">Shop by Concern</h2><p className="muted">Solutions for your everyday wellness goals.</p></div><Link className="btn btn-ghost btn-pill" href="/shop">View all</Link></div>
      <div className="concerns">
        {concerns.map(c => <Link key={c.slug} href={`/concern/${c.slug}`} className="concern"><div className="art"><Sprig color={c.color} /></div><span>{c.name}</span></Link>)}
      </div>
    </section>}

    {on('bestsellers') && <section className="section wrap" aria-labelledby="best-h" style={{ paddingTop: 0 }}>
      <div className="section-head"><div><h2 id="best-h">Best Sellers</h2><p className="muted">Loved by thousands. Pure. Potent. Effective.</p></div><Link className="btn btn-ghost btn-pill" href="/shop?sort=best">View all</Link></div>
      <div className="grid">{best.map(p => <ProductCard key={p.id} p={p} list="best_sellers" />)}</div>
    </section>}

    {on('promos') && <section className="wrap promos">
      <div className="promo bundle"><div><h2>Bundle &amp; Save</h2><p className="muted" style={{ marginTop: 6 }}>Curated essential oil sets for your complete wellness routine.</p><Link className="btn btn-primary" href="/shop?offer=1">Shop offers</Link></div>
        <div className="promo-art" aria-hidden>{products.slice(0, 5).map(p => <Bottle key={p.id} color={p.color} />)}</div></div>
      <div className="promo learn"><div><h2>Explore Natural Wellness</h2><p className="muted" style={{ marginTop: 6 }}>Guides on dilution, blending and safe everyday use.</p><Link className="btn btn-primary" href="/pages/safe-use">Read the safe-use guide</Link></div>
        <div className="promo-art" aria-hidden style={{ width: 70 }}><Sprig color="#3e7b4f" /></div></div>
    </section>}

    {on('new_arrivals') && fresh.length > 0 && <section className="section wrap" aria-labelledby="new-h">
      <div className="section-head"><div><h2 id="new-h">New Arrivals</h2><p className="muted">The latest additions to our collection.</p></div><Link className="btn btn-ghost btn-pill" href="/shop?sort=new">View all</Link></div>
      <div className="grid">{fresh.map(p => <ProductCard key={p.id} p={p} list="new_arrivals" />)}</div>
    </section>}

    {on('newsletter') && <div className="wrap section" style={{ paddingTop: 0 }}><LeadForm /></div>}
  </>;
}
function pick(p: { color: string; name: string }) { return { color: p.color, name: p.name }; }
