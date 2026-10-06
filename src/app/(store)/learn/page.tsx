import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPage, listPages } from '@/lib/pages';
import { SitePageView, pageMeta } from '@/components/SitePageView';

export const revalidate = 600;
export async function generateMetadata(): Promise<Metadata> { const p = await getPage('/learn'); return p ? pageMeta(p) : { title: 'Learn' }; }
export default async function Learn() {
  const [p, all] = await Promise.all([getPage('/learn'), listPages()]);
  if (!p) notFound();
  const guides = all.filter(x => x.kind === 'guide'); const hubs = all.filter(x => x.kind === 'landing');
  return <>
    <div className="wrap section" style={{ paddingBottom: 0 }}>
      <h2 style={{ marginBottom: 14 }}>Our guides</h2>
      <div className="pg-cards">{guides.map(g => <Link key={g.path} href={g.path} className="pg-card"><span className="hero-eyebrow">{g.eyebrow}</span><b>{g.h1}</b><span className="link">Read guide →</span></Link>)}</div>
      <h2 style={{ margin: '28px 0 14px' }}>Shop by use</h2>
      <nav className="pg-chips">{hubs.map(h => <Link key={h.path} className="pg-chip" href={h.path}>{h.eyebrow?.replace(/ Hub$/, '') ?? h.h1}</Link>)}<Link className="pg-chip" href="/categories">Botanical Encyclopedia</Link></nav>
    </div>
    <SitePageView p={p} />
  </>;
}
