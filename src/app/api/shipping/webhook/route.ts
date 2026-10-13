import { NextResponse } from 'next/server';
import { syncAwb, srConfigured } from '@/lib/shiprocket';
export const dynamic = 'force-dynamic';
// Shiprocket tracking webhook (Settings → Webhooks). The payload is never trusted on its own:
// we only read the AWB from it and fetch the real status from Shiprocket's API before changing an order.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const awb = String(body?.awb ?? body?.awb_code ?? '').trim();
  if (awb && srConfigured()) await syncAwb(awb).catch(e => console.error('[shipping:webhook]', awb, e instanceof Error ? e.message : e));
  return NextResponse.json({ ok: true }); // always 200 so Shiprocket keeps the webhook active
}
export async function GET() { return NextResponse.json({ ok: true }); }
