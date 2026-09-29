import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { getCategories, getConcerns, getProducts } from '@/lib/data';
import { Catalog } from '@/components/Catalog';
import { ProductCard } from '@/components/ProductCard';

type SP = { [k: string]: string | undefined };
export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const cats = await getCategories();
  const cat = cats.find(c => c.slug === searchParams.category);
  return {
    title: cat ? `Buy ${cat.name} Online` : searchParams.q ? `Search: ${searchParams.q}` : 'Shop All Essential & Carrier Oils',
    description: cat?.intro ?? 'Browse pure essential oils, carrier oils, blends and diffusers.',
    alternates: { canonical: cat ? `/shop?category=${cat.slug}` : '/shop' },
    robots: searchParams.q ? { index: false, follow: true } : undefined, // SEO-012 internal search noindex
  };
}
export default async function Shop({ searchParams }: { searchParams: SP }) {
  const [products, concerns, categories] = await Promise.all([getProducts(), getConcerns(), getCategories()]);
  const cat = categories.find(c => c.slug === searchParams.category);
  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><span aria-current="page">{cat?.name ?? 'Shop'}</span></nav>
      <h1 style={{ fontSize: 'clamp(1.7rem, 4vw, 2.6rem)' }}>{cat?.name ?? (searchParams.q ? 'Search results' : 'All products')}</h1>
      <p className="muted" style={{ margin: '6px 0 20px', maxWidth: '60ch' }}>{cat?.intro ?? 'Pure essential oils, carrier oils and blends — every bottle undiluted and batch tested.'}</p>
      <Suspense fallback={<div className="grid g3">{products.map(p => <ProductCard key={p.id} p={p} />)}</div>}><Catalog products={products} concerns={concerns} categories={categories} /></Suspense>
    </div>
  );
}
