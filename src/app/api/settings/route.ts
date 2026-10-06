import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/data';
export const revalidate = 60;
export async function GET() { const s = await getSettings(); return NextResponse.json({ free_shipping_min: s.free_shipping_min, shipping_flat: s.shipping_flat, cod_fee: s.cod_fee }); }
