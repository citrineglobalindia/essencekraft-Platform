import { NextResponse } from 'next/server';
import { serviceability, srConfigured } from '@/lib/shiprocket';
export const dynamic = 'force-dynamic';
const cache = new Map<string, { at: number; v: unknown }>();
// Public: GET ?pincode=560001 → { serviceable, days, cod } for the product-page delivery checker.
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get('pincode') ?? '';
  if (!/^[1-9]\d{5}$/.test(pin)) return NextResponse.json({ error: 'Enter a valid 6-digit pincode.' }, { status: 400 });
  if (!srConfigured()) return NextResponse.json({ serviceable: null });
  const hit = cache.get(pin); if (hit && Date.now() - hit.at < 12 * 3600e3) return NextResponse.json(hit.v);
  try { const v = await serviceability(pin, true); cache.set(pin, { at: Date.now(), v }); return NextResponse.json(v, { headers: { 'cache-control': 'public, s-maxage=43200' } }); }
  catch { return NextResponse.json({ serviceable: null }); }
}
