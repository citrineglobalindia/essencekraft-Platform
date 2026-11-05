import 'server-only';
import { cache } from 'react';
import { hasSupabase, publicClient } from './supabase';
import * as seed from './seed';
import type { Product, Concern, Category } from './types';

const SELECT = `id, slug, name, botanical_name, tagline, description, aroma, extraction, origin, uses, suggested_blends,
  safety, purity, color, images, is_bestseller, is_new, rating, review_count, seo_title, seo_description, created_at, combo,
  category:categories(slug), product_concerns(concern:concerns(slug)),
  variants(id, sku, label, price, compare_at, stock, low_stock_threshold, allow_backorder, sort)`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function map(r: any): Product {
  return {
    ...r,
    category: r.category?.slug ?? 'essential-oils',
    concerns: (r.product_concerns ?? []).map((pc: any) => pc.concern?.slug).filter(Boolean),
    rating: Number(r.rating), 
    variants: (r.variants ?? []).sort((a: any, b: any) => a.sort - b.sort)
      .map((v: any) => ({ ...v, price: Number(v.price), compare_at: v.compare_at == null ? null : Number(v.compare_at) })),
  };
}

export const getProducts = cache(async (): Promise<Product[]> => {
  if (!hasSupabase) return seed.products;
  const q = (sel: string) => publicClient().from('products').select(sel).eq('status', 'active').order('name') as unknown as Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  let { data, error } = await q(SELECT);
  // Before migration 0010 the combo column doesn't exist yet — fall back so the store keeps working.
  if (error && /combo/.test(error.message)) ({ data, error } = await q(SELECT.replace(' combo,', '')));
  if (error) { console.error(error); return []; }
  const list = (data ?? []).map(map);
  // Dynamic-price combos: show the lowest possible total of N picks (marked “From” on cards)
  const byV = new Map(list.flatMap(x => x.variants.map(v => [v.id, v] as const)));
  for (const p of list) if (p.combo?.pricing === 'dynamic' && p.variants[0]) {
    const opts = p.combo.options.map(id => byV.get(id)).filter((v): v is NonNullable<typeof v> => !!v && (v.stock > 0 || v.allow_backorder)).sort((a, b) => a.price - b.price);
    const n = Math.max(1, p.combo.pick); const chosen = p.combo.allow_repeat === false ? opts.slice(0, n) : Array(n).fill(opts[0]).filter(Boolean);
    if (chosen.length === n) { p.variants[0] = { ...p.variants[0], price: chosen.reduce((s, v) => s + v.price, 0), compare_at: chosen.every(v => v.compare_at) ? chosen.reduce((s, v) => s + (v.compare_at ?? v.price), 0) : null }; }
  }
  return list;
});

export const getProduct = cache(async (slug: string) => (await getProducts()).find(p => p.slug === slug) ?? null);

export const getConcerns = cache(async (): Promise<Concern[]> => {
  if (!hasSupabase) return seed.concerns;
  const { data } = await publicClient().from('concerns').select('slug,name,intro,color').order('sort');
  return data ?? [];
});

export const getCategories = cache(async (): Promise<Category[]> => {
  if (!hasSupabase) return seed.categories;
  const { data } = await publicClient().from('categories').select('slug,name,intro').order('sort');
  return data ?? [];
});

/** Homepage carousel slide managed in Admin → Homepage & content. */
export type HeroSlide = { id: string; heading: string; copy: string; cta: string; href: string; image?: string; eyebrow?: string; active?: boolean };
export type StoreSettings = { free_shipping_min: number; shipping_flat: number; cod_fee: number; announcement: string[]; hero?: { heading: string; subheading: string; cta: string; href: string }; slides?: HeroSlide[]; sections: Record<string, boolean> };
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const fallback: StoreSettings = { free_shipping_min: 999, shipping_flat: 79, cod_fee: 49, announcement: ['Free shipping on orders above ₹999', '10% off your first order with code WELCOME10', '100% pure essential oils · GC-MS tested', 'Made in India'], sections: {} };
  if (!hasSupabase) return fallback;
  const { data } = await publicClient().from('settings').select('value').eq('key', 'store').maybeSingle();
  return { ...fallback, ...(data?.value ?? {}) };
});

/** Free items for combo pages: may be archived products (hidden from the shop), so they're read server-side. */
export type ExtraVariant = { variant_id: string; slug: string; name: string; label: string; image?: string; color: string; available: boolean; worth: number; price: number; compare_at: number | null };
export const getComboExtras = cache(async (ids: string[]): Promise<ExtraVariant[]> => {
  if (!ids.length || !hasSupabase) return [];
  let db: ReturnType<typeof publicClient> = publicClient();
  try { const { adminClient } = await import('./server'); db = adminClient() as unknown as typeof db; } catch { /* no service key: active products only */ }
  const { data } = await db.from('variants').select('id, label, price, compare_at, stock, allow_backorder, product:products(slug, name, images, color)').in('id', ids);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).filter(v => v.product).map(v => ({ variant_id: v.id, slug: v.product.slug, name: v.product.name, label: v.label, image: v.product.images?.[0], color: v.product.color ?? '#7a5a9e',
    available: v.stock > 0 || v.allow_backorder, worth: Number(v.compare_at ?? v.price), price: Number(v.price), compare_at: v.compare_at == null ? null : Number(v.compare_at) }));
});
