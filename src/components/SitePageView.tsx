import type { Metadata } from 'next';
import Link from 'next/link';
import type { SitePage } from '@/lib/pages';
import { getProducts } from '@/lib/data';
import { ProductCard } from './ProductCard';
import { ContactForm } from './ContactForm';
import { DilutionCalculator } from './DilutionCalculator';
import { SITE_URL } from '@/lib/format';

export const pageMeta = (p: SitePage): Metadata => ({ title: { absolute: p.title }, description: p.description ?? undefined, alternates: { canonical: p.path }, openGraph: { title: p.title, description: p.description ?? undefined, url: `${SITE_URL}${p.path}` } });
const CRUMB: Record<string, [string, string]> = { guide: ['Learn', '/learn'], landing: ['Shop by use', '/shop'], category: ['Shop', '/shop'] };

export async function SitePageView({ p }: { p: SitePage }) {
  const all = p.products.length ? await getProducts() : [];
  const list = p.products.map(s => all.find(x => x.slug === s)).filter((x): x is NonNullable<typeof x> => !!x);
  const faqs = [...p.html.matchAll(/<summary>(.*?)<\/summary><p>(.*?)<\/p>/g)].map(m => ({ q: m[1].replace(/<[^>]+>/g, ''), a: m[2].replace(/<[^>]+>/g, '') }));
  const crumb = CRUMB[p.kind];
  const ld = [{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, ...(crumb ? [{ '@type': 'ListItem', position: 2, name: crumb[0], item: SITE_URL + crumb[1].split('?')[0] }] : []), { '@type': 'ListItem', position: crumb ? 3 : 2, name: p.h1, item: SITE_URL + p.path }] },
    ...(faqs.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : [])];
  return (
    <div className="pg-wrap">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="pg-hero"><div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span>{crumb && <><Link href={crumb[1]}>{crumb[0]}</Link><span>/</span></>}<span aria-current="page">{p.eyebrow ?? p.h1}</span></nav>
        {p.eyebrow && <span className="hero-eyebrow">{p.eyebrow}</span>}<h1>{p.h1}</h1>
      </div></header>
      <div className="wrap pg-body">
        {p.html.split('<div data-widget="dilution"></div>').map((part, i) => <div key={i} className="pg-part">{i > 0 && <DilutionCalculator />}<article className="pg" dangerouslySetInnerHTML={{ __html: part }} /></div>)}
        {p.path === '/contact' && <ContactForm />}
        {list.length > 0 && <section className="section" style={{ paddingTop: 8 }}><h2 style={{ marginBottom: 16 }}>Shop the oils</h2><div className="grid">{list.map(x => <ProductCard key={x.id} p={x} list={`page${p.path.replace(/\//g, '_')}`} />)}</div></section>}
        {['guide', 'landing', 'category', 'hub'].includes(p.kind) && <p className="pg-note">This information is for general wellness and cosmetic use only. It is not medical advice and is not intended to diagnose, treat, cure or prevent any disease. Always dilute essential oils, patch-test first, and consult a qualified practitioner if you are pregnant, nursing, have a medical condition or take medication.</p>}
      </div>
    </div>
  );
}
