'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { submitLead } from './LeadForm';
import { track } from '@/lib/attribution';
import { CloseIcon } from './Icons';
import { BRAND } from '@/lib/brand';

const CLAIMED = 'ek_offer_claimed';
const DELAY = 2000;
const DEFAULT = { title: '10% off your first order', body: 'Join for safe-use guides, blending tips and early access to new oils.', code: 'WELCOME10' };
const BLOCKED = ['/checkout', '/cart', '/order', '/admin', '/account'];

// Welcome offer (HOME-011 / LEAD-004): never on cart/checkout/order/account/admin pages.
export function OfferPopup() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'done'>('form');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [cfg, setCfg] = useState(DEFAULT);
  useEffect(() => { fetch('/api/promotions').then(r => r.json()).then(d => d.popup && setCfg({ title: d.popup.title, body: d.popup.body ?? DEFAULT.body, code: d.popup.coupon_code ?? DEFAULT.code })).catch(() => {}); }, []);
  const CODE = cfg.code;

  // Shows 2s after every page load / visit. Closing hides it until the next visit or refresh;
  // in-site navigation doesn't re-open it. People who already claimed the code aren't shown it again.
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current || BLOCKED.some(b => path.startsWith(b))) return;
    let claimed = false;
    try { claimed = !!localStorage.getItem(CLAIMED); } catch { /* storage blocked */ }
    if (claimed) return;
    const t = setTimeout(() => {
      shown.current = true;
      setOpen(true); track('view_promotion', { promotion_id: 'welcome10_popup' });
    }, DELAY);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', k); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  const copy = async () => { try { await navigator.clipboard.writeText(CODE); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };

  return (
    <div className="offer-wrap" onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div className="offer" role="dialog" aria-modal="true" aria-labelledby="offer-h">
        <button ref={closeBtn} className="icon-btn offer-x" aria-label="Close offer" onClick={() => setOpen(false)}><CloseIcon /></button>
        <div className="offer-art" aria-hidden><img src={BRAND.promoWellness} alt="" /><span className="offer-badge"><b>10%</b>OFF</span></div>
        <div className="offer-body">
          <span className="hero-eyebrow">WELCOME OFFER</span>
          <h2 id="offer-h">{cfg.title}</h2>
          {step === 'form' ? <>
            <p className="muted">{cfg.body}</p>
            <form onSubmit={async e => {
              e.preventDefault(); setErr('');
              const f = new FormData(e.currentTarget);
              const email = String(f.get('email') || '').trim(); const phone = String(f.get('phone') || '').replace(/\D/g, '').slice(-10);
              if (!email && !phone) return setErr('Enter your email or WhatsApp number.');
              if (phone && !/^[6-9]\d{9}$/.test(phone)) return setErr('Enter a valid 10-digit mobile number.');
              setBusy(true);
              try { await submitLead({ source: 'welcome_popup', email: email || undefined, phone: phone || undefined, consent }); setStep('done'); try { localStorage.setItem(CLAIMED, new Date().toISOString()); } catch {} }
              catch { setErr(`Something went wrong. Your code is ${CODE}.`); setStep('done'); }
              setBusy(false);
            }} className="offer-form">
              <label className="sr" htmlFor="of-email">Email</label>
              <input id="of-email" name="email" type="email" className="input" placeholder="Email address" autoComplete="email" />
              <label className="sr" htmlFor="of-phone">WhatsApp number</label>
              <input id="of-phone" name="phone" type="tel" inputMode="numeric" className="input" placeholder="WhatsApp number (optional)" autoComplete="tel-national" />
              <label className="check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Send me offers by email/WhatsApp. Unsubscribe anytime.</label>
              {err && <p className="err" role="alert">{err}</p>}
              <button className="btn btn-primary btn-block" disabled={busy || !consent}>{busy ? 'Unlocking…' : 'Unlock my 10% off'}</button>
            </form>
            <button className="link offer-skip" onClick={() => setOpen(false)}>No thanks</button>
          </> : <>
            <p>Use this code at checkout:</p>
            <button className="offer-code" onClick={copy} aria-label={`Copy code ${CODE}`}><b>{CODE}</b><span>{copied ? 'Copied ✓' : 'Tap to copy'}</span></button>
            <a className="btn btn-primary btn-block" href="/shop?sort=best" onClick={() => setOpen(false)}>Shop best sellers</a>
          </>}
        </div>
      </div>
    </div>
  );
}
