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
export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '994707213669198';

// GA4 event name → Meta Pixel standard event
const META: Record<string, string> = { view_item: 'ViewContent', add_to_cart: 'AddToCart', begin_checkout: 'InitiateCheckout', add_payment_info: 'AddPaymentInfo', purchase: 'Purchase', generate_lead: 'Lead', sign_up: 'CompleteRegistration' };
type Item = { item_id?: string; item_name?: string; price?: number; quantity?: number };
function toMeta(event: string, e?: Record<string, unknown>) {
  const name = META[event];
  const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
  if (!name || !fbq) return;
  const items = (e?.items as Item[] | undefined) ?? [];
  const data: Record<string, unknown> = {};
  if (e?.value != null) { data.value = Number(e.value); data.currency = (e.currency as string) || 'INR'; }
  if (items.length) {
    data.content_type = 'product';
    data.content_ids = items.map(i => i.item_id ?? i.item_name).filter(Boolean);
    data.contents = items.map(i => ({ id: i.item_id ?? i.item_name, quantity: i.quantity ?? 1, item_price: i.price }));
    data.num_items = items.reduce((n, i) => n + (i.quantity ?? 1), 0);
    if (event === 'view_item') data.content_name = items[0].item_name;
  }
  if (event === 'add_to_cart') cartPageView();
  // order number as eventID lets Meta de-duplicate a purchase (and a future server-side Conversions API event)
  fbq('track', name, data, e?.transaction_id ? { eventID: String(e.transaction_id) } : undefined);
}

// Every add-to-cart also records a Meta page view for a fixed URL, so URL-based rules and custom conversions can use
// “URL contains cart?added” — without changing the customer's address bar (the cart drawer just opens).
export const ADDED_TO_CART_URL = 'https://www.essencekraft.in/cart?added=1';
function cartPageView() {
  if (!PIXEL_ID) return;
  const fbp = document.cookie.match(/(?:^|; )_fbp=([^;]+)/)?.[1]; const fbc = document.cookie.match(/(?:^|; )_fbc=([^;]+)/)?.[1];
  const q = new URLSearchParams({ id: PIXEL_ID, ev: 'PageView', dl: ADDED_TO_CART_URL, rl: location.href, if: 'false', ts: String(Date.now()), ...(fbp ? { fbp } : {}), ...(fbc ? { fbc } : {}) });
  new Image().src = `https://www.facebook.com/tr?${q}`;
}

// GA4 ecommerce events via dataLayer (GTM picks them up) — MKT-002 — and the same event to the Meta Pixel.
export function track(event: string, ecommerce?: Record<string, unknown>) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  if (ecommerce) w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push(ecommerce ? { event, ecommerce } : { event });
  try { toMeta(event, ecommerce); } catch { /* never break the page for analytics */ }
}
