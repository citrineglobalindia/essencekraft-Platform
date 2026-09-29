import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCategories, getConcerns, getProducts } from '@/lib/data';
import { Catalog } from '@/components/Catalog';
import { ProductCard } from '@/components/ProductCard';

export async function generateStaticParams() { return (await getConcerns()).map(c => ({ slug: c.slug })); }
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const c = (await getConcerns()).find(x => x.slug === params.slug);
  return c ? { title: `Essential Oils for ${c.name}`, description: c.intro, alternates: { canonical: `/concern/${c.slug}` } } : {};
}
export default async function ConcernPage({ params }: { params: { slug: string } }) {
  const [concerns, products, categories] = await Promise.all([getConcerns(), getProducts(), getCategories()]);
  const c = concerns.find(x => x.slug === params.slug);
  if (!c) notFound();
  const items = products.filter(p => p.concerns.includes(c.slug));
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><Link href="/shop">Shop</Link><span aria-hidden>/</span><span aria-current="page">{c.name}</span></nav>
      <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)' }}>{c.name}</h1>
      <p className="muted" style={{ margin: '6px 0 20px', maxWidth: '60ch' }}>{c.intro}</p>
      <Suspense fallback={<div className="grid g3">{items.map(p => <ProductCard key={p.id} p={p} />)}</div>}><Catalog products={items} concerns={concerns} categories={categories} lockedConcern={c.slug} /></Suspense>
    </div>
  );
}
