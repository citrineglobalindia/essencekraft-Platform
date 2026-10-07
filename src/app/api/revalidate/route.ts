import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON, hasSupabase } from '@/lib/supabase';

// Called by the admin after a product is saved, published or deleted, so the storefront
// (home, shop, concern and product pages) shows the change immediately instead of after the cache window.
export async function POST(req: Request) {
  if (!hasSupabase) return NextResponse.json({ ok: true, demo: true });
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ ok: false, error: 'Not signed in' }, { status: 401 });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: staff, error } = await sb.rpc('is_staff');
  if (error || !staff) return NextResponse.json({ ok: false, error: 'Staff only' }, { status: 403 });
  const { slug } = await req.json().catch(() => ({} as { slug?: string }));
  revalidatePath('/', 'layout'); // whole storefront: nav, search index, home, shop, concerns, products
  if (slug) revalidatePath(`/product/${slug}`);
  revalidatePath('/api/catalog');
  return NextResponse.json({ ok: true });
}
