import { NextResponse } from 'next/server';
import { isStaffRequest } from '@/lib/staff';
import { adminClient } from '@/lib/server';
import { syncAwb, srConfigured } from '@/lib/shiprocket';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
// POST {awb} from the admin (staff) — sync one shipment.
export async function POST(req: Request) {
  if (!(await isStaffRequest(req))) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  if (!srConfigured()) return NextResponse.json({ error: 'Shiprocket is not connected.' }, { status: 503 });
  const { awb } = await req.json().catch(() => ({}));
  try { return NextResponse.json({ ok: true, ...(await syncAwb(String(awb))) }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Shiprocket error' }, { status: 502 }); }
}
// GET — daily Vercel cron backup in case a webhook was missed: re-checks every open shipment.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!srConfigured()) return NextResponse.json({ ok: true, skipped: 'not configured' });
  const { data } = await adminClient().from('orders').select('awb').not('awb', 'is', null).in('status', ['packed', 'shipped']).limit(100);
  const out = [];
  for (const r of data ?? []) out.push(await syncAwb(r.awb as string).catch(e => ({ error: String(e) })));
  return NextResponse.json({ ok: true, checked: out.length });
}
