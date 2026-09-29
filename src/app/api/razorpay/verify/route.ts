import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/server';

export async function POST(req: Request) {
  const { order_no, token, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const expected = crypto.createHmac('sha256', secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  const ok = expected.length === String(razorpay_signature).length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpay_signature)));
  const db = adminClient();
  const { data: o } = await db.from('orders').select('id, payment_ref').eq('order_no', order_no).eq('access_token', token).maybeSingle();
  if (!o || o.payment_ref !== razorpay_order_id) return NextResponse.json({ error: 'Order mismatch' }, { status: 400 });
  if (!ok) {
    await db.from('orders').update({ payment_status: 'failed' }).eq('id', o.id);
    return NextResponse.json({ error: 'Payment signature invalid' }, { status: 400 });
  }
  await db.from('orders').update({ payment_status: 'paid', status: 'confirmed', notes: `razorpay_payment_id=${razorpay_payment_id}`, updated_at: new Date().toISOString() }).eq('id', o.id);
  return NextResponse.json({ ok: true });
}
