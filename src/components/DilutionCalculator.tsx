'use client';
import { useState } from 'react';
// Same maths and guidance as the original essencekraft.in calculator: drops = round(0.3 × ml × %).
const SIZES = [5, 10, 15, 30, 50, 100], STRENGTHS = [0.5, 1, 2, 3];
const CARRIERS = ['Jojoba Oil (Best for face & skin)', 'Sweet Almond Oil (Best for massage)', 'Coconut Oil (Non-greasy, long shelf-life)', 'Argan Oil (Best for hair & anti-aging)'];
const NOTE: Record<number, string> = { 0.5: 'Ideal for facial application, sensitive skin, or daily use on delicate areas.', 1: 'Standard dilution for daily body oils, facial serums, and cosmetic applications.', 2: 'Perfect for localized massage, bath oils, and general wellness applications.', 3: 'Best for short-term use on specific, acute concerns (like muscle aches or cold relief). Not recommended for full body massage.' };
export function DilutionCalculator() {
  const [ml, setMl] = useState(10); const [pct, setPct] = useState(1); const [carrier, setCarrier] = useState(0);
  const drops = Math.round(0.3 * ml * pct);
  return <div className="calc">
    <div className="calc-in">
      <fieldset><legend>1. Bottle size <b>{ml} ml</b></legend><div className="adm-seg">{SIZES.map(s => <button type="button" key={s} aria-pressed={ml === s} onClick={() => setMl(s)}>{s}ml</button>)}</div></fieldset>
      <fieldset><legend>2. Dilution strength <b>{pct}%</b></legend><div className="adm-seg">{STRENGTHS.map(s => <button type="button" key={s} aria-pressed={pct === s} onClick={() => setPct(s)}>{s}%</button>)}</div></fieldset>
      <fieldset><legend>3. Recommended carrier oil</legend><select className="select" value={carrier} onChange={e => setCarrier(Number(e.target.value))} aria-label="Carrier oil">{CARRIERS.map((c, i) => <option key={c} value={i}>{c}</option>)}</select></fieldset>
    </div>
    <div className="calc-out" aria-live="polite"><span>You will need</span><b>{drops}</b><span>drops</span><p>of Essential Oil, filled with <strong>{CARRIERS[carrier].split(' (')[0]}</strong> to {ml}ml</p><em>{NOTE[pct]}</em></div>
  </div>;
}
