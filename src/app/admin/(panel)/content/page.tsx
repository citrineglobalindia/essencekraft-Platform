'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type Store = { announcement: string[]; hero: { heading: string; subheading: string; cta: string; href: string }; sections: Record<string, boolean>; [k: string]: unknown };
const SECTIONS: [string, string][] = [['concerns', 'Shop by Concern'], ['bestsellers', 'Best Sellers'], ['promos', 'Bundle & Learn banners'], ['new_arrivals', 'New Arrivals'], ['newsletter', 'Newsletter / 10% off signup']];
const DEF: Store = { announcement: [], hero: { heading: '', subheading: '', cta: '', href: '' }, sections: Object.fromEntries(SECTIONS.map(([k]) => [k, true])) };
export default function Content() {
  const [s, setS] = useState<Store>(DEF); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { db().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS({ ...DEF, ...(data.value as Store), hero: { ...DEF.hero, ...((data.value as Store).hero ?? {}) }, sections: { ...DEF.sections, ...((data.value as Store).sections ?? {}) } })); }, []);
  const save = async () => { setBusy(true); setMsg(null);
    const { data } = await db().from('settings').select('value').eq('key', 'store').maybeSingle();
    const { error } = await db().from('settings').upsert({ key: 'store', value: { ...(data?.value ?? {}), announcement: s.announcement.filter(Boolean), hero: s.hero, sections: s.sections } });
    setBusy(false); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: 'Published. The storefront updates within a minute.' }); };
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
      <section className="adm-card form-grid adm-span"><div className="adm-card-h"><div><h3>Hero banner</h3><p>First slide of the homepage hero.</p></div></div>
        <div className="form-grid two">
          <div className="field span2"><label htmlFor="hh">Heading</label><input id="hh" className="input" value={s.hero.heading} onChange={e => setS(x => ({ ...x, hero: { ...x.hero, heading: e.target.value } }))} /></div>
          <div className="field span2"><label htmlFor="hs">Subheading</label><input id="hs" className="input" value={s.hero.subheading} onChange={e => setS(x => ({ ...x, hero: { ...x.hero, subheading: e.target.value } }))} /></div>
          <div className="field"><label htmlFor="hc">Button text</label><input id="hc" className="input" value={s.hero.cta} onChange={e => setS(x => ({ ...x, hero: { ...x.hero, cta: e.target.value } }))} /></div>
          <div className="field"><label htmlFor="hl">Button link</label><input id="hl" className="input" value={s.hero.href} onChange={e => setS(x => ({ ...x, hero: { ...x.hero, href: e.target.value } }))} /></div>
        </div>
        <div className="adm-hero-prev"><span className="hero-eyebrow">PREVIEW</span><h2>{s.hero.heading || 'Heading'}</h2><p>{s.hero.subheading}</p><span className="btn btn-primary btn-sm">{s.hero.cta || 'Button'}</span></div>
      </section>
    </div>
  </>;
}
