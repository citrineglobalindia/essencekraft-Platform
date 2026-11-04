'use client';
import { useState } from 'react';
import { db } from '@/lib/admin';
import type { HeroSlide } from '@/lib/data';

const newId = () => 'slide-' + Math.random().toString(36).slice(2, 8);
export const blankSlide = (): HeroSlide => ({ id: newId(), heading: '', copy: '', cta: 'Shop now', href: '/shop', image: '', eyebrow: '', active: true });

// Admin: homepage carousel — image upload, text, button, order, show/hide.
export function SlidesEditor({ slides, onChange }: { slides: HeroSlide[]; onChange: (s: HeroSlide[]) => void }) {
  const [busy, setBusy] = useState<string>(''); const [err, setErr] = useState('');
  const set = (i: number, patch: Partial<HeroSlide>) => onChange(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= slides.length) return; const a = [...slides]; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const upload = async (i: number, file: File) => {
    setErr('');
    if (!/^image\/(webp|jpeg|png|avif)$/.test(file.type)) return setErr('Use a WebP, JPG, PNG or AVIF image.');
    if (file.size > 5 * 1024 * 1024) return setErr('Image is larger than 5 MB — please compress it first.');
    setBusy(slides[i].id);
    const path = `hero/${Date.now()}-${file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
    const { error } = await db().storage.from('product-images').upload(path, file, { cacheControl: '31536000' });
    setBusy('');
    if (error) return setErr(error.message);
    set(i, { image: db().storage.from('product-images').getPublicUrl(path).data.publicUrl });
  };
  return <div className="slides-ed">
    {err && <p className="notice error" role="alert">{err}</p>}
    {slides.map((s, i) => <div key={s.id} className={`slide-row${s.active === false ? ' off' : ''}`}>
      <div className="slide-img">
        {s.image ? <img src={s.image} alt="" /> : <span className="muted">No image</span>}
        <label className="btn btn-ghost btn-sm">{busy === s.id ? 'Uploading…' : s.image ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/webp,image/jpeg,image/png,image/avif" hidden disabled={!!busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) upload(i, f); }} /></label>
        {s.image && <button type="button" className="link" onClick={() => set(i, { image: '' })}>Remove image</button>}
      </div>
      <div className="slide-fields">
        <div className="slide-top"><b>Slide {i + 1}</b>
          <label className="check"><input type="checkbox" checked={s.active !== false} onChange={e => set(i, { active: e.target.checked })} />Show</label>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
            <button type="button" className="btn btn-ghost btn-sm" disabled={i === slides.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            <button type="button" className="link link-danger" onClick={() => { if (confirm(`Delete slide ${i + 1}?`)) onChange(slides.filter((_, j) => j !== i)); }}>Delete</button></span></div>
        <div className="form-grid two">
          <div className="field"><label>Small label above heading</label><input className="input" value={s.eyebrow ?? ''} placeholder="PURE BOTANICAL WELLNESS" onChange={e => set(i, { eyebrow: e.target.value })} /></div>
          <div className="field"><label>Heading</label><input className="input" value={s.heading} onChange={e => set(i, { heading: e.target.value })} /></div>
          <div className="field span2"><label>Text</label><input className="input" value={s.copy} onChange={e => set(i, { copy: e.target.value })} /></div>
          <div className="field"><label>Button text <small className="muted">(empty = no button)</small></label><input className="input" value={s.cta} onChange={e => set(i, { cta: e.target.value })} /></div>
          <div className="field"><label>Button link</label><input className="input" value={s.href} placeholder="/shop" onChange={e => set(i, { href: e.target.value })} /></div>
        </div>
      </div>
    </div>)}
    <button type="button" className="btn btn-ghost btn-sm" style={{ justifySelf: 'start' }} onClick={() => onChange([...slides, blankSlide()])}>+ Add slide</button>
    <small className="muted">Images show as a square on the right of the slide — use at least 1200×1200 px (WebP or JPG, under 5 MB). Slides rotate every 6 seconds; hidden slides are kept but not shown.</small>
  </div>;
}
