'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/attribution';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { AuthModal } from './AuthModal';

const DELAY = 2000;
const BLOCKED = ['/checkout', '/cart', '/order', '/admin', '/account'];
// Welcome offer (HOME-011): a log in / sign up popup 2s after each visit, unlocking the 10% code.
// Not shown to signed-in customers, people who already unlocked the code, or on cart/checkout/order/account pages.
export function OfferPopup() {
  const path = usePathname();
  const [open, setOpen] = useState(false); const [code, setCode] = useState('WELCOME10'); const [title, setTitle] = useState<string | undefined>();
  const shown = useRef(false);
  useEffect(() => { fetch('/api/promotions').then(r => r.json()).then(d => { if (d.popup?.coupon_code) setCode(d.popup.coupon_code); if (d.popup?.title) setTitle(d.popup.title); }).catch(() => {}); }, []);
  useEffect(() => {
    if (shown.current || BLOCKED.some(b => path.startsWith(b))) return;
    let claimed = false; try { claimed = !!localStorage.getItem('ek_offer_claimed'); } catch {}
    if (claimed) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      if (hasSupabase) { const { data } = await browserClient().auth.getSession(); if (data.session || cancelled) return; }
      shown.current = true; setOpen(true); track('view_promotion', { promotion_id: 'welcome10_popup' });
    }, DELAY);
    return () => { cancelled = true; clearTimeout(t); };
  }, [path]);
  return <AuthModal open={open} onClose={() => setOpen(false)} context="offer" code={code} title={title} />;
}
