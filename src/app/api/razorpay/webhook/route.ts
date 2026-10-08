import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminClient } from '@/lib/server';
import { sendOrderConfirmation } from '@/lib/email';

// Backup confirmation if the customer closes the tab before /verify runs. Configure in Razorpay dashboard: payment.captured, payment.failed.
export async function POST(req: Request) {
  const body = await req.text();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  const sig = req.headers.get('x-razorpay-signature') ?? '';
  const exp = crypto.createHmac('sha256', secret).update(body).digest('hex');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return NextResponse.json({ error: 'Bad signature' }, { status: 400 });
  const evt = JSON.parse(body);
  const pay = evt?.payload?.payment?.entity;
  if (!pay?.order_id) return NextResponse.json({ ok: true });
  const db = adminClient();
  if (evt.event === 'payment.captured') {
    await db.from('orders').update({ payment_status: 'paid', status: 'confirmed', updated_at: new Date().toISOString() }).eq('payment_ref', pay.order_id).neq('payment_status', 'paid');
    // A late capture can follow an earlier payment.failed for the same order (e.g. UPI retry) — this still marks it paid.
    const { data: o } = await db.from('orders').select('order_no').eq('payment_ref', pay.order_id).maybeSingle();
    if (o) await sendOrderConfirmation(o.order_no, new URL(req.url).origin).catch(e => console.error('[email]', e));
  }
  if (evt.event === 'payment.failed') await db.from('orders').update({ payment_status: 'failed' }).eq('payment_ref', pay.order_id).eq('payment_status', 'pending');
  return NextResponse.json({ ok: true });
}
