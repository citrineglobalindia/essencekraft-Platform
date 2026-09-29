import 'server-only';
import { cache } from 'react';
import { hasSupabase, publicClient } from './supabase';
import * as seed from './seed';
import type { Product, Concern, Category } from './types';

const SELECT = `id, slug, name, botanical_name, tagline, description, aroma, extraction, origin, uses, suggested_blends,
  safety, purity, color, images, is_bestseller, is_new, rating, review_count, seo_title, seo_description, created_at,
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
  const { data, error } = await publicClient().from('products').select(SELECT).eq('status', 'active').order('name');
  if (error) { console.error(error); return []; }
  return (data ?? []).map(map);
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

export const getSettings = cache(async (): Promise<{ free_shipping_min: number; announcement: string[] }> => {
  const fallback = { free_shipping_min: 999, announcement: ['Free shipping on orders above ₹999', '10% off your first order with code WELCOME10', '100% pure essential oils · GC-MS tested', 'Made in India'] };
  if (!hasSupabase) return fallback;
  const { data } = await publicClient().from('settings').select('value').eq('key', 'store').maybeSingle();
  return { ...fallback, ...(data?.value ?? {}) };
});
