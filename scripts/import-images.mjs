#!/usr/bin/env node
// Downloads EssenceKraft's own product & botanical photography from essencekraft.in and
// writes optimised WebP files to public/img/wiki/.  Usage: node scripts/import-images.mjs
import fs from 'fs';
import sharp from 'sharp';
const P = 'https://essencekraft.in/api/static/product/';
const W = 'https://www.essencekraft.in/assets/wiki-images/';
const B = 'https://www.essencekraft.in/assets/banners/';
// key: [tile source, card source]
const SRC = {
  lavender: [W + 'lavender-essential-oil-hero.webp', W + 'lavender-essential-oil-hero.webp'],
  peppermint: [W + 'peppermint-essential-oil-hero.webp', W + 'peppermint-essential-oil-hero.webp'],
  rosemary: [W + 'rosemary-essential-oil-hero.webp', W + 'rosemary-essential-oil-hero.webp'],
  'clary-sage': [W + 'clary-sage-essential-oil-hero.webp', W + 'clary-sage-essential-oil-hero.webp'],
  geranium: [W + 'geranium-essential-oil-hero.webp', W + 'geranium-essential-oil-hero.webp'],
  eucalyptus: [W + 'eucalyptus-essential-oil-hero.webp', W + 'eucalyptus-essential-oil-hero.webp'],
  'tea-tree': [W + 'tea-tree-essential-oil-hero.webp', W + 'tea-tree-essential-oil-hero.webp'],
  jojoba: [W + 'jojoba-carrier-oil-hero.webp', W + 'jojoba-carrier-oil-hero.webp'],
  lemongrass: [P + 'lemongrass.jpg', P + 'lemongrass.jpg'],
  cedarwood: [P + 'cedarwood_oil.png', P + 'cedarwood_oil.png'],
  'holy-basil': [P + 'basil.jpg', P + 'basil.jpg'],
  orange: [P + 'orange_oil.png', P + 'orange_oil.png'],
  bergamot: [P + 'bergamot.jpg', P + 'bergamot.jpg'],
};
const BANNERS = { botanical: B + 'hero_banner_botanical.jpg', wellness: B + 'hero_banner_wellness.jpg' };
const out = 'public/img/wiki'; fs.mkdirSync(out, { recursive: true });
const get = async u => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return Buffer.from(await r.arrayBuffer()); };
const webp = { quality: 78, effort: 5 };
let n = 0;
for (const [k, [tile, card]] of Object.entries(SRC)) {
  const t = await get(tile); const c = card === tile ? t : await get(card);
  const isProduct = tile.startsWith(P);
  let ti = sharp(t);
  if (isProduct) { const m = await sharp(t).metadata(); const top = Math.round(m.height * 0.38); ti = sharp(t).extract({ left: 0, top, width: m.width, height: m.height - top }); }
  await ti.resize(320, 320, { fit: 'cover', position: 'centre' }).webp(webp).toFile(`${out}/tile-${k}.webp`);
  await sharp(c).resize(640, 400, { fit: 'cover', position: 'centre' }).webp(webp).toFile(`${out}/card-${k}.webp`); n += 2;
}
for (const [k, u] of Object.entries(BANNERS)) {
  const buf = await get(u); const { width, height } = await sharp(buf).metadata();
  // Right-hand photographic part only (the banners carry baked-in text on the left).
  const left = Math.round(width * 0.51), crop = { left, top: 0, width: width - left, height: Math.round(height * 0.93) };
  const img = sharp(buf).extract(crop);
  // Landscape hero: the bottles band only.
  const ht = Math.round(height * 0.16), hh = Math.round(height * 0.66);
  await sharp(buf).extract({ left, top: ht, width: width - left, height: hh }).resize(1000, null).webp({ quality: 80, effort: 5 }).toFile(`${out}/hero-${k}.webp`);
  await img.clone().resize(320, 320, { fit: 'cover', position: 'centre' }).webp(webp).toFile(`${out}/tile-${k}.webp`);
  await img.clone().resize(640, 400, { fit: 'cover', position: 'centre' }).webp(webp).toFile(`${out}/card-${k}.webp`); n += 3;
}
console.log(`wrote ${n} images to ${out}`);
