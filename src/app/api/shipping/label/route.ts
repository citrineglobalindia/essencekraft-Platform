import { NextResponse } from 'next/server';
import { isStaffRequest } from '@/lib/staff';
import { labelUrl, srConfigured } from '@/lib/shiprocket';
export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  if (!(await isStaffRequest(req))) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  if (!srConfigured()) return NextResponse.json({ error: 'Shiprocket is not connected.' }, { status: 503 });
  const { order_no } = await req.json().catch(() => ({}));
  try { return NextResponse.json({ ok: true, url: await labelUrl(order_no) }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Shiprocket error' }, { status: 502 }); }
}
