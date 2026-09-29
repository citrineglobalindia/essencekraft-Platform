'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { captureAttribution, track } from '@/lib/attribution';
export function Attribution() {
  const path = usePathname();
  useEffect(() => { captureAttribution(); }, [path]);
  useEffect(() => {
    // LEAD-003: WhatsApp clicks tracked before redirect
    const h = (e: MouseEvent) => { const a = (e.target as HTMLElement).closest('[data-track]'); if (a) track(a.getAttribute('data-track')!, { page: location.pathname }); };
    document.addEventListener('click', h); return () => document.removeEventListener('click', h);
  }, []);
  return null;
}
