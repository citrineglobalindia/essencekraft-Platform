import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPage, listPages } from '@/lib/pages';
import { SitePageView, pageMeta } from '@/components/SitePageView';

// Top-level content pages migrated from essencekraft.in: /faq, /contact, /privacy, /terms, /shipping, /essential-oils-for-*, /aromatherapy …
export const revalidate = 600;
export const dynamicParams = true;
export async function generateStaticParams() { return (await listPages()).filter(p => p.path.split('/').length === 2 && p.path !== '/learn').map(p => ({ page: p.path.slice(1) })); }
export async function generateMetadata({ params }: { params: { page: string } }): Promise<Metadata> { const p = await getPage(`/${params.page}`); return p ? pageMeta(p) : {}; }
export default async function Page({ params }: { params: { page: string } }) {
  if (!/^[a-z0-9-]+$/.test(params.page)) notFound();
  const p = await getPage(`/${params.page}`); if (!p) notFound();
  return <SitePageView p={p} />;
}
