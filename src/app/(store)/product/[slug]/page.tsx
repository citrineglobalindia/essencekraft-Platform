import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProduct, getProducts, getConcerns } from '@/lib/data';
import { Gallery, ProductBuy } from '@/components/ProductBuy';
import { ProductCard } from '@/components/ProductCard';
import { SITE_URL } from '@/lib/format';

export async function generateStaticParams() { return (await getProducts()).map(p => ({ slug: p.slug })); }
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProduct(params.slug);
  if (!p) return {};
  return { title: { absolute: p.seo_title ?? p.name }, description: p.seo_description ?? p.tagline ?? undefined, alternates: { canonical: `/product/${p.slug}` },
    openGraph: { title: p.name, description: p.tagline ?? undefined, images: p.images[0] ? [p.images[0]] : undefined } };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [p, all, concerns] = await Promise.all([getProduct(params.slug), getProducts(), getConcerns()]);
  if (!p) notFound();
  const carrier = p.category !== 'carrier-oils' ? all.find(x => x.category === 'carrier-oils') : null;
  const related = all.filter(x => x.id !== p.id && x.concerns.some(c => p.concerns.includes(c))).slice(0, 4);
  const v = p.variants[0];
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Product', name: p.name, description: p.description, sku: v?.sku, brand: { '@type': 'Brand', name: 'EssenceKraft' }, image: p.images.length ? p.images : undefined,
      offers: p.variants.map(x => ({ '@type': 'Offer', sku: x.sku, price: x.price, priceCurrency: 'INR', url: `${SITE_URL}/product/${p.slug}`,
        availability: x.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' })),
      ...(p.review_count > 0 ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: p.rating, reviewCount: p.review_count } } : {}) },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Shop', item: `${SITE_URL}/shop` },
      { '@type': 'ListItem', position: 3, name: p.name, item: `${SITE_URL}/product/${p.slug}` }] },
  ] };
  const facts = [['Botanical name', p.botanical_name], ['Extraction', p.extraction], ['Aroma', p.aroma], ['Origin', p.origin]].filter(([, x]) => x);
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><Link href={`/shop?category=${p.category}`}>Shop</Link><span aria-hidden>/</span><span aria-current="page">{p.name}</span></nav>
      <div className="pdp">
        <Gallery p={p} />
        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <ProductBuy p={p} pairWith={carrier} />
          <dl className="facts">{facts.map(([k, x]) => <div key={k}><dt>{k}</dt><dd>{x}</dd></div>)}</dl>
          {p.safety && <div className="safety" role="note"><strong>Safety &amp; dilution</strong>{p.safety}</div>}
          <div>
            <details className="acc" open><summary>About this oil</summary><div><p>{p.description}</p></div></details>
            {p.uses.length > 0 && <details className="acc"><summary>How to use</summary><div><ul>{p.uses.map(u => <li key={u}>{u}</li>)}</ul></div></details>}
            {p.suggested_blends.length > 0 && <details className="acc"><summary>Blends well with</summary><div><p>{p.suggested_blends.join(', ')}</p></div></details>}
            {p.purity && <details className="acc"><summary>Purity &amp; testing</summary><div><p>{p.purity}</p></div></details>}
            <details className="acc"><summary>Good for</summary><div><p>{p.concerns.map(c => { const x = concerns.find(y => y.slug === c); return x ? <Link key={c} href={`/concern/${c}`} className="chip" style={{ display: 'inline-block', margin: '0 6px 6px 0' }}>{x.name}</Link> : null; })}</p></div></details>
          </div>
        </div>
      </div>
      {related.length > 0 && <section className="section"><div className="section-head"><h2>You may also like</h2></div><div className="grid">{related.map(r => <ProductCard key={r.id} p={r} list="related" />)}</div></section>}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </div>
  );
}
