import { NextResponse } from 'next/server';
import { isStaffRequest } from '@/lib/staff';
import { sendPaymentLink } from '@/lib/email';
export const dynamic = 'force-dynamic';

// Admin → Orders → payment link → “Send by email”: emails the customer their secure pay link.
export async function POST(req: Request) {
  if (!(await isStaffRequest(req))) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  const { order_id } = await req.json().catch(() => ({}));
  if (!order_id) return NextResponse.json({ error: 'Missing order' }, { status: 400 });
  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.essencekraft.in';
  try { const to = await sendPaymentLink(order_id, origin); return NextResponse.json({ ok: true, to }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Email failed' }, { status: 502 }); }
}
