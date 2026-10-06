'use client';
import { useState } from 'react';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { getAttribution, track } from '@/lib/attribution';

export function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', phone: '', message: '' }); const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle'); const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr('');
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email.');
    if (f.phone && !/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, '').slice(-10))) return setErr('Enter a valid 10-digit mobile number, or leave it blank.');
    if (f.message.trim().length < 5) return setErr('Please write a short message.');
    setState('busy'); const a = getAttribution();
    const row = { source: 'contact', name: f.name || null, email: f.email, phone: f.phone ? f.phone.replace(/\D/g, '').slice(-10) : null, interest: f.message.slice(0, 2000), consent, landing_page: '/contact', first_touch: a.first_touch, last_touch: a.last_touch };
    const { error } = hasSupabase ? await browserClient().from('leads').insert(row) : { error: null };
    if (error) { setState('error'); setErr('Sorry, that didn’t send. Please email us instead.'); return; }
    track('generate_lead', { method: 'contact_form' }); setState('done'); };
  if (state === 'done') return <div className="panel pg-form" role="status"><h2>Thank you — message received</h2><p>Our team will reply to {f.email} within one working day (Mon–Sat, 9 AM–6 PM IST).</p></div>;
  return <form className="panel form-grid pg-form" onSubmit={submit} noValidate>
    <h2>Send us a message</h2>
    <div className="form-grid two">
      <div className="field"><label htmlFor="c-name">Name</label><input id="c-name" className="input" autoComplete="name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" autoComplete="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
      <div className="field span2"><label htmlFor="c-phone">Mobile (optional)</label><input id="c-phone" type="tel" inputMode="numeric" className="input" autoComplete="tel-national" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
    </div>
    <div className="field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" className="textarea" required value={f.message} onChange={e => setF({ ...f, message: e.target.value })} placeholder="Your question, or your order number if it’s about an order" /></div>
    <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Also send me offers and new-launch updates (optional)</label>
    {err && <p className="err" role="alert">{err}</p>}
    <button className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button>
  </form>;
}
