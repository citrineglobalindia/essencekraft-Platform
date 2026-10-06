import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, listPages } from '@/lib/pages';
import { SitePageView, pageMeta } from '@/components/SitePageView';

export const revalidate = 600;
export async function generateStaticParams() { return (await listPages()).filter(p => p.path.startsWith('/learn/')).map(p => ({ slug: p.path.slice(7) })); }
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> { const p = await getPage(`/learn/${params.slug}`); return p ? pageMeta(p) : {}; }
export default async function Guide({ params }: { params: { slug: string } }) {
  if (!/^[a-z0-9-]+$/.test(params.slug)) notFound();
  const p = await getPage(`/learn/${params.slug}`); if (!p) notFound();
  return <SitePageView p={p} />;
}
