import type { Metadata } from 'next';
import Link from 'next/link';
import { wikiIndex, wikiCategories } from '@/lib/wiki';
import { WikiDirectory } from '@/components/WikiDirectory';

export const metadata: Metadata = {
  title: { absolute: 'Botanical Encyclopedia & Research Directory | EssenceKraft' },
  description: 'Browse the EssenceKraft Encyclopedia. Over 1,200 peer-reviewed botanical guides, clinical protocols, safety dilution matrices, and expert research by EssenceKraft Team.',
  alternates: { canonical: '/categories' },
};

export default function Categories() {
  const entries = wikiIndex.map(({ slug, title, category, subcategory, readTime, author, publishedDate }) => ({ slug, title, category, subcategory, readTime, author, publishedDate }));
  const counts: Record<string, number> = {}; entries.forEach(e => { counts[e.category] = (counts[e.category] ?? 0) + 1; });
  const featured = ['essential-oils', 'essential-oils-for-beginners', 'how-to-dilute-essential-oils', 'how-to-use-essential-oils-safely']
    .map(s => entries.find(e => e.slug === s)).filter((e): e is (typeof entries)[number] => !!e);
  return <>
    <WikiDirectory entries={entries} categories={wikiCategories} counts={counts} featured={featured} />
    {/* Crawlable index of every article (SEO-007) */}
    <nav className="wrap wiki-allindex" aria-label="All encyclopedia articles">
      <details><summary>Full A–Z index of all {entries.length} articles</summary>
        <ul>{[...entries].sort((a, b) => a.title.localeCompare(b.title)).map(e => <li key={e.slug}><Link href={`/wiki/${e.slug}`}>{e.title}</Link></li>)}</ul>
      </details>
    </nav>
  </>;
}
