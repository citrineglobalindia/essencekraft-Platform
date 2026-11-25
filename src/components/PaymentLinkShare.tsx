'use client';
import { useState } from 'react';
import { browserClient, hasSupabase } from '@/lib/supabase';
import { inr, SITE_URL } from '@/lib/format';

/** Copy / WhatsApp / email buttons for an order's secure pay link (admin). */
export function PaymentLinkShare({ id, orderNo, token, total, phone, name, expires }: { id: string; orderNo: string; token: string; total: number; phone: string; name: string; expires?: string | null }) {
  const link = `${SITE_URL}/order/${orderNo}?t=${token}`;
  const [note, setNote] = useState<{ t: 'ok' | 'error'; m: string } | null>(null); const [sending, setSending] = useState(false);
  const digits = phone.replace(/\D/g, ''); const wa = digits.length === 10 ? `91${digits}` : digits;
  const exp = expires ? new Date(expires).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const msg = `Hi ${name.split(' ')[0]}, here is the secure link to pay for your EssenceKraft order ${orderNo} (${inr(total)}):\n${link}${exp ? `\n\nPlease complete the payment by ${exp}.` : ''}`;
  const copy = async () => { try { await navigator.clipboard.writeText(link); setNote({ t: 'ok', m: 'Link copied.' }); } catch { setNote({ t: 'error', m: 'Copy failed — select the link and copy it manually.' }); } };
  const email = async () => {
    setSending(true); setNote(null);
    try {
      const { data } = hasSupabase ? await browserClient().auth.getSession() : { data: { session: null } };
      const r = await fetch('/api/orders/payment-link', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify({ order_id: id }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? 'Email failed');
      setNote({ t: 'ok', m: `Payment link emailed to ${j.to}.` });
    } catch (e) { setNote({ t: 'error', m: e instanceof Error ? e.message : 'Email failed' }); }
    setSending(false);
  };
  return <div className="paylink">
    <label className="muted" htmlFor={`pl-${orderNo}`} style={{ fontSize: 13 }}>Payment link{exp ? ` · valid till ${exp}` : ''}</label>
    <input id={`pl-${orderNo}`} className="input" readOnly value={link} onFocus={e => e.currentTarget.select()} />
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button type="button" className="btn btn-primary btn-sm" onClick={copy}>Copy link</button>
      <a className="btn btn-ghost btn-sm" href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener">Send on WhatsApp</a>
      <button type="button" className="btn btn-ghost btn-sm" onClick={email} disabled={sending}>{sending ? 'Sending…' : 'Send by email'}</button>
      <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noopener">Open as customer ↗</a>
    </div>
    {note && <p className={`notice ${note.t}`} role="status" style={{ margin: 0 }}>{note.m}</p>}
  </div>;
}
