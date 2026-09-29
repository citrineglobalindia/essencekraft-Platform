import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/data';
export const revalidate = 60;
export async function GET() { return NextResponse.json(await getProducts()); }
