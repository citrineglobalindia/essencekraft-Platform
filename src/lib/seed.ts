// Demo catalogue used when Supabase is not configured, and source for supabase/seed.sql.
// Prices and copy are placeholders — replace with the approved live catalogue at migration (MIG-002).
import type { Product, Concern, Category } from './types';

export const categories: Category[] = [
  { slug: 'essential-oils', name: 'Essential Oils', intro: 'Single-origin, steam-distilled and cold-pressed essential oils.' },
  { slug: 'carrier-oils', name: 'Carrier Oils', intro: 'Gentle base oils for diluting essential oils before use on skin and hair.' },
  { slug: 'blends', name: 'Blends', intro: 'Ready-to-use combinations built around a single intention.' },
  { slug: 'diffusers', name: 'Diffusers', intro: 'Ultrasonic diffusers for a room that smells the way you want it to.' },
];

export const concerns: Concern[] = [
  { slug: 'sleep-calm', name: 'Sleep & Calm', intro: 'Soft, floral and woody oils for winding down.', color: '#7a5a9e' },
  { slug: 'focus-energy', name: 'Focus & Energy', intro: 'Bright citrus and mint for a clearer head.', color: '#d99a1e' },
  { slug: 'stress-relief', name: 'Stress Relief', intro: 'Grounding aromas for heavier days.', color: '#5f8a7a' },
  { slug: 'hair-scalp', name: 'Hair & Scalp', intro: 'Oils traditionally used in scalp and hair routines.', color: '#3f6b3a' },
  { slug: 'skin-care', name: 'Skin Care', intro: 'Always dilute. Patch-test first.', color: '#c2566e' },
  { slug: 'diffusers', name: 'Diffusers', intro: 'Diffuser-friendly oils and devices.', color: '#9a7b58' },
];

const std = 'For external use only. Dilute before applying to skin (2–3 drops in 10 ml carrier oil). Patch-test first. Keep away from eyes and children. Consult a doctor if pregnant, nursing or under medical care.';
const purity = '100% pure, undiluted. Batch GC-MS report available on request.';

type Seed = [slug: string, name: string, botanical: string, tagline: string, color: string, concerns: string[], aroma: string, extraction: string, best: boolean, isNew: boolean, rating: number, reviews: number, category?: string];
const rows: Seed[] = [
  ['lavender-essential-oil','Lavender Essential Oil','Lavandula angustifolia','Calms the mind and supports restful sleep','#7a5a9e',['sleep-calm','stress-relief','skin-care'],'Floral, herbaceous, sweet','Steam distillation',true,false,4.9,2100],
  ['rosemary-essential-oil','Rosemary Essential Oil','Salvia rosmarinus','Supports hair and scalp routines','#3f6b3a',['hair-scalp','focus-energy'],'Herbal, camphoraceous, fresh','Steam distillation',true,false,4.8,1700],
  ['tea-tree-essential-oil','Tea Tree Essential Oil','Melaleuca alternifolia','Purifying care for skin and scalp','#4f7a4a',['skin-care','hair-scalp'],'Fresh, medicinal, green','Steam distillation',true,true,4.7,960],
  ['peppermint-essential-oil','Peppermint Essential Oil','Mentha × piperita','Cooling and refreshing','#3d8a68',['focus-energy'],'Minty, sharp, cooling','Steam distillation',true,true,4.8,1200],
  ['lemongrass-essential-oil','Lemongrass Essential Oil','Cymbopogon flexuosus','Fresh, citrusy lift for any room','#9aa53a',['focus-energy','diffusers'],'Lemony, grassy, bright','Steam distillation',false,false,4.6,540],
  ['citronella-essential-oil','Citronella Essential Oil','Cymbopogon winterianus','A classic outdoor-evening aroma','#b8a03a',['diffusers'],'Citrus, grassy, woody','Steam distillation',false,false,4.5,410],
  ['cedarwood-essential-oil','Cedarwood Essential Oil','Cedrus deodara','Warm, woody and grounding','#8a5d3b',['sleep-calm','stress-relief','hair-scalp'],'Woody, warm, balsamic','Steam distillation',false,false,4.6,380],
  ['eucalyptus-essential-oil','Eucalyptus Essential Oil','Eucalyptus globulus','Clear, open, refreshing','#5f8a7a',['stress-relief','diffusers'],'Camphoraceous, fresh, clean','Steam distillation',false,false,4.7,820],
  ['orange-essential-oil','Sweet Orange Essential Oil','Citrus sinensis','Cheerful citrus for the everyday','#e0802a',['focus-energy','diffusers'],'Sweet, juicy, citrus','Cold pressed',false,true,4.7,450],
  ['bergamot-essential-oil','Bergamot Essential Oil','Citrus bergamia','Bright citrus with a floral edge','#b3a23a',['stress-relief','sleep-calm'],'Citrus, floral, slightly spicy','Cold pressed',false,true,4.6,290],
  ['clary-sage-essential-oil','Clary Sage Essential Oil','Salvia sclarea','Herbaceous and quietly relaxing','#8a7aa0',['stress-relief','sleep-calm'],'Herbal, musky, sweet','Steam distillation',false,false,4.5,210],
  ['geranium-essential-oil','Geranium Essential Oil','Pelargonium graveolens','Rosy, balancing floral','#c2566e',['skin-care','stress-relief'],'Rosy, green, floral','Steam distillation',false,false,4.6,260],
  ['tulsi-essential-oil','Holy Basil (Tulsi) Essential Oil','Ocimum tenuiflorum','A revered Indian herb, distilled','#4a7a3a',['stress-relief','focus-energy'],'Spicy, clove-like, herbal','Steam distillation',false,true,4.7,180],
  ['jojoba-carrier-oil','Jojoba Carrier Oil','Simmondsia chinensis','Light, skin-friendly base for dilution','#c8a24a',['skin-care','hair-scalp'],'Near odourless','Cold pressed',false,false,4.8,640,'carrier-oils'],
];

export const products: Product[] = rows.map((r, i) => {
  const [slug, name, botanical, tagline, color, cons, aroma, extraction, best, isNew, rating, reviews, category = 'essential-oils'] = r;
  const carrier = category === 'carrier-oils';
  const base = slug.split('-')[0].toUpperCase().slice(0, 4);
  return {
    id: `p${i + 1}`, slug, name, botanical_name: botanical, tagline,
    description: `${name.replace(/ (Essential|Carrier) Oil/, '')} oil, bottled undiluted in amber glass to protect it from light. ${tagline}.`,
    category, concerns: cons, aroma, extraction, origin: 'India',
    uses: carrier
      ? ['Blend with essential oils for massage', 'Use a few drops as a hair and scalp oil', 'Base for DIY facial serums']
      : ['Diffuse 4–6 drops in water', 'Dilute in a carrier oil for massage', 'Add 2 drops to a warm bath with carrier oil'],
    suggested_blends: carrier ? ['Lavender', 'Tea Tree', 'Rosemary'] : ['Lavender', 'Cedarwood', 'Orange'].filter(b => !name.startsWith(b)),
    safety: carrier ? 'For external use only. Patch-test before first use.' : std,
    purity, color, images: [], is_bestseller: best, is_new: isNew, rating, review_count: reviews,
    seo_title: `${name} | 100% Pure | EssenceKraft`, seo_description: `${tagline}. Buy pure ${name.toLowerCase()} online in India.`,
    created_at: new Date(Date.UTC(2026, 0, 1 + (isNew ? 200 + i : i))).toISOString(),
    variants: (carrier ? [['100 ml', 399, 549], ['200 ml', 699, 899]] : [['15 ml', 499, 699], ['30 ml', 849, 1199]]).map(([label, price, cmp], j) => ({
      id: `p${i + 1}v${j + 1}`, sku: `EK-${base}-${String(label).replace(/\s/g, '')}`.toUpperCase(),
      label: String(label), price: Number(price), compare_at: Number(cmp),
      stock: (i * 7 + j * 13) % 60, low_stock_threshold: 10, allow_backorder: false,
    })),
  };
});
