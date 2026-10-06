import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildArticle, getEntry, getRefs, related, wikiIndex, productSlugFor } from '@/lib/wiki';
import { getWikiOverrides } from '@/lib/growth';
import { getProducts } from '@/lib/data';
import { inr, SITE_URL } from '@/lib/format';
import { Bottle } from '@/components/Bottle';
import { FlaskIcon } from '@/components/Icons';

export const dynamicParams = false;
export const revalidate = 300; // picks up encyclopedia edits published from admin
export function generateStaticParams() { return wikiIndex.map(e => ({ slug: e.slug })); }

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const e = getEntry(params.slug); if (!e) return {};
  const a = buildArticle(e, (await getWikiOverrides())[e.slug]);
  return { title: { absolute: a.meta.title }, description: a.meta.description, alternates: { canonical: `/wiki/${e.slug}` },
    openGraph: { type: 'article', title: e.title, description: a.meta.description } };
}

const H = ({ html, className }: { html: string; className?: string }) => <div className={`wiki-html ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html }} />;

export default async function WikiArticle({ params }: { params: { slug: string } }) {
  const e = getEntry(params.slug); if (!e) notFound();
  const ov = (await getWikiOverrides())[e.slug];
  const a = buildArticle(e, ov); const refs = getRefs(e.slug); const rel = related(e.slug, 6);
  const products = await getProducts();
  const pslug = e.product ? productSlugFor(e.product.name) : null;
  const shopP = pslug ? products.find(p => p.slug === pslug) : undefined;
  const ld = [
    { '@context': 'https://schema.org', '@type': 'TechArticle', headline: e.title, description: a.meta.description, author: { '@type': 'Organization', name: 'EssenceKraft Team' }, publisher: { '@type': 'Organization', name: 'EssenceKraft' }, datePublished: e.publishedDate, mainEntityOfPage: `${SITE_URL}/wiki/${e.slug}` },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: 'Encyclopedia', item: `${SITE_URL}/categories` }, { '@type': 'ListItem', position: 3, name: e.category, item: `${SITE_URL}/categories` }, { '@type': 'ListItem', position: 4, name: e.title }] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: a.faq.items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ];
  return (
    <article className="wiki">
      <header className="wiki-head">
        <div className="wrap wiki-narrow">
          <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><Link href="/categories">Encyclopedia</Link><span aria-hidden>/</span><span>{e.category}</span><span aria-hidden>/</span><span aria-current="page">{e.subcategory}</span></nav>
          <span className="wiki-tag big"><FlaskIcon size={13} />{e.category} • {e.subcategory}</span>
          <h1>{ov?.title || e.title}</h1>
          <div className="wiki-byline">
            <div className="wiki-byline-l">
              <span className="wiki-logo" aria-hidden>ek</span>
              <div><b>{a.meta.author}</b> <span className="pill green">Verified Expert</span><br /><span className="muted">{a.meta.authorTitle}</span>
                <details className="wiki-bio"><summary>View Credentials &amp; Bio</summary><p>{a.meta.authorBio}</p></details></div>
            </div>
            <dl><div><dt>Published:</dt><dd>{e.publishedDate}</dd></div><div><dt>Read Time:</dt><dd>{e.readTime}</dd></div><div><dd className="pill green">Peer-Reviewed Protocol</dd></div></dl>
          </div>
        </div>
      </header>

      <div className="wrap wiki-narrow wiki-body">
        <nav className="wiki-toc" aria-label="Table of contents"><h2>Table of Contents</h2><ol>{a.toc.map(([id, l]) => <li key={id}><a href={`#${id}`}>{l}</a></li>)}</ol></nav>

        <section id="overview" className="wiki-sec"><h2>{a.overview.h2}</h2><H html={a.overview.content} /><p className="wiki-highlight">💡 {a.overview.highlight}</p></section>

        <section id="dr-notes" className="wiki-sec dark"><h2>{a.drNotes.h2}</h2><p className="wiki-lab">EssenceKraft Botanical Laboratory Observations • Mysuru Unit</p><H html={a.drNotes.content} /><blockquote>{a.drNotes.quote}</blockquote></section>

        <section id="biochemistry" className="wiki-sec"><h2>{a.biochemistry.h2}</h2><H html={a.biochemistry.content} />
          <div className="table-wrap"><table><thead><tr><th>Active Chemical Constituent</th><th>Biological / Sensory Function</th><th>Typical Concentration</th></tr></thead>
            <tbody>{a.biochemistry.table.map((r, i) => <tr key={i}><td><b>{r.constituent}</b></td><td>{r.function}</td><td>{r.percent}</td></tr>)}</tbody></table></div></section>

        <section id="protocol" className="wiki-sec"><h2>{a.protocol.h2}</h2><p>{a.protocol.intro}</p>
          <ol className="wiki-steps">{a.protocol.steps.map(s => <li key={s.n}><span>{s.n}</span><div><h3>{s.title}</h3><p>{s.desc}</p></div></li>)}</ol></section>

        <section id="casestudy" className="wiki-sec"><h2>{a.caseStudy.h2}</h2><h3 className="wiki-cs">🔬 {a.caseStudy.title}</h3><H html={a.caseStudy.content} /></section>

        <section id="safety" className="wiki-sec"><h2>{a.safety.h2}</h2><H html={a.safety.content} />
          <div className="table-wrap"><table><thead><tr><th>Dilution Target</th><th>Volumetric Ratio (15 mL Carrier)</th><th>Recommended Application</th></tr></thead>
            <tbody>{a.safety.table.map(r => <tr key={r[0]}><td><b>{r[0]}</b></td><td>{r[1]}</td><td>{r[2]}</td></tr>)}</tbody></table></div>
          <div className="safety"><strong>⚠️ Safety Precautions &amp; Contraindications:</strong><ul>{a.safety.warnings.map(w => <li key={w}>{w}</li>)}</ul></div></section>

        <section id="faq" className="wiki-sec"><h2>{a.faq.h2}</h2>{a.faq.items.map((f, i) => <details key={i} className="acc"><summary>{f.q}</summary><div><p>{f.a}</p></div></details>)}</section>

        {e.product && <section id="product" className="wiki-prod">
          <div className="wiki-prod-art" aria-hidden><Bottle color={shopP?.color ?? '#3e7b4f'} label={e.product.name} /></div>
          <div><span className="hero-eyebrow">RECOMMENDED PURE EXTRACT</span><h2>{e.product.name}</h2>
            <p>100% Pure, Steam-Distilled Botanical Extract. Ethically sourced and lab-verified by EssenceKraft Team. Bottled in light-blocking amber glass.</p>
            {shopP && <p className="wiki-price">{inr(shopP.variants[0].price)}</p>}
            <Link className="btn" href={shopP ? `/product/${shopP.slug}` : '/shop'}>Shop Pure Extract →</Link></div>
        </section>}

        {refs.length > 0 && <section className="wiki-sec"><h2>External Botanical &amp; Scientific References</h2>
          <p className="muted">EssenceKraft&apos;s analysis incorporates empirical literature from the following peer-reviewed scientific repositories and botanical databases:</p>
          <div className="wiki-refs">{refs.map(r => <a key={r.url + r.name} href={r.url} target="_blank" rel="noopener noreferrer"><b>{r.name}</b><span>{r.domain}</span><p>{r.desc}</p></a>)}</div></section>}

        <section className="wiki-sec plain"><h2>Related Encyclopedia Topics</h2><p className="muted">Explore interconnected botanical studies and practical guides in our knowledge base:</p>
          <div className="wiki-grid">{rel.map(r => <Link key={r.slug} href={`/wiki/${r.slug}`} className="wiki-card"><span className="wiki-tag">{r.category}</span><h3>{r.title}</h3><div className="wiki-card-foot"><span>{r.publishedDate}</span><b>Read →</b></div></Link>)}</div></section>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </article>
  );
}
