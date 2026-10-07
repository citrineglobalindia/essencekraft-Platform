'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bottle } from './Bottle';
import { DropIcon, FlaskIcon, LeafIcon, PinIcon } from './Icons';
import { track } from '@/lib/attribution';

type Slide = { heading: string; copy: string; cta: string; href: string; color: string; name: string; id: string; image?: string };
export function Hero({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI(x => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  const s = slides[i];
  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Featured" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)}>
      <div className="wrap hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">PURE BOTANICAL WELLNESS</span>
          {i === 0 ? <h1>{s.heading}</h1> : <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)' }}>{s.heading}</h2>}
          <p>{s.copy}</p>
          <Link className="btn btn-primary" href={s.href} style={{ justifySelf: 'start' }} onClick={() => track('select_promotion', { promotion_id: s.id, promotion_name: s.heading })}>{s.cta}</Link>
          <div className="trust">
            <div><i><LeafIcon size={18} /></i>100% Pure<br />&amp; Natural</div>
            <div><i><FlaskIcon size={18} /></i>GC-MS<br />Tested</div>
            <div className="hide-sm"><i><DropIcon size={18} /></i>Zero synthetic<br />dilutions</div>
            <div><i><PinIcon size={18} /></i>Made in<br />India</div>
          </div>
        </div>
        <div className="hero-art" aria-hidden>{s.image ? <img key={s.id} className="hero-photo" src={s.image} alt="" fetchPriority={i === 0 ? 'high' : 'auto'} /> : <><div className="plinth" /><Bottle color={s.color} label={s.name} /></>}</div>
      </div>
      {slides.length > 1 && <div className="dots">{slides.map((x, j) => <button key={x.id} aria-label={`Show slide ${j + 1}`} aria-current={i === j} onClick={() => setI(j)} />)}</div>}
    </section>
  );
}
