import 'server-only';
import { adminClient } from './server';

const FROM = { name: 'EssenceKraft', email: process.env.EMAIL_FROM || 'no-reply@essencekraft.in' };
const inr = (n: number) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

export async function sendEmail(to: { email: string; name?: string }[], subject: string, html: string, replyTo?: string) {
  const key = process.env.BREVO_API_KEY;
  if (!key) { console.warn('[email] BREVO_API_KEY not set — skipped:', subject); return false; }
  const r = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST', headers: { 'api-key': key, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ sender: FROM, to, subject, htmlContent: html, ...(replyTo ? { replyTo: { email: replyTo } } : {}) }),
  });
  if (!r.ok) console.error('[email] Brevo error', r.status, await r.text());
  return r.ok;
}

/** Sends the order confirmation (customer) + new-order alert (store) once per order. Safe to call repeatedly. */
export async function sendOrderConfirmation(orderNo: string, origin: string) {
  if (!process.env.BREVO_API_KEY) { console.warn('[email] BREVO_API_KEY not set — confirmation skipped for', orderNo); return false; }
  const db = adminClient();
  // Atomic claim: only the first caller for an eligible order gets a row back.
  const { data: o } = await db.from('orders').update({ confirmation_sent_at: new Date().toISOString() })
    .eq('order_no', orderNo).is('confirmation_sent_at', null)
    .or('payment_status.eq.paid,payment_method.eq.cod')
    .select('id, order_no, access_token, email, phone, full_name, address, subtotal, discount, shipping, total, coupon_code, payment_method, payment_status, invoice_no, created_at')
    .maybeSingle();
  if (!o) return false;
  const [{ data: items }, { data: st }] = await Promise.all([
    db.from('order_items').select('product_name, variant_label, unit_price, qty').eq('order_id', o.id),
    db.from('settings').select('value').eq('key', 'store').maybeSingle(),
  ]);
  const store = (st?.value ?? {}) as { email?: string; support_email?: string; order_alert_email?: string };
  const a = (o.address ?? {}) as Record<string, string>;
  const link = `${origin}/order/${o.order_no}?t=${o.access_token}`;
  const inv = `${origin}/order/${o.order_no}/invoice?t=${o.access_token}`;
  const paid = o.payment_status === 'paid';
  const rows = (items ?? []).map(i => `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.product_name)}<br><small style="color:#777">${esc(i.variant_label)} × ${i.qty}</small></td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${inr(Number(i.unit_price) * i.qty)}</td></tr>`).join('');
  const line = (l: string, v: string, b = false) => `<tr><td style="padding:3px 0;${b ? 'font-weight:700' : 'color:#555'}">${l}</td><td style="padding:3px 0;text-align:right;${b ? 'font-weight:700' : ''}">${v}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ee;font-family:Arial,Helvetica,sans-serif;color:#222">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
 <div style="background:#2f4a3a;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px"><div style="font-size:20px;font-weight:700">EssenceKraft</div><div style="font-size:12px;opacity:.8;letter-spacing:1px">NATURE IN EVERY DROP</div></div>
 <div style="background:#fff;border-radius:0 0 12px 12px;padding:24px">
  <h1 style="font-size:20px;margin:0 0 6px">Thank you, ${esc(o.full_name?.split(' ')[0] || 'there')}! Your order is placed.</h1>
  <p style="margin:0 0 16px;color:#555">Order <b>${esc(o.order_no)}</b> · ${new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · ${paid ? 'Paid online' : 'Cash on delivery'}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:10px">
   ${line('Subtotal', inr(o.subtotal))}${Number(o.discount) ? line(`Discount${o.coupon_code ? ` (${esc(o.coupon_code)})` : ''}`, '−' + inr(o.discount)) : ''}${line('Shipping', Number(o.shipping) ? inr(o.shipping) : 'Free')}${line(paid ? 'Total paid' : 'Total to pay on delivery', inr(o.total), true)}
  </table>
  <p style="font-size:13px;color:#555;margin:16px 0 4px"><b>Delivering to</b><br>${esc(o.full_name)}, ${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}, ${esc(a.city)}, ${esc(a.state)} ${esc(a.pincode)} · ${esc(o.phone)}</p>
  <div style="margin:22px 0 8px">
   <a href="${link}" style="display:inline-block;background:#2f4a3a;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:700;margin:0 8px 8px 0">Track your order</a>
   <a href="${inv}" style="display:inline-block;border:1px solid #2f4a3a;color:#2f4a3a;text-decoration:none;padding:11px 18px;border-radius:8px;font-weight:700">${o.invoice_no ? `Download invoice ${esc(o.invoice_no)}` : 'View order summary'}</a>
  </div>
  <p style="font-size:12px;color:#888;margin-top:20px">${o.invoice_no ? 'Your GST tax invoice is available at the link above (use Download PDF / Print).' : 'Your GST tax invoice will be available at the same link once the order is confirmed.'} Questions? Just reply to this email.</p>
 </div>
</div></body></html>`;
  const replyTo = store.support_email || store.email;
  const ok = await sendEmail([{ email: o.email, name: o.full_name ?? undefined }], `Order ${o.order_no} confirmed — EssenceKraft`, html, replyTo);
  if (!ok) await db.from('orders').update({ confirmation_sent_at: null }).eq('id', o.id); // allow a retry
  const alertTo = process.env.ORDER_ALERT_EMAIL || store.order_alert_email || store.email;
  if (alertTo) await sendEmail([{ email: alertTo }], `New order ${o.order_no} · ${inr(o.total)} · ${paid ? 'PAID' : 'COD'}`,
    `<p><b>${esc(o.full_name)}</b> (${esc(o.email)}, ${esc(o.phone)}) placed <b>${esc(o.order_no)}</b> for <b>${inr(o.total)}</b> — ${paid ? 'paid online' : 'cash on delivery'}.</p><table>${rows}</table><p><a href="${origin}/admin/orders/${o.id}">Open in admin</a></p>`).catch(() => false);
  return ok;
}
