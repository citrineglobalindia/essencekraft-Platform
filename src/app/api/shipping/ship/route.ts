import { NextResponse } from 'next/server';
import { isStaffRequest } from '@/lib/staff';
import { shipOrder, srConfigured } from '@/lib/shiprocket';
export const dynamic = 'force-dynamic';
// Admin → Order → “Ship with Shiprocket”. Route name avoids the word “shiprocket” (Shiprocket rejects such webhook URLs; kept consistent).
export async function POST(req: Request) {
  if (!(await isStaffRequest(req))) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  if (!srConfigured()) return NextResponse.json({ error: 'Shiprocket is not connected. Add SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in Vercel → Environment Variables, then redeploy.' }, { status: 503 });
  const { order_id } = await req.json().catch(() => ({}));
  try { const s = await shipOrder(order_id); return NextResponse.json({ ok: true, ...s }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Shiprocket error' }, { status: 502 }); }
}
