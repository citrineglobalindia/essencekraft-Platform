// Brand photography (imported by scripts/import-images.mjs into public/img/wiki).
const KEY: Record<string, string> = {
  'Lavender Oil': 'lavender', 'Peppermint Oil': 'peppermint', 'Rosemary Oil': 'rosemary', 'Clary Sage Oil': 'clary-sage',
  'Geranium Oil': 'geranium', 'Eucalyptus Oil': 'eucalyptus', 'Tea Tree Oil': 'tea-tree', 'Lemongrass Oil': 'lemongrass',
  'Cedarwood Oil': 'cedarwood', 'Holy Basil Oil': 'holy-basil', 'Orange Oil': 'orange', 'Bergamot Oil': 'bergamot',
  'Jojoba Oil': 'jojoba', 'Citronella Oil': 'botanical', 'Essential Oils Overview': 'botanical', Miscellaneous: 'wellness',
};
const ROTATE = ['lavender', 'peppermint', 'rosemary', 'geranium', 'eucalyptus', 'tea-tree', 'clary-sage', 'jojoba', 'botanical', 'wellness', 'orange', 'bergamot'];
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
export const tileImg = (category: string) => `/img/wiki/tile-${KEY[category] ?? 'botanical'}.webp`;
export function cardImg(category: string, slug: string) {
  const k = KEY[category];
  if (!k || category === 'Essential Oils Overview' || category === 'Miscellaneous' || category === 'Citronella Oil') return `/img/wiki/card-${ROTATE[hash(slug) % ROTATE.length]}.webp`;
  return `/img/wiki/card-${k}.webp`;
}
