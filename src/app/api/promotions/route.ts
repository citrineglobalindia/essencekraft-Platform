import { NextResponse } from 'next/server';
import { getPromotions } from '@/lib/growth';
export const revalidate = 60;
export async function GET() { const p = await getPromotions(); return NextResponse.json({ popup: p.find(x => x.kind === 'popup') ?? null }); }
