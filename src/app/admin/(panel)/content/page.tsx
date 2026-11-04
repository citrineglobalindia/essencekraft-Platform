'use client';
import { useEffect, useState } from 'react';
import { db, refreshStore } from '@/lib/admin';
import { BRAND } from '@/lib/brand';
import type { HeroSlide } from '@/lib/data';
import { SlidesEditor } from '@/components/SlidesEditor';
import { PageHead, Saved } from '@/components/AdminUI';

type Store = { announcement: string[]; hero: { heading: string; subheading: string; cta: string; href: string }; sections: Record<string, boolean>; [k: string]: unknown };
const SECTIONS: [string, string][] = [['concerns', 'Shop by Concern'], ['bestsellers', 'Best Sellers'], ['promos', 'Bundle & Learn banners'], ['new_arrivals', 'New Arrivals'], ['newsletter', 'Newsletter / 10% off signup']];
const DEF: Store = { announcement: [], hero: { heading: '', subheading: '', cta: '', href: '' }, sections: Object.fromEntries(SECTIONS.map(([k]) => [k, true])) };
// The homepage's built-in slides, used as the starting point until custom slides are published.
async function builtInSlides(h: Store['hero']): Promise<HeroSlide[]> {
  const { data } = await db().from('products').select('slug,images').in('slug', ['lavender-essential-oil', 'rosemary-essential-oil', 'peppermint-essential-oil']);
  const img = (slug: string) => (data ?? []).find(p => p.slug === slug)?.images?.[0] ?? '';
  return [
    { id: 'hero-pure', heading: h.heading || '100% Pure Essential Oils', copy: h.subheading || 'Natural care for a calmer mind, healthier skin, stronger hair and a more balanced you.', cta: h.cta || 'Shop Essential Oils', href: h.href || '/shop?category=essential-oils', image: img('lavender-essential-oil'), active: true },
    { id: 'hero-hair', heading: 'Rosemary for hair routines', copy: 'Steam-distilled rosemary, ready to blend with jojoba for a weekly scalp massage.', cta: 'Shop Hair & Scalp', href: '/concern/hair-scalp', image: img('rosemary-essential-oil'), active: true },
    { id: 'hero-collection', heading: 'The alchemy of scent', copy: 'Pure, steam-distilled essential oils — crafted in India for mind, body and soul.', cta: 'Shop the collection', href: '/shop', image: BRAND.heroCollection, active: true },
    { id: 'hero-focus', heading: 'Bright oils for busy days', copy: 'Peppermint, lemongrass and sweet orange for a fresher-smelling desk.', cta: 'Shop Focus & Energy', href: '/concern/focus-energy', image: img('peppermint-essential-oil'), active: true },
  ];
}
export default function Content() {
  const [slides, setSlides] = useState<HeroSlide[] | null>(null);
  const [s, setS] = useState<Store>(DEF); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { db().from('settings').select('value').eq('key', 'store').maybeSingle().then(async ({ data }) => { const v = (data?.value ?? {}) as Store & { slides?: HeroSlide[] }; setSlides(v.slides?.length ? v.slides : await builtInSlides({ ...DEF.hero, ...(v.hero ?? {}) })); }); db().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS({ ...DEF, ...(data.value as Store), hero: { ...DEF.hero, ...((data.value as Store).hero ?? {}) }, sections: { ...DEF.sections, ...((data.value as Store).sections ?? {}) } })); }, []);
  const save = async () => { setBusy(true); setMsg(null);
    const { data } = await db().from('settings').select('value').eq('key', 'store').maybeSingle();
    const { error } = await db().from('settings').upsert({ key: 'store', value: { ...(data?.value ?? {}), announcement: s.announcement.filter(Boolean), hero: s.hero, sections: s.sections, ...(slides ? { slides } : {}) } });
    if (!error) await refreshStore();
    setBusy(false); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Published — the homepage is updated.' }); };
  const ann = (i: number, v: string) => setS(x => ({ ...x, announcement: x.announcement.map((a, j) => j === i ? v : a) }));
  return <>
    <PageHead title="Homepage & content" sub="Edit the announcement bar, hero and which homepage sections show — no code changes needed."><button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Publishing…' : 'Publish changes'}</button></PageHead>
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Announcement bar</h3><p>Rotating messages above the header. Desktop shows all; mobile shows the first.</p></div></div>
        {s.announcement.map((a, i) => <div key={i} style={{ display: 'flex', gap: 8 }}><input className="input" style={{ flex: 1, minWidth: 0 }} value={a} onChange={e => ann(i, e.target.value)} aria-label={`Message ${i + 1}`} /><button className="btn btn-ghost btn-sm" aria-label="Remove" onClick={() => setS(x => ({ ...x, announcement: x.announcement.filter((_, j) => j !== i) }))}>✕</button></div>)}
        {s.announcement.length < 5 && <button className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => setS(x => ({ ...x, announcement: [...x.announcement, ''] }))}>+ Add message</button>}
        <div className="announce" style={{ borderRadius: 8, overflow: 'hidden' }}><div className="wrap">{s.announcement.filter(Boolean).map(a => <span key={a}>{a}</span>)}</div></div>
      </section>
      <section className="adm-card form-grid"><div className="adm-card-h"><div><h3>Homepage sections</h3><p>Turn sections on or off.</p></div></div>
        {SECTIONS.map(([k, l]) => <label key={k} className="adm-toggle"><input type="checkbox" checked={!!s.sections[k]} onChange={e => setS(x => ({ ...x, sections: { ...x.sections, [k]: e.target.checked } }))} /><span>{l}</span></label>)}
      </section>
      <section className="adm-card form-grid adm-span"><div className="adm-card-h"><div><h3>Homepage carousel</h3><p>The rotating hero at the top of the homepage. Upload an image for each slide, edit the text and button, reorder or hide slides — then Publish changes.</p></div></div>
        {slides ? <SlidesEditor slides={slides} onChange={setSlides} /> : <p className="muted">Loading slides…</p>}
      </section>
    </div>
  </>;
}
