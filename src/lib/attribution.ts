'use client';
// MKT-006/007: persist first-touch and last-touch campaign data from landing through order/lead.
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
export type Touch = Record<string, string> & { landing: string; referrer: string; at: string };

export function captureAttribution() {
  try {
    const u = new URL(window.location.href);
    const t: Record<string, string> = {};
    KEYS.forEach(k => { const v = u.searchParams.get(k); if (v) t[k] = v; });
    const external = document.referrer && !document.referrer.startsWith(window.location.origin);
    if (!Object.keys(t).length && !external && localStorage.getItem('ek_ft')) return;
    const touch: Touch = { ...t, landing: u.pathname, referrer: document.referrer, at: new Date().toISOString() } as Touch;
    if (!localStorage.getItem('ek_ft')) localStorage.setItem('ek_ft', JSON.stringify(touch));
    localStorage.setItem('ek_lt', JSON.stringify(touch));
  } catch { /* storage blocked */ }
}
export function getAttribution(): { first_touch: Touch | null; last_touch: Touch | null } {
  try {
    return { first_touch: JSON.parse(localStorage.getItem('ek_ft') || 'null'), last_touch: JSON.parse(localStorage.getItem('ek_lt') || 'null') };
  } catch { return { first_touch: null, last_touch: null }; }
}
// GA4 ecommerce events via dataLayer (GTM picks them up) — MKT-002
export function track(event: string, ecommerce?: Record<string, unknown>) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  if (ecommerce) w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push(ecommerce ? { event, ecommerce } : { event });
}
