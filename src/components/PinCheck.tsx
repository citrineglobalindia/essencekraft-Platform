'use client';
import { useEffect, useState } from 'react';
// Product page: “Check delivery” — estimated days + COD availability from Shiprocket.
export function PinCheck() {
  const [pin, setPin] = useState(''); const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ t: 'ok' | 'no'; m: string } | null>(null);
  useEffect(() => { try { const p = localStorage.getItem('ek_pin'); if (p) setPin(p); } catch {} }, []);
  const check = async (e: React.FormEvent) => {
    e.preventDefault(); setRes(null);
    if (!/^[1-9]\d{5}$/.test(pin)) return setRes({ t: 'no', m: 'Enter a valid 6-digit pincode.' });
    setBusy(true); try { localStorage.setItem('ek_pin', pin); } catch {}
    const j = await fetch(`/api/shipping/check?pincode=${pin}`).then(r => r.json()).catch(() => ({ serviceable: null }));
    setBusy(false);
    if (j.serviceable === false) return setRes({ t: 'no', m: 'Sorry, we don’t deliver to this pincode yet.' });
    if (j.serviceable === null || j.serviceable === undefined) return setRes({ t: 'ok', m: 'We deliver across India — usually in 3–7 days.' });
    const when = j.days ? new Date(Date.now() + (j.days + 1) * 864e5).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : null;
    setRes({ t: 'ok', m: `${when ? `Delivery by ${when}` : 'Delivers to this pincode'}${j.cod ? ' · Cash on delivery available' : ' · Prepaid only'}` });
  };
  return <div className="pin-check">
    <b style={{ fontSize: 14 }}>Check delivery</b>
    <form onSubmit={check}><label className="sr" htmlFor="pin">Pincode</label>
      <input id="pin" className="input" inputMode="numeric" maxLength={6} placeholder="Enter pincode" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} />
      <button className="btn btn-ghost" disabled={busy}>{busy ? 'Checking…' : 'Check'}</button></form>
    {res && <p className={res.t} role="status">{res.m}</p>}
  </div>;
}
