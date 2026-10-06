import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getLanding } from '@/lib/growth';
import { getProducts } from '@/lib/data';
import { ProductCard } from '@/components/ProductCard';

export const revalidate = 60;
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getLanding(params.slug); if (!p) return {};
  return { title: { absolute: p.seo_title || `${p.title} | EssenceKraft` }, description: p.seo_description ?? undefined, alternates: { canonical: `/lp/${p.slug}` } };
}
export default async function LandingPage({ params }: { params: { slug: string } }) {
  const [page, products] = await Promise.all([getLanding(params.slug), getProducts()]);
  if (!page) notFound();
  const cta = page.blocks.find(b => b.type === 'hero' && b.cta) as { cta?: string; href?: string } | undefined;
  return (
    <div className="lp">
      {page.blocks.map((b, i) => {
        if (b.type === 'hero') return <section key={i} className="lp-hero" style={b.image ? { ['--img' as string]: `url(${b.image})` } : undefined}><div className="wrap lp-hero-in"><h1>{b.heading}</h1>{b.sub && <p>{b.sub}</p>}{b.cta && <Link className="btn btn-primary btn-pill" href={b.href || '/shop'}>{b.cta} →</Link>}</div></section>;
        if (b.type === 'products') { const list = b.slugs.map(s => products.find(p => p.slug === s)).filter((p): p is NonNullable<typeof p> => !!p);
          return <section key={i} className="wrap section">{b.title && <h2 className="lp-h">{b.title}</h2>}<div className="grid">{list.map(p => <ProductCard key={p.id} p={p} list={`lp_${page.slug}`} />)}</div></section>; }
        if (b.type === 'benefits') return <section key={i} className="wrap section">{b.title && <h2 className="lp-h">{b.title}</h2>}<div className="lp-benefits">{b.items.map(x => <div key={x.title}><h3>{x.title}</h3><p>{x.text}</p></div>)}</div></section>;
        if (b.type === 'text') return <section key={i} className="wrap section lp-text">{b.title && <h2 className="lp-h">{b.title}</h2>}{b.body.split(/\n{2,}/).map((para, j) => <p key={j}>{para}</p>)}</section>;
        if (b.type === 'faq') return <section key={i} className="wrap section lp-text">{b.title && <h2 className="lp-h">{b.title}</h2>}{b.items.map(x => <details key={x.q} className="acc"><summary>{x.q}</summary><div><p>{x.a}</p></div></details>)}</section>;
        if (b.type === 'offer') return <section key={i} className="wrap section"><div className="lp-offer"><div><h2>{b.title}</h2>{b.body && <p>{b.body}</p>}{b.ends_at && <small>Ends {new Date(b.ends_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</small>}</div><div>{b.code && <code>{b.code}</code>}{b.cta && <Link className="btn btn-pill" href={b.href || '/shop'}>{b.cta} →</Link>}</div></div></section>;
        return null;
      })}
      {cta?.cta && <div className="lp-sticky"><Link className="btn btn-primary btn-block" href={cta.href || '/shop'}>{cta.cta}</Link></div>}
    </div>
  );
}
