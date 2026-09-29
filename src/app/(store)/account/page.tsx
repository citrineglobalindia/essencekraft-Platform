'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { hasSupabase, browserClient } from '@/lib/supabase';

export default function TrackOrder() {
  const router = useRouter();
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return (
    <div className="wrap section" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: '2rem' }}>Track your order</h1>
      <p className="muted" style={{ margin: '6px 0 18px' }}>Enter the order number from your confirmation and the email you used at checkout.</p>
      <form className="panel form-grid" onSubmit={async e => {
        e.preventDefault(); setErr(''); setBusy(true);
        const f = new FormData(e.currentTarget); const no = String(f.get('no')).trim().toUpperCase(); const email = String(f.get('email')).trim();
        if (!hasSupabase) { router.push(`/order/${no}?t=demo`); return; }
        const { data } = await browserClient().rpc('track_order', { p_no: no, p_email: email });
        if (data) router.push(`/order/${data.order_no}?t=${data.token}`); else { setErr('No order matches that number and email.'); setBusy(false); }
      }}>
        <div className="field"><label htmlFor="no">Order number</label><input id="no" name="no" className="input" placeholder="EK10001" required /></div>
        <div className="field"><label htmlFor="em">Email</label><input id="em" name="email" type="email" className="input" required /></div>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Looking up…' : 'Find my order'}</button>
      </form>
    </div>
  );
}
