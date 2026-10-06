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
    orders.push({ id, order_no, access_token: 'demo', email: `${name.split(' ')[0].toLowerCase()}.${city.toLowerCase()}@example.com`, phone: `98${String(10000000 + Math.floor(r() * 89999999))}`, full_name: name,
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
  const reviewTxt = [['Calming and pure', 'Two drops in my diffuser and the whole room relaxes. Smells exactly like fresh lavender.'], ['Great for my scalp', 'Mixed with jojoba for weekly massage, noticeable difference in a month.'], ['Strong and fresh', 'Very concentrated, a little goes a long way.'], ['Not for me', 'Scent was stronger than I expected.'], ['Lovely packaging', 'Amber bottle, sealed well, arrived quickly in Bengaluru.']];
  const reviews: Row[] = Array.from({ length: 24 }, (_, i) => { const p = pick(products); const [title, body] = pick(reviewTxt); return { id: `rv${i}`, product_id: p.id, author: pick(names), rating: title === 'Not for me' ? 3 : 4 + Math.round(r()), title, body, verified: r() < .7, status: i < 6 ? 'pending' : r() < .9 ? 'approved' : 'rejected', created_at: new Date(now - Math.floor(r() * 50) * 864e5).toISOString() }; });
  const redirects: Row[] = [['/products', '/shop'], ['/essential-oils', '/shop?category=essential-oils'], ['/carrier-oils', '/shop?category=carrier-oils'], ['/aromatherapy', '/categories'], ['/products/9', '/product/lavender-essential-oil'], ['/pages/about', '/about']].map(([source, destination], i) => ({ id: `rd${i}`, source, destination, permanent: true, hits: Math.floor(r() * 400), created_at: new Date(now - 20 * 864e5).toISOString() }));
  const team: Row[] = [{ id: 'demo', full_name: 'Demo Admin', email: 'demo@essencekraft.in', role: 'admin' }, { id: 'u2', full_name: 'Shilpa', email: 'shilpa@essencekraft.in', role: 'admin' }, { id: 'u3', full_name: 'Warehouse', email: 'stock@essencekraft.in', role: 'inventory' }, { id: 'u4', full_name: 'Marketing', email: 'growth@essencekraft.in', role: 'marketing' }, { id: 'u5', full_name: 'Support', email: 'care@essencekraft.in', role: 'staff' }];
  const audit_log: Row[] = Array.from({ length: 30 }, (_, i) => { const o = pick(orders); const t = pick(team); const k = pick(['order.status', 'stock.adjust', 'products.update', 'coupons.update', 'settings.update']); return { id: i + 1, actor: t.id, actor_name: t.full_name, action: k, entity: k.split('.')[0], entity_id: k === 'order.status' ? o.order_no : pick(variants).sku, detail: k === 'order.status' ? { from: 'confirmed', to: 'packed' } : k === 'stock.adjust' ? { change: 12, reason: 'purchase' } : {}, created_at: new Date(now - i * 7 * 3600e3).toISOString() }; });
  const growth = {
    abandoned_carts: orders.slice(0, 9).map((o, i) => ({ token: `00000000-0000-4000-8000-00000000000${i}`, email: i % 3 ? o.email : null, phone: o.phone, name: o.full_name, lines: T0items(o.id), subtotal: o.subtotal, consent: i % 2 === 0, recovered_order: i < 3 ? `EK${10300 + i}` : null, reminded_at: null, reminders: 0, created_at: new Date(now - (i + 2) * 3600e3).toISOString(), updated_at: new Date(now - (i + 2) * 3600e3).toISOString() })),
    landing_pages: [{ id: 'lp1', slug: 'sleep-better', title: 'Sleep better, naturally', status: 'published', blocks: [{ type: 'hero', heading: 'Sleep deeper, naturally', sub: 'Pure lavender & cedarwood oils.', cta: 'Shop sleep oils', href: '/concern/sleep-calm' }, { type: 'products', title: 'Our sleep picks', slugs: ['lavender-essential-oil', 'cedarwood-essential-oil', 'clary-sage-essential-oil'] }, { type: 'offer', title: '10% off your first order', code: 'WELCOME10', cta: 'Shop now', href: '/shop' }], seo_title: null, seo_description: null, views: 0, created_at: new Date(now - 5 * 864e5).toISOString(), updated_at: new Date(now - 5 * 864e5).toISOString() }],
    campaigns: [] as Row[],
    loyalty_ledger: orders.filter(o => o.status === 'delivered').slice(0, 25).map((o, i): Row => ({ id: i + 1, email: o.email, points: Math.floor((o.total - o.shipping) / 100), reason: 'order', order_no: o.order_no, note: null, created_at: o.created_at })),
    referral_codes: [...new Set(orders.map(o => o.email))].slice(0, 30).map((e, i) => ({ email: e, code: `REF-${e.slice(0, 4).toUpperCase()}${1000 + i}`, created_at: new Date(now - i * 864e5).toISOString() })),
    wiki_overrides: [] as Row[],
    promotions: [{ id: 'pm1', kind: 'banner', title: 'Diwali Glow Sale — 15% off', body: 'On every essential oil till 10 Nov', cta: 'Shop the sale', href: '/shop?offer=1', coupon_code: 'DIWALI15', theme: 'amber', starts_at: new Date(now - 864e5).toISOString(), ends_at: new Date(now + 20 * 864e5).toISOString(), active: true, created_at: new Date(now - 864e5).toISOString() }],
  };
  function T0items(id: string) { return order_items.filter(x => x.order_id === id).map(x => ({ variant_id: x.variant_id, name: x.product_name, label: x.variant_label, qty: x.qty, price: x.unit_price })); }
  const stock_movements: Row[] = variants.map((v, i) => ({ id: i + 1, variant_id: v.id, change: v.stock, balance: v.stock, reason: 'initial', reference: null, note: 'Opening stock', created_at: new Date(now - 95 * 864e5).toISOString() }));
  return { categories, concerns, products, variants, product_concerns, orders, order_items, leads, coupons, stock_movements, audit_log, reviews, redirects, profiles: team, ...growth,
    settings: [{ key: 'loyalty', value: { enabled: true, earn_per_100: 1, point_value: 0.5, referral_bonus: 100, referral_discount: 10, min_redeem: 100 } }, { key: 'store', value: { free_shipping_min: 999, cod_fee: 49, shipping_flat: 79, announcement: ['Free shipping on orders above ₹999', '10% off your first order with code WELCOME10', '100% pure essential oils · GC-MS tested', 'Made in India'], support_email: 'care@essencekraft.in', whatsapp: '919000000000', gstin: '', legal_name: 'EssenceKraft', address: 'Mysuru, Karnataka', hero: { heading: 'Pure Essential Oils for a Healthier You', subheading: 'Discover natural solutions for wellness, beauty and everyday living.', cta: 'Shop Essential Oils', href: '/shop?category=essential-oils' }, sections: { concerns: true, bestsellers: true, promos: true, new_arrivals: true, newsletter: true } } }] };
}
const T = build();
type TName = keyof typeof T;

function join(t: string, row: Row): Row {
  if (t === 'products') return { ...row, category: T.categories.find(c => c.id === row.category_id) ?? null, variants: T.variants.filter(v => v.product_id === row.id), product_concerns: T.product_concerns.filter(x => x.product_id === row.id) };
  if (t === 'variants') return { ...row, product: (({ name, status }) => ({ name, status }))(T.products.find(p => p.id === row.product_id) ?? { name: '?', status: 'active' }) };
  if (t === 'orders') return { ...row, order_items: T.order_items.filter(i => i.order_id === row.id) };
  if (t === 'reviews') return { ...row, product: (({ name, slug }) => ({ name, slug }))(T.products.find(p => p.id === row.product_id) ?? { name: '?', slug: '' }) };
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
  like(k: string, pat: string) { const re = new RegExp('^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$'); this.f.push(x => re.test(String(x[k] ?? ''))); return this; }
  in(k: string, v: unknown[]) { this.f.push(x => v.includes(x[k])); return this; }
  order(k: string, o?: { ascending?: boolean }) { this.ord = [k, o?.ascending !== false]; return this; }
  limit(n: number) { this.lim = n; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  insert(p: Row | Row[]) { this.op = 'insert'; this.payload = p; return this; }
  update(p: Row) { this.op = 'update'; this.payload = p; return this; }
  delete() { this.op = 'delete'; return this; }
  upsert(p: Row) { const tbl = T[this.t] as Row[]; const k = 'key' in p ? 'key' : 'id'; const ex = tbl.find(x => x[k] === p[k]); if (ex) { this.op = 'update'; this.payload = p; this.f.push(x => x === ex); } else { this.op = 'insert'; this.payload = p; } return this; }
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
  if (fn === 'redeem_points') {
    const bal = T.loyalty_ledger.filter(x => x.email === a.p_email).reduce((s, x) => s + x.points, 0);
    if (a.p_points < 100) return { data: null, error: { message: 'Minimum redemption is 100 points' } };
    if (a.p_points > bal) return { data: null, error: { message: `Only ${bal} points available` } };
    const code = `PTS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`; T.coupons.push({ id: code, code, kind: 'flat', value: Math.round(a.p_points * .5), min_cart: 0, max_uses: 1, used: 0, ends_at: null, active: true });
    T.loyalty_ledger.unshift({ id: Date.now(), email: a.p_email, points: -a.p_points, reason: 'redeem', order_no: null, note: code, created_at: new Date().toISOString() }); return { data: code, error: null };
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
