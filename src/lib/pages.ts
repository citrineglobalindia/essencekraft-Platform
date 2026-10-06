import 'server-only';
import { cache } from 'react';
import { hasSupabase, publicClient } from './supabase';

export type SitePage = { path: string; kind: 'support' | 'policy' | 'category' | 'landing' | 'hub' | 'guide'; title: string; description: string | null; eyebrow: string | null; h1: string; html: string; products: string[]; updated_at: string };
// Pages migrated from essencekraft.in (FAQ, policies, use-case hubs, guides). Content lives in the database so it can be edited in admin.
export const getPage = cache(async (path: string): Promise<SitePage | null> => {
  if (!hasSupabase) return null;
  const { data } = await publicClient().from('site_pages').select('*').eq('path', path).eq('status', 'published').maybeSingle();
  return (data as SitePage) ?? null;
});
export const listPages = cache(async (): Promise<Pick<SitePage, 'path' | 'kind' | 'h1' | 'eyebrow' | 'updated_at'>[]> => {
  if (!hasSupabase) return [];
  const { data } = await publicClient().from('site_pages').select('path,kind,h1,eyebrow,updated_at').eq('status', 'published').order('path');
  return data ?? [];
});
