'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
const id = () => (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/[^\w-]/g, '');
// Counts store page views for the admin dashboard (anonymous ids, no personal data).
export function VisitTracker() {
  const path = usePathname();
  useEffect(() => {
    try {
      let vid = localStorage.getItem('ek_vid'); if (!vid) { vid = id(); localStorage.setItem('ek_vid', vid); }
      let sid = sessionStorage.getItem('ek_sid'); if (!sid) { sid = id(); sessionStorage.setItem('ek_sid', sid); }
      const body = JSON.stringify({ vid, sid, path, ref: document.referrer });
      if (!navigator.sendBeacon?.('/api/visit', new Blob([body], { type: 'application/json' }))) fetch('/api/visit', { method: 'POST', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {});
    } catch { /* storage blocked */ }
  }, [path]);
  return null;
}
