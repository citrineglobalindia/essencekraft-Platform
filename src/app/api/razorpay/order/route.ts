import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server';

// Creates (or re-uses, for retries) a Razorpay order for an EssenceKraft order. Amount always comes from the DB.
export async function POST(req: Request) {
  const { order_no, token } = await req.json();
  const id = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return NextResponse.json({ error: 'Online payments are not configured' }, { status: 503 });
  const db = adminClient();
  const { data: o } = await db.from('orders').select('id, order_no, total, payment_status, payment_ref, email, phone, full_name')
    .eq('order_no', order_no).eq('access_token', token).maybeSingle();
  if (!o) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (o.payment_status === 'paid') return NextResponse.json({ error: 'Order already paid' }, { status: 409 });
  let rzpId = o.payment_ref as string | null;
  if (!rzpId) {
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') },
      body: JSON.stringify({ amount: Math.round(Number(o.total) * 100), currency: 'INR', receipt: o.order_no, notes: { order_no: o.order_no } }),
    });
    const j = await r.json();
    if (!r.ok) return NextResponse.json({ error: j?.error?.description ?? 'Payment gateway error' }, { status: 502 });
    rzpId = j.id;
    await db.from('orders').update({ payment_ref: rzpId }).eq('id', o.id);
  }
  return NextResponse.json({ key: id, razorpay_order_id: rzpId, amount: Math.round(Number(o.total) * 100), name: o.full_name, email: o.email, phone: o.phone });
}
