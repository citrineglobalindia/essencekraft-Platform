import 'server-only';
import { adminClient } from './server';

// Shiprocket integration. Credentials come from Vercel env (SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD of an API user).
// Shipment ids are looked up in Shiprocket by our order number (channel_order_id), so no extra DB columns are needed;
// courier, AWB, tracking link and status live on the order itself.
const API = 'https://apiv2.shiprocket.in/v1/external';
export const srConfigured = () => !!(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);

let tok: { v: string; exp: number } | null = null;
async function token() {
  if (tok && tok.exp > Date.now()) return tok.v;
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, cache: 'no-store',
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.token) throw new Error(`Shiprocket login failed: ${j.message ?? r.status}. Check SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD in Vercel and that the API user is Active.`);
  tok = { v: j.token, exp: Date.now() + 8 * 24 * 3600e3 }; // tokens last 10 days
  return tok.v;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sr(path: string, init: RequestInit = {}): Promise<any> {
  const r = await fetch(`${API}${path}`, { ...init, cache: 'no-store', headers: { 'content-type': 'application/json', Authorization: `Bearer ${await token()}`, ...(init.headers ?? {}) } });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) tok = null;
  if (!r.ok) throw new Error(srError(j) || `Shiprocket error ${r.status}`);
  return j;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function srError(j: any): string { if (!j) return ''; if (j.errors) return Object.values(j.errors).flat().join(' '); return j.message ?? ''; }

export type ShipCfg = { sr_auto: boolean; sr_pickup: string; sr_pickup_pincode: string; sr_weight: number; sr_l: number; sr_b: number; sr_h: number };
export async function shipCfg(): Promise<ShipCfg> {
  const { data } = await adminClient().from('settings').select('value').eq('key', 'store').maybeSingle();
  const v = (data?.value ?? {}) as Partial<ShipCfg>;
  return { sr_auto: !!v.sr_auto, sr_pickup: v.sr_pickup || 'Home-1', sr_pickup_pincode: String(v.sr_pickup_pincode || '570020'),
    sr_weight: Number(v.sr_weight) || 0.2, sr_l: Number(v.sr_l) || 10, sr_b: Number(v.sr_b) || 6, sr_h: Number(v.sr_h) || 6 };
}

const fmt = (d: Date) => { const p = (n: number) => String(n).padStart(2, '0'); const i = new Date(d.getTime() + 5.5 * 3600e3); return `${i.getUTCFullYear()}-${p(i.getUTCMonth() + 1)}-${p(i.getUTCDate())} ${p(i.getUTCHours())}:${p(i.getUTCMinutes())}`; };

/** Find this order's Shiprocket order/shipment (by our order number). */
export async function findShipment(orderNo: string) {
  const j = await sr(`/orders?search=${encodeURIComponent(orderNo)}&per_page=10`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = (j?.data ?? []).find((x: any) => String(x.channel_order_id) === orderNo && !/cancel/i.test(String(x.status)));
  if (!o) return null;
  const s = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments;
  return { sr_order_id: o.id as number, shipment_id: (s?.id ?? o.shipment_id) as number, awb: (s?.awb || o.awb_code || '') as string, courier: (s?.courier || o.courier_name || '') as string, status: String(o.status ?? '') };
}

/** Create the order in Shiprocket, assign a courier/AWB and request pickup. Safe to call again: re-uses an existing shipment. */
export async function shipOrder(orderId: string) {
  const db = adminClient();
  const { data: o, error } = await db.from('orders').select('id, order_no, email, phone, full_name, address, subtotal, discount, shipping, total, payment_method, payment_status, status, created_at, awb, order_items(product_name, variant_label, sku, unit_price, qty, hsn)').eq('id', orderId).single();
  if (error || !o) throw new Error('Order not found');
  if (o.status === 'cancelled' || o.status === 'returned') throw new Error(`Order is ${o.status}.`);
  if (o.payment_method !== 'cod' && o.payment_status !== 'paid') throw new Error('Online payment not received yet — only paid or COD orders can be shipped.');
  const ph = String(o.phone ?? '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(ph) || /^(\d)\1{9}$/.test(ph)) throw new Error(`Customer phone “${o.phone}” isn’t a valid Indian mobile number, so couriers can’t accept it. Correct it with the customer first.`);
  const cfg = await shipCfg();
  let s = await findShipment(o.order_no);
  if (!s) {
    const a = (o.address ?? {}) as Record<string, string>;
    const [first, ...rest] = String(o.full_name || 'Customer').trim().split(/\s+/);
    const units = (o.order_items ?? []).reduce((n: number, i: { qty: number }) => n + i.qty, 0) || 1;
    const c = await sr('/orders/create/adhoc', { method: 'POST', body: JSON.stringify({
      order_id: o.order_no, order_date: fmt(new Date(o.created_at)), pickup_location: cfg.sr_pickup,
      billing_customer_name: first, billing_last_name: rest.join(' '), billing_address: a.line1 || '', billing_address_2: [a.line2, a.landmark && `Near ${a.landmark}`].filter(Boolean).join(', '),
      billing_city: a.city || '', billing_pincode: a.pincode || '', billing_state: a.state || '', billing_country: 'India', billing_email: o.email, billing_phone: String(o.phone).replace(/\D/g, '').slice(-10),
      shipping_is_billing: true,
      order_items: (o.order_items ?? []).map((i: { product_name: string; variant_label: string; sku: string; unit_price: number; qty: number; hsn: string | null }) => ({ name: `${i.product_name} ${i.variant_label}`.trim(), sku: i.sku, units: i.qty, selling_price: Number(i.unit_price), discount: 0, tax: '', hsn: i.hsn || '' })),
      payment_method: o.payment_method === 'cod' ? 'COD' : 'Prepaid',
      sub_total: Number(o.subtotal), shipping_charges: Number(o.shipping), total_discount: Number(o.discount),
      length: cfg.sr_l, breadth: cfg.sr_b, height: cfg.sr_h, weight: Math.max(0.1, Math.round(cfg.sr_weight * units * 100) / 100),
    }) });
    if (!c.shipment_id) throw new Error(srError(c) || 'Shiprocket did not create the shipment.');
    s = { sr_order_id: c.order_id, shipment_id: c.shipment_id, awb: c.awb_code || '', courier: c.courier_name || '', status: String(c.status ?? '') };
  }
  if (!s.awb) {
    const a = await sr('/courier/assign/awb', { method: 'POST', body: JSON.stringify({ shipment_id: s.shipment_id }) });
    const d = a?.response?.data ?? {};
    if (!d.awb_code) throw new Error(`Order created in Shiprocket (#${s.sr_order_id}) but no courier was assigned: ${srError(a) || a?.message || 'check wallet balance / courier serviceability'}. You can assign it in Shiprocket and press “Sync tracking”.`);
    s.awb = d.awb_code; s.courier = d.courier_name || s.courier;
    await sr('/courier/generate/pickup', { method: 'POST', body: JSON.stringify({ shipment_id: [s.shipment_id] }) }).catch(() => null); // pickup may already be scheduled
  }
  await db.from('orders').update({ courier: s.courier || 'Shiprocket', awb: s.awb, tracking_url: `https://shiprocket.co/tracking/${s.awb}`,
    ...(['placed', 'confirmed'].includes(o.status) ? { status: 'packed' } : {}), updated_at: new Date().toISOString() }).eq('id', o.id);
  return s;
}

export async function labelUrl(orderNo: string) {
  const s = await findShipment(orderNo); if (!s) throw new Error('This order is not in Shiprocket yet.');
  const j = await sr('/courier/generate/label', { method: 'POST', body: JSON.stringify({ shipment_id: [s.shipment_id] }) });
  if (!j.label_url) throw new Error(srError(j) || 'Label not available yet (assign a courier first).');
  return j.label_url as string;
}

const PACKED = /AWB ASSIGNED|LABEL GENERATED|PICKUP SCHEDULED|PICKUP GENERATED|PICKUP QUEUED|PICKUP RESCHEDULED|PICKUP EXCEPTION|OUT FOR PICKUP|MANIFEST|READY TO SHIP/i;
const SHIPPED = /PICKED UP|IN TRANSIT|SHIPPED|OUT FOR DELIVERY|REACHED|DESTINATION|MISROUTED|DELAYED|UNDELIVERED/i;
/** Map Shiprocket's current status onto our order status. Returns null when nothing should change. */
export function mapStatus(cur: string): 'packed' | 'shipped' | 'delivered' | 'returned' | null {
  const c = cur.toUpperCase();
  if (c.includes('RTO')) return c.includes('DELIVERED') ? 'returned' : 'shipped';
  if (c === 'DELIVERED') return 'delivered';
  if (PACKED.test(c)) return 'packed';
  if (SHIPPED.test(c)) return 'shipped';
  return null;
}
const RANK: Record<string, number> = { placed: 0, confirmed: 1, packed: 2, shipped: 3, delivered: 4, returned: 5 };

/** Pull the latest tracking for an AWB from Shiprocket and move the order forward. Never moves an order backwards. */
export async function syncAwb(awb: string) {
  const db = adminClient();
  const { data: o } = await db.from('orders').select('id, status, expected_delivery').eq('awb', awb).maybeSingle();
  if (!o || o.status === 'cancelled') return { updated: false, reason: 'no matching order' };
  const j = await sr(`/courier/track/awb/${encodeURIComponent(awb)}`);
  const t = j?.tracking_data ?? {};
  const cur = String(t?.shipment_track?.[0]?.current_status ?? t?.shipment_track_activities?.[0]?.['sr-status-label'] ?? '');
  const edd = t?.shipment_track?.[0]?.edd || t?.etd || null;
  const to = mapStatus(cur);
  const patch: Record<string, unknown> = {};
  if (edd && !o.expected_delivery) patch.expected_delivery = String(edd).slice(0, 10);
  if (to && (RANK[to] ?? -1) > (RANK[o.status] ?? -1)) patch.status = to;
  if (Object.keys(patch).length) await db.from('orders').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', o.id);
  return { updated: !!Object.keys(patch).length, current_status: cur, status: patch.status ?? o.status };
}

/** Delivery estimate + COD availability for a pincode (cheap; used on the product page). */
export async function serviceability(pincode: string, cod: boolean) {
  const cfg = await shipCfg();
  const j = await sr(`/courier/serviceability/?pickup_postcode=${cfg.sr_pickup_pincode}&delivery_postcode=${pincode}&weight=${cfg.sr_weight}&cod=${cod ? 1 : 0}`).catch(() => null);
  const list = (j?.data?.available_courier_companies ?? []) as { etd?: string; estimated_delivery_days?: string | number; cod?: number }[];
  if (!list.length) return { serviceable: false };
  const days = Math.min(...list.map(c => Number(c.estimated_delivery_days) || 99));
  return { serviceable: true, days: days === 99 ? null : days, cod: list.some(c => Number(c.cod) === 1) };
}

/** Auto-ship hook (Admin → Settings → “Send confirmed orders to Shiprocket automatically”). Never throws. */
export async function autoShip(orderNo: string) {
  try {
    if (!srConfigured()) return;
    const cfg = await shipCfg(); if (!cfg.sr_auto) return;
    const { data } = await adminClient().from('orders').select('id').eq('order_no', orderNo).maybeSingle();
    if (data) await shipOrder(data.id);
  } catch (e) { console.error('[shiprocket:auto]', orderNo, e instanceof Error ? e.message : e); }
}
