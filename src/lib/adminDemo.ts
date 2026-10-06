'use client';
// In-browser demo backend for the admin when Supabase isn't connected yet.
// Mimics the subset of the supabase-js query API the admin uses, over generated sample data.
import { products as seedProducts, categories as seedCats, concerns as seedCons } from './seed';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
let rnd = 7; const r = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

function build() {
  const categories = seedCats.map((c, i) => ({ id: `c${i}`, ...c, sort: i }));
  const concerns = seedCons.map((c, i) => ({ id: `k${i}`, ...c, sort: i }));
  const products: Row[] = []; const variants: Row[] = []; const product_concerns: Row[] = [];
  seedProducts.forEach(p => {
    const { variants: vs, concerns: cs, category, ...rest } = p;
    products.push({ ...rest, category_id: categories.find(c => c.slug === category)?.id ?? null, status: 'active', claim_status: 'pending' });
    vs.forEach((v, j) => variants.push({ ...v, product_id: p.id, sort: j, reserved: 0 }));
    cs.forEach(slug => { const k = concerns.find(c => c.slug === slug); if (k) product_concerns.push({ product_id: p.id, concern_id: k.id }); });
  });
  const names = ['Ananya Rao', 'Rahul Menon', 'Priya Sharma', 'Karthik Iyer', 'Sneha Patil', 'Vikram Shetty', 'Divya Nair', 'Arjun Reddy', 'Meera Joshi', 'Rohan Das', 'Kavya Hegde', 'Aditya Kulkarni'];
  const cities = [['Bengaluru', 'Karnataka', '560001'], ['Mumbai', 'Maharashtra', '400001'], ['Chennai', 'Tamil Nadu', '600001'], ['Hyderabad', 'Telangana', '500001'], ['Pune', 'Maharashtra', '411001'], ['Delhi', 'Delhi', '110001'], ['Mysuru', 'Karnataka', '570001']];
  const sources = [{ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'brand' }, { utm_source: 'meta', utm_medium: 'paid_social', utm_campaign: 'sleep_oils' }, { utm_source: 'instagram', utm_medium: 'social' }, { referrer: 'https://www.google.com/' }, {}, {}];
  const statuses = ['delivered', 'delivered', 'delivered', 'shipped', 'shipped', 'packed', 'confirmed', 'placed', 'cancelled'];
  const orders: Row[] = []; const order_items: Row[] = [];
  const now = Date.now();
  for (let i = 0; i < 140; i++) {
    const age = Math.floor(Math.pow(r(), 1.25) * 90); const created = new Date(now - age * 864e5 - r() * 864e5);
    const status = age < 2 ? pick(['placed', 'confirmed']) : age < 5 ? pick(['confirmed', 'packed', 'shipped']) : pick(statuses);
    const method = r() < .62 ? 'razorpay' : 'cod'; const name = pick(names); const [city, state, pin] = pick(cities);
    const lines = 1 + Math.floor(r() * 3); let sub = 0; const id = `o${i}`; const order_no = `EK${10200 + i}`;
    for (let j = 0; j < lines; j++) { const v = pick(variants); const p = products.find(x => x.id === v.product_id)!; const qty = 1 + Math.floor(r() * 2); sub += v.price * qty;
      order_items.push({ id: order_items.length + 1, order_id: id, variant_id: v.id, product_name: p.name, variant_label: v.label, sku: v.sku, unit_price: v.price, qty }); }
    const disc = r() < .25 ? Math.round(sub * .1) : 0; const ship = (sub - disc >= 999 ? 0 : 79) + (method === 'cod' ? 49 : 0);
    const touch = { ...pick(sources), landing: '/', at: created.toISOString() };
    orders.push({ id, order_no, access_token: 'demo', email: `${name.split(' ')[0].toLowerCase()}@example.com`, phone: `98${String(10000000 + Math.floor(r() * 89999999))}`, full_name: name,
      address: { line1: `${1 + Math.floor(r() * 200)}, ${pick(['MG Road', 'Indiranagar 2nd Stage', 'Koramangala 5th Block', 'Banjara Hills', 'Anna Nagar', 'Baner Road'])}`, city, state, pincode: pin },
      subtotal: sub, discount: disc, shipping: ship, total: sub - disc + ship, coupon_code: disc ? 'WELCOME10' : null, payment_method: method,
      payment_status: status === 'cancelled' ? (method === 'cod' ? 'pending' : 'refunded') : method === 'cod' ? (status === 'delivered' ? 'paid' : 'pending') : 'paid',
      payment_ref: method === 'razorpay' ? `order_demo${i}` : null, status, tracking_url: ['shipped', 'delivered'].includes(status) ? 'https://shiprocket.co/tracking/demo' : null,
      marketing_consent: r() < .5, first_touch: touch, last_touch: touch, notes: null, created_at: created.toISOString(), updated_at: created.toISOString() });
  }
  const leads: Row[] = Array.from({ length: 46 }, (_, i) => { const n = pick(names); const at = new Date(now - Math.floor(r() * 60) * 864e5).toISOString();
    return { id: `l${i}`, source: pick(['welcome_popup', 'welcome_popup', 'newsletter', 'back_in_stock', 'whatsapp']), name: r() < .4 ? n : null, email: `${n.split(' ')[0].toLowerCase()}${i}@example.com`, phone: r() < .4 ? `97${10000000 + i}` : null,
      interest: null, landing_page: pick(['/', '/categories', '/product/lavender-essential-oil', '/concern/sleep-calm']), consent: true, status: 'new', created_at: at, first_touch: pick(sources), last_touch: pick(sources) }; });
  const coupons = [{ id: 'cp1', code: 'WELCOME10', kind: 'percent', value: 10, min_cart: 0, max_uses: null, used: 38, ends_at: null, active: true },
    { id: 'cp2', code: 'DIWALI15', kind: 'percent', value: 15, min_cart: 999, max_uses: 500, used: 0, ends_at: '2026-11-10T23:59:00Z', active: true },
    { id: 'cp3', code: 'FLAT100', kind: 'flat', value: 100, min_cart: 799, max_uses: 200, used: 61, ends_at: null, active: false }];
  const stock_movements: Row[] = variants.map((v, i) => ({ id: i + 1, variant_id: v.id, change: v.stock, balance: v.stock, reason: 'initial', reference: null, note: 'Opening stock', created_at: new Date(now - 95 * 864e5).toISOString() }));
  return { categories, concerns, products, variants, product_concerns, orders, order_items, leads, coupons, stock_movements, audit_log: [] as Row[],
    profiles: [{ id: 'demo', full_name: 'Demo Admin', role: 'admin' }], settings: [{ key: 'store', value: { free_shipping_min: 999 } }] };
}
const T = build();
type TName = keyof typeof T;

function join(t: string, row: Row): Row {
  if (t === 'products') return { ...row, category: T.categories.find(c => c.id === row.category_id) ?? null, variants: T.variants.filter(v => v.product_id === row.id), product_concerns: T.product_concerns.filter(x => x.product_id === row.id) };
  if (t === 'variants') return { ...row, product: (({ name, status }) => ({ name, status }))(T.products.find(p => p.id === row.product_id) ?? { name: '?', status: 'active' }) };
  if (t === 'orders') return { ...row, order_items: T.order_items.filter(i => i.order_id === row.id) };
  return { ...row };
}

class Query implements PromiseLike<{ data: any; error: any; count?: number }> { // eslint-disable-line @typescript-eslint/no-explicit-any
  private f: ((x: Row) => boolean)[] = []; private ord?: [string, boolean]; private lim?: number; private one?: 'single' | 'maybe';
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select'; private payload: any; private head = false; private wantCount = false; // eslint-disable-line @typescript-eslint/no-explicit-any
  constructor(private t: TName) {}
  select(_c?: string, o?: { count?: string; head?: boolean }) { if (o?.head) this.head = true; if (o?.count) this.wantCount = true; return this; }
  eq(k: string, v: unknown) { this.f.push(x => x[k] === v); return this; }
  neq(k: string, v: unknown) { this.f.push(x => x[k] !== v); return this; }
  gte(k: string, v: string) { this.f.push(x => x[k] >= v); return this; }
  lte(k: string, v: string) { this.f.push(x => x[k] <= v); return this; }
  in(k: string, v: unknown[]) { this.f.push(x => v.includes(x[k])); return this; }
  order(k: string, o?: { ascending?: boolean }) { this.ord = [k, o?.ascending !== false]; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  private run() {
    const tbl = T[this.t] as Row[];
    if (this.op === 'insert') { const rows = (Array.isArray(this.payload) ? this.payload : [this.payload]).map(x => ({ id: `${this.t[0]}${Date.now()}${Math.floor(Math.random() * 1e4)}`, created_at: new Date().toISOString(), ...x })); tbl.push(...rows); return { data: this.one ? rows[0] : rows, error: null }; }
    let rows = tbl.filter(x => this.f.every(fn => fn(x)));
    if (this.op === 'update') { rows.forEach(x => Object.assign(x, this.payload)); return { data: this.one ? rows[0] ?? null : rows, error: null }; }
    if (this.op === 'delete') { (T as Record<string, Row[]>)[this.t] = tbl.filter(x => !rows.includes(x)); return { data: null, error: null }; }
    rows = rows.map(x => join(this.t, x));
    if (this.ord) { const [k, asc] = this.ord; rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
    const count = rows.length; if (this.lim) rows = rows.slice(0, this.lim);
    if (this.head) return { data: null, error: null, count };
    if (this.one) return rows[0] || this.one === 'maybe' ? { data: rows[0] ?? null, error: null } : { data: null, error: { message: 'Not found' } };
    return { data: rows, error: null, count: this.wantCount ? count : undefined };
  }
  then<A, B>(ok?: ((v: { data: any; error: any; count?: number }) => A | PromiseLike<A>) | null, no?: ((e: unknown) => B | PromiseLike<B>) | null) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return Promise.resolve(this.run()).then(ok, no);
  }
}

function rpc(fn: string, a: Row) {
  if (fn === 'adjust_stock') {
    const v = T.variants.find(x => x.id === a.p_variant); if (!v) return { data: null, error: { message: 'Variant not found' } };
    if (v.stock + a.p_change < 0) return { data: null, error: { message: 'Stock cannot go below zero' } };
    v.stock += a.p_change; T.stock_movements.push({ id: T.stock_movements.length + 1, variant_id: v.id, change: a.p_change, balance: v.stock, reason: a.p_reason, reference: a.p_ref ?? null, note: a.p_note ?? null, created_at: new Date().toISOString() });
    return { data: v.stock, error: null };
  }
  if (fn === 'set_order_status') {
    const o = T.orders.find(x => x.id === a.p_order); if (!o) return { data: null, error: { message: 'Order not found' } };
    if (['cancelled', 'returned'].includes(a.p_status) && !['cancelled', 'returned'].includes(o.status))
      T.order_items.filter(i => i.order_id === o.id).forEach(i => { const v = T.variants.find(x => x.id === i.variant_id); if (v) { v.stock += i.qty; T.stock_movements.push({ id: T.stock_movements.length + 1, variant_id: v.id, change: i.qty, balance: v.stock, reason: a.p_status === 'cancelled' ? 'cancel' : 'return', reference: o.order_no, note: null, created_at: new Date().toISOString() }); } });
    o.status = a.p_status; if (a.p_tracking) o.tracking_url = a.p_tracking; return { data: null, error: null };
  }
  return { data: null, error: { message: `${fn} needs Supabase` } };
}

export const demoClient = {
  from: (t: string) => new Query(t as TName),
  rpc: (fn: string, a: Row) => Promise.resolve(rpc(fn, a)),
  auth: { getUser: async () => ({ data: { user: { id: 'demo', email: 'demo@essencekraft.in' } } }), signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({ error: null }), resetPasswordForEmail: async () => ({ error: null }) },
  storage: { from: () => ({ upload: async () => ({ error: { message: 'Image upload needs Supabase connected' } }), getPublicUrl: () => ({ data: { publicUrl: '' } }) }) },
};
