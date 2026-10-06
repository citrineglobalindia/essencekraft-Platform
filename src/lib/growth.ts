import 'server-only';
import { cache } from 'react';
import { hasSupabase, publicClient } from './supabase';

export type Promo = { id: string; kind: 'banner' | 'popup'; title: string; body: string | null; cta: string | null; href: string | null; coupon_code: string | null; theme: string | null };
export type Block =
  | { type: 'hero'; heading: string; sub?: string; cta?: string; href?: string; image?: string }
  | { type: 'products'; title?: string; slugs: string[] }
  | { type: 'benefits'; title?: string; items: { title: string; text: string }[] }
  | { type: 'text'; title?: string; body: string }
  | { type: 'faq'; title?: string; items: { q: string; a: string }[] }
  | { type: 'offer'; title: string; body?: string; code?: string; ends_at?: string; cta?: string; href?: string };
export type Landing = { id: string; slug: string; title: string; blocks: Block[]; seo_title: string | null; seo_description: string | null };

export const getPromotions = cache(async (): Promise<Promo[]> => {
  if (!hasSupabase) return [];
  const { data } = await publicClient().from('promotions').select('id,kind,title,body,cta,href,coupon_code,theme').order('created_at', { ascending: false });
  return (data ?? []) as Promo[];
});
export const getLanding = cache(async (slug: string): Promise<Landing | null> => {
  if (!hasSupabase) return null;
  const { data } = await publicClient().from('landing_pages').select('id,slug,title,blocks,seo_title,seo_description').eq('slug', slug).eq('status', 'published').maybeSingle();
  return (data as Landing) ?? null;
});
// Published encyclopedia edits, fetched once per render pass.
type Ov = Record<string, { title: string | null; fields: Record<string, unknown> }>;
let overridesP: Promise<Ov> | null = null;
export function getWikiOverrides(): Promise<Ov> {
  if (!hasSupabase) return Promise.resolve({} as Ov);
  overridesP ??= (async () => {
    const { data } = await publicClient().from('wiki_overrides').select('slug,title,fields').eq('status', 'published');
    const m: Record<string, { title: string | null; fields: Record<string, unknown> }> = {};
    (data ?? []).forEach(r => { m[r.slug] = { title: r.title, fields: r.fields ?? {} }; });
    setTimeout(() => { overridesP = null; }, 60_000);
    return m;
  })();
  return overridesP;
}
