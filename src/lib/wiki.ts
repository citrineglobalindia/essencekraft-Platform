import 'server-only';
import indexData from '../../data/wiki/index.json';
import contentData from '../../data/wiki/content.json';
import refsData from '../../data/wiki/refs.json';

// Botanical Encyclopedia — data imported verbatim by scripts/import-wiki.mjs.
// Section fallbacks below are copied from the original essencekraft.in article template so every page renders identically.
export type WikiEntry = { id: number; title: string; slug: string; category: string; subcategory: string; publishedDate: string; readTime: string; author: string; authorTitle: string; product?: { id: number; name: string; slug: string; price: number; image: string } };
type Body = Partial<{ overview: string; highlightBox: string; drNotes: string; drQuote: string; biochemistry: string; bioTable: { constituent: string; function: string; percent: string }[]; step1Desc: string; step2Desc: string; step3Desc: string; caseStudyContent: string; safetyContent: string; faq: { q: string; a: string }[] }>;
export type Ref = { name: string; url: string; domain: string; desc: string };

export const wikiIndex = indexData as WikiEntry[];
const bodies = contentData as Record<string, Body>;
const refs = refsData as Record<string, Ref[]>;

export const wikiCategories = (() => { const s: string[] = []; wikiIndex.forEach(e => { const c = e.category || 'General'; if (!s.includes(c)) s.push(c); }); return s; })();
export const getEntry = (slug: string) => wikiIndex.find(e => e.slug === slug) ?? null;
export const getRefs = (slug: string) => refs[slug] ?? [];

// Old site link targets → new routes (link targets only; visible text is unchanged).
const OLD_PRODUCT_IDS: Record<string, string> = { '1': 'rosemary', '4': 'jojoba', '5': 'lemongrass', '6': 'citronella', '8': 'holy basil', '9': 'lavender', '11': 'geranium', '12': 'tea tree', '13': 'cedarwood', '14': 'clary sage', '15': 'eucalyptus', '16': 'orange', '17': 'peppermint' };
export function productSlugFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes('holy basil') || n.includes('tulsi')) return 'tulsi-essential-oil';
  if (n.includes('jojoba')) return 'jojoba-carrier-oil';
  for (const k of ['rosemary', 'lemongrass', 'citronella', 'lavender', 'geranium', 'tea tree', 'cedarwood', 'clary sage', 'eucalyptus', 'orange', 'peppermint', 'bergamot'])
    if (n.includes(k)) return `${k.replace(' ', '-')}-essential-oil`;
  return null;
}
export function rewriteLinks(html: string) {
  return html
    .replace(/href="\/products\/(\d+)"/g, (_, id) => { const k = OLD_PRODUCT_IDS[id]; const s = k && productSlugFor(k); return `href="${s ? `/product/${s}` : '/shop'}"`; })
    .replace(/href="\/essential-oils"/g, 'href="/shop?category=essential-oils"')
    .replace(/href="\/carrier-oils"/g, 'href="/shop?category=carrier-oils"')
    .replace(/href="\/aromatherapy"/g, 'href="/categories"')
    .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
}

function oilName(title: string) {
  const d = title.toLowerCase();
  const map: [string, string][] = [['rosemary', 'Rosemary Essential Oil'], ['lavender', 'Lavender Essential Oil'], ['peppermint', 'Peppermint Essential Oil'], ['tea tree', 'Tea Tree Essential Oil'], ['jojoba', 'Jojoba Carrier Oil'], ['cedarwood', 'Cedarwood Essential Oil'], ['eucalyptus', 'Eucalyptus Essential Oil'], ['clary sage', 'Clary Sage Essential Oil'], ['geranium', 'Geranium Essential Oil'], ['orange', 'Orange Essential Oil'], ['citronella', 'Citronella Essential Oil'], ['lemongrass', 'Lemongrass Essential Oil'], ['bergamot', 'Bergamot Essential Oil']];
  for (const [k, v] of map) if (d.includes(k)) return v;
  if (d.includes('holy basil') || d.includes('tulsi')) return 'Holy Basil Essential Oil';
  return 'Essential Oil';
}

export function buildArticle(e: WikiEntry) {
  const i = e.title, t = e.category, h = bodies[e.slug] || {}, u = oilName(i);
  const title = (() => { let x = i.replace(/\s*\|\s*EssenceKraft/g, '').trim(); if (x.length > 42) x = x.substring(0, 40).trim() + '..'; else if (x.length < 18) x = `${x} Essential Oil Guide`; return `${x} | EssenceKraft`; })();
  const description = (() => { const x = h.overview ? `${i}: ${h.overview.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()}` : `${i}: Clinical research guide on ${i.toLowerCase()} in ${t.toLowerCase()} with dilution safety by EssenceKraft Research Lab.`; return x.length > 155 ? x.substring(0, 152).trim() + '...' : x; })();
  return {
    meta: { title, description, author: 'EssenceKraft Team', authorTitle: 'Botanical Chemistry & Aromatherapy Experts',
      authorBio: 'Our team holds expertise in Pharmacognosy & Botanical Chemistry. We have spent over 14 years researching steam distillation kinetics, terpene stability, and topical lipophilic transport mechanisms at EssenceKraft Laboratories.' },
    toc: [['overview', '1. Executive Summary & Purpose'], ['dr-notes', '2. EssenceKraft Lab & Trial Observations'], ['biochemistry', '3. Botanical Chemistry & Mechanism of Action'], ['protocol', '4. Tested 3-Step Botanical Protocol'], ['casestudy', '5. Real-World Clinical Case Study'], ['safety', '6. Dilution Mathematics & Safety Matrix'], ['faq', '7. Frequently Asked Questions'], ['product', '8. Lab-Grade EssenceKraft Recommendation']] as [string, string][],
    overview: { h2: '1. Executive Summary & Practical Purpose', content: rewriteLinks(h.overview || `Understanding <strong>${i}</strong> requires evaluating both traditional ethnobotanical applications and modern lipophilic science.`), highlight: h.highlightBox || `Key Finding: For optimal results regarding "${i}", pure steam-distilled botanical extracts should be diluted to 1-3% in a suitable carrier oil.` },
    drNotes: { h2: '2. EssenceKraft Lab & Clinical Notes', content: rewriteLinks(h.drNotes || `<em>"During our research into ${i.toLowerCase()}, our team at EssenceKraft Labs in Mysuru observed notable results when applying standardized protocols."</em>`), quote: h.drQuote || '"Purity and proper dilution are the two pillars of safe, effective botanical wellness." — EssenceKraft Research Team' },
    biochemistry: { h2: '3. Botanical Chemistry & Mechanism of Action', content: rewriteLinks(h.biochemistry || `The physiological performance relevant to <strong>${i}</strong> stems from the interplay of volatile organic compounds (VOCs).`),
      table: h.bioTable || [{ constituent: 'Monoterpenes (e.g. Linalool / α-Pinene)', function: 'Topical penetration enhancer & sensory soothing', percent: '45% - 65%' }, { constituent: 'Sesquiterpenes (e.g. Caryophyllene)', function: 'Cellular antioxidant & grounding base note', percent: '15% - 30%' }, { constituent: 'Oxides & Esters (e.g. 1,8-Cineole)', function: 'Clarifying olfactory stimulation', percent: '10% - 25%' }] },
    protocol: { h2: '4. Tested 3-Step Botanical Protocol', intro: 'Follow this laboratory-tested application protocol for optimal safety and efficacy:', steps: [
      { n: 1, title: 'Step 1: Preparation & Dilution', desc: h.step1Desc || `In a clean amber glass vessel, measure exactly 15 mL of cold-pressed Jojoba Carrier Oil. Add 6 drops of pure ${u} to achieve a 2% formulation. Swirl gently for 30 seconds.` },
      { n: 2, title: 'Step 2: Application & Patch Test', desc: h.step2Desc || 'Apply 2-3 drops of the blended formulation onto the target area. Perform a 24-hour patch test first. Massage gently in circular motions for 60 seconds.' },
      { n: 3, title: 'Step 3: Integration & Storage', desc: h.step3Desc || 'Inhale residual aromatic vapors deeply. Store remaining blend in a tightly capped amber glass bottle in a cool, dark location.' }] },
    caseStudy: { h2: '5. Real-World Clinical Case Study', title: `Clinical Observation: ${i}`, content: rewriteLinks(h.caseStudyContent || `<strong>Study Design:</strong> A controlled clinical observation studying the effects of botanical protocols targeting ${i.toLowerCase()}.<br/><br/><strong>Results:</strong> Participants following standardized 2% dilution protocols reported measurable improvements in the targeted wellness outcomes.`) },
    safety: { h2: '6. Dilution Mathematics & Safety Matrix', content: rewriteLinks(h.safetyContent || 'Essential oils must never be applied undiluted to the skin or ingested. Follow our official dilution guidelines below:'),
      table: [['1% Sensitive / Facial Dilution', '3 drops per 15 mL carrier oil', 'Sensitive facial skin, daily serum blends'], ['2% Standard Body / Scalp Dilution', '6 drops per 15 mL carrier oil', 'Daily body care, scalp massage, hair routines'], ['3% Targeted Short-Term Dilution', '9 drops per 15 mL carrier oil', 'Short-term targeted massage, foot rubs']],
      warnings: ['Do NOT ingest essential oils. They are potent volatile extracts meant solely for external application and diffusion.', 'Keep away from eyes, mucous membranes, and pet areas.', 'Always store essential oils in amber or cobalt UV-protective glass bottles.'] },
    faq: { h2: '7. Frequently Asked Questions', items: h.faq || [{ q: `What is the best way to approach ${i.toLowerCase()}?`, a: 'Our experts recommend starting with a properly diluted botanical formulation and following a consistent routine for at least 4-6 weeks to observe meaningful results.' }, { q: 'Which carrier oil works best for this purpose?', a: 'Jojoba oil is our preferred carrier due to its molecular similarity to human sebum, enabling superior absorption without clogging pores.' }, { q: 'How do I verify the quality of my essential oil?', a: 'Look for botanical names on the label, 100% steam-distilled certification, batch-specific GC-MS test reports, and dark amber glass packaging.' }] },
  };
}

// Same "related topics" selection as the original site.
export function related(slug: string, n = 6) {
  const t = getEntry(slug); if (!t) return wikiIndex.slice(0, n);
  let a = wikiIndex.filter(x => x.slug !== slug && (x.category === t.category || x.subcategory === t.subcategory));
  if (a.length < n) a = [...a, ...wikiIndex.filter(x => x.slug !== slug && !a.includes(x))];
  const o = slug.length % a.length;
  return [...a.slice(o), ...a.slice(0, o)].slice(0, n);
}
