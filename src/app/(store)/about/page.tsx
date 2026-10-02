import type { Metadata } from 'next';
import Link from 'next/link';
import { LeafIcon, FlaskIcon, DropIcon, BoxIcon } from '@/components/Icons';
import { Bottle, Sprig } from '@/components/Bottle';
import { SITE_URL } from '@/lib/format';

// Content migrated verbatim from https://www.essencekraft.in/about (MIG-002: no rewriting).
export const metadata: Metadata = {
  title: { absolute: 'About Us — Our Story & Pure Promises | EssenceKraft' },
  description: 'Shop 100% pure, natural, steam-distilled essential oils and carrier oils from EssenceKraft. Premium quality Geranium, Rosemary, Tea Tree, Lavender, Eucalyptus, Jojoba, and more for mental clarity, stress relief, and natural wellness. Free shipping across India.',
  alternates: { canonical: '/about' },
};

const MISSION = [
  [LeafIcon, 'Sustainable Sourcing', 'We partner with growers who use sustainable harvest methods, ensuring the earth gives as much tomorrow as it does today.'],
  [DropIcon, 'Careful Distillation', 'Every batch is distilled with care, preserving the natural integrity and therapeutic properties of each botanical.'],
  [FlaskIcon, 'Protected Potency', 'Packaged in amber glass to shield your oils from light degradation, maintaining their full strength and aroma.'],
  [BoxIcon, 'Small Batch Focus', 'Quality over quantity — every bottle is checked, labeled, and ready to lift your mood or steady your focus.'],
] as const;

const PROMISES: [string, string, string, string[]][] = [
  ['Purity', 'No compromises, ever', 'Single-source essential oils with no additives or carrier oils unless explicitly specified on the label.',
    ['100% pure botanical extracts', 'No synthetic fragrances or fillers', 'Clear labeling of all ingredients', 'Batch-specific quality assurance']],
  ['Transparency', 'Complete clarity', 'We believe you deserve to know exactly what you\'re using. Every detail matters to us, and to you.',
    ['Full botanical names provided', 'Extraction methods documented', 'Lab reports available on request', 'Sourcing information disclosed']],
  ['Sustainability', 'For today and tomorrow', 'Responsible sourcing and eco-conscious packaging ensure we leave the planet better than we found it.',
    ['Ethically sourced botanicals', 'Sustainable harvest partnerships', 'Recyclable amber glass bottles', 'Minimal packaging waste']],
];

export default function About() {
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'About Us', item: `${SITE_URL}/about` }] };
  return (
    <div className="about">
      <section className="about-hero">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><span aria-current="page">About Us</span></nav>
          <div className="about-hero-grid">
            <div className="about-hero-copy">
              <span className="hero-eyebrow">OUR STORY</span>
              <h1>About essenceKRAFT</h1>
              <p className="about-lede">We started essenceKRAFT because everyday life needed a gentler edge.</p>
              <div className="about-since"><b>Since 2020</b><span>Crafting pure essential oils with intention</span></div>
            </div>
            <div className="about-hero-art" aria-hidden><div className="plinth" /><Bottle color="#7a5a9e" label="Lavender Essential Oil" /><Bottle color="#3f6b3a" label="Rosemary Essential Oil" /><Bottle color="#c2566e" label="Geranium Essential Oil" /></div>
          </div>
        </div>
      </section>

      <section className="wrap section about-split">
        <div>
          <span className="hero-eyebrow">WHY WE EXIST</span>
          <h2>A gentler edge for<br />everyday life</h2>
        </div>
        <div className="about-prose">
          <p>In a world that moves too fast, we believe in slowing down to appreciate the simple, natural things that bring us back to ourselves.</p>
          <p>essenceKRAFT was born from the personal experience of our founder, Shilpa — the discovery that pure, thoughtfully sourced aromatics could transform ordinary moments into opportunities for calm, focus, and self-care.</p>
          <p>What started as Shilpa&apos;s passion project in a small workshop has grown into a commitment to bring authentic essential oils to homes and studios everywhere, without the fuss or the false promises.</p>
        </div>
      </section>

      <section className="wrap">
        <dl className="about-stats">
          <div><dt>Pure Oils</dt><dd>100%</dd></div>
          <div><dt>Happy Customers</dt><dd>5K+</dd></div>
          <div><dt>Premium Oils</dt><dd>50+</dd></div>
        </dl>
      </section>

      <section className="wrap section">
        <div className="about-head">
          <span className="hero-eyebrow">OUR MISSION</span>
          <h2>Thoughtfully sourced,<br />lab-tested aromatics</h2>
          <p className="muted">We bring pure, tested essential oils to homes and studios — without the fuss. Our commitment goes beyond the bottle to every step of the journey.</p>
        </div>
        <div className="about-mission">
          {MISSION.map(([Icon, h, t]) => <article key={h}><i><Icon size={22} /></i><h3>{h}</h3><p>{t}</p></article>)}
        </div>
        <blockquote className="about-quote">Our promise is simple: bring thoughtfully sourced, lab-tested aromatics to your home — without compromising on quality, transparency, or sustainability.</blockquote>
      </section>

      <section className="about-promises">
        <div className="wrap section">
          <div className="about-head">
            <span className="hero-eyebrow">WHAT WE STAND FOR</span>
            <h2>Our Promises to You</h2>
            <p className="muted">Three pillars guide everything we do. These aren&apos;t just values — they&apos;re commitments we honor with every bottle we craft.</p>
          </div>
          <div className="about-pillars">
            {PROMISES.map(([h, sub, t, items]) => (
              <article key={h}>
                <div className="about-pillar-art" aria-hidden><Sprig color={h === 'Purity' ? '#7a5a9e' : h === 'Transparency' ? '#d99a1e' : '#3e7b4f'} /></div>
                <h3>{h}</h3><p className="about-sub">{sub}</p><p>{t}</p>
                <ul>{items.map(x => <li key={x}>{x}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="about-cta">
          <div>
            <h2>Because you deserve authentic essential oils</h2>
            <p>Every promise we make is backed by rigorous testing, ethical partnerships, and an unwavering commitment to quality.</p>
            <ul className="about-badges"><li><FlaskIcon size={18} />Certified pure by laboratory testing</li><li><LeafIcon size={18} />Trusted by thousands</li></ul>
          </div>
          <div className="about-cta-box">
            <h3>Experience the essenceKRAFT difference</h3>
            <p>Join thousands who trust our pure, sustainable essential oils</p>
            <div className="about-cta-btns"><Link className="btn btn-primary" href="/shop">Shop Our Collection</Link><Link className="btn btn-ghost" href="/pages/contact">Contact Us</Link></div>
          </div>
        </div>
        <p className="about-foot muted">Join thousands who trust essenceKRAFT for pure, sustainable essential oils</p>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
