import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server';
import { sendOrderConfirmation } from '@/lib/email';

// Called by checkout after a COD order is placed. Only sends for orders the caller owns (order token) and that are COD or paid.
export async function POST(req: Request) {
  const { order_no, token } = await req.json().catch(() => ({}));
  if (!order_no || !token) return NextResponse.json({ error: 'Missing order' }, { status: 400 });
  const { data: o } = await adminClient().from('orders').select('id').eq('order_no', order_no).eq('access_token', token).maybeSingle();
  if (!o) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const sent = await sendOrderConfirmation(order_no, new URL(req.url).origin);
  return NextResponse.json({ ok: true, sent });
}
