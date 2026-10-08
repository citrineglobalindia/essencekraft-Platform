'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useCart } from '@/lib/cart';
import { COD_FEE, SHIPPING_FLAT, inr } from '@/lib/format';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { getAttribution, track } from '@/lib/attribution';
import { payOrder } from '@/lib/pay';
import { useUser } from '@/lib/account';

const STATES = ['Andaman and Nicobar Islands','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chandigarh','Chhattisgarh','Dadra and Nagar Haveli and Daman and Diu','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jammu and Kashmir','Jharkhand','Karnataka','Kerala','Ladakh','Lakshadweep','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Puducherry','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'];
type Coupon = { code: string; kind: 'percent' | 'flat'; value: number };

export default function Checkout() {
  const { lines, subtotal, clear } = useCart();
  const router = useRouter();
  const [f, setF] = useState({ email: '', phone: '', full_name: '', line1: '', line2: '', landmark: '', city: '', state: 'Karnataka', pincode: '' });
  const [consent, setConsent] = useState(false);
  const [method, setMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [code, setCode] = useState(''); const [coupon, setCoupon] = useState<Coupon | null>(null); const [couponMsg, setCouponMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false); const [fail, setFail] = useState('');
  const [fees, setFees] = useState({ free_shipping_min: 999, shipping_flat: SHIPPING_FLAT, cod_fee: COD_FEE });
  // Signed-in shoppers: prefill from their profile and saved addresses
  const user = useUser(); const [saved, setSaved] = useState<{ id: string; label: string; full_name: string; phone: string; line1: string; line2: string | null; city: string; state: string; pincode: string; is_default: boolean }[]>([]); const [saveAddr, setSaveAddr] = useState(true);
  useEffect(() => {
    if (!user || !hasSupabase) return; const c = browserClient();
    setF(x => ({ ...x, email: x.email || user.email }));
    c.from('addresses').select('*').order('is_default', { ascending: false }).then(({ data }) => { const a = data ?? []; setSaved(a); if (a[0]) { const d = a[0]; setF(x => ({ ...x, full_name: x.full_name || d.full_name, phone: x.phone || d.phone, line1: x.line1 || d.line1, line2: x.line2 || (d.line2 ?? ''), city: x.city || d.city, state: d.state, pincode: x.pincode || d.pincode })); } });
    c.from('profiles').select('full_name,phone').eq('id', user.id).maybeSingle().then(({ data }) => data && setF(x => ({ ...x, full_name: x.full_name || (data.full_name ?? ''), phone: x.phone || (data.phone ?? '') })));
  }, [user]);
  useEffect(() => { fetch('/api/settings').then(r => r.json()).then(setFees).catch(() => {}); }, []);
  // Abandoned-cart capture: once a valid email or mobile is entered, keep the cart recoverable.
  useEffect(() => {
    if (!hasSupabase || !lines.length) return;
    const okEmail = /^\S+@\S+\.\S+$/.test(f.email), okPhone = /^[6-9]\d{9}$/.test(f.phone.replace(/^\+?91/, ''));
    if (!okEmail && !okPhone) return;
    const t = setTimeout(() => {
      let token = ''; try { token = localStorage.getItem('ek_cart_token') || crypto.randomUUID(); localStorage.setItem('ek_cart_token', token); } catch { return; }
      browserClient().rpc('save_cart', { p_token: token, p_email: okEmail ? f.email : null, p_phone: okPhone ? f.phone.replace(/^\+?91/, '') : null, p_name: f.full_name || null,
        p_lines: lines.map(l => ({ variant_id: l.variant_id, product_slug: l.product_slug, name: l.name, label: l.label, price: l.price, qty: l.qty, color: l.color })), p_subtotal: subtotal, p_consent: consent }).then(() => {}, () => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [f.email, f.phone, f.full_name, lines, subtotal, consent]);

  useEffect(() => { if (lines.length) track('begin_checkout', { currency: 'INR', value: subtotal, items: lines.map(l => ({ item_id: l.variant_id, item_name: l.name, item_variant: l.label, price: l.price, quantity: l.qty })) }); /* eslint-disable-next-line */ }, []);

  const t = useMemo(() => {
    const discount = coupon ? (coupon.kind === 'percent' ? Math.round(subtotal * coupon.value) / 100 : Math.min(coupon.value, subtotal)) : 0;
    const shipping = (subtotal - discount >= fees.free_shipping_min ? 0 : fees.shipping_flat) + (method === 'cod' ? fees.cod_fee : 0);
    return { discount, shipping, total: subtotal - discount + shipping };
  }, [subtotal, coupon, method, fees]);

  const upd = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(s => ({ ...s, [k]: e.target.value }));
  const validate = () => {
    const e: Record<string, string> = {};
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address.';
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/^\+?91/, ''))) e.phone = 'Enter a 10-digit Indian mobile number.';
    if (f.full_name.trim().length < 2) e.full_name = 'Enter the recipient’s full name.';
    if (f.line1.trim().length < 5) e.line1 = 'Enter house number, building and street.';
    if (!f.city.trim()) e.city = 'Enter a city.';
    if (!/^[1-9]\d{5}$/.test(f.pincode)) e.pincode = 'Enter a valid 6-digit pincode.';
    setErrors(e); return !Object.keys(e).length;
  };

  const applyCoupon = async () => {
    setCouponMsg('');
    if (!code.trim()) return;
    if (!hasSupabase) { if (code.trim().toUpperCase() === 'WELCOME10') { setCoupon({ code: 'WELCOME10', kind: 'percent', value: 10 }); setCouponMsg('WELCOME10 applied'); } else setCouponMsg('This code isn’t valid.'); return; }
    const { data } = await browserClient().rpc('validate_coupon', { p_code: code.trim(), p_subtotal: subtotal });
    if (data) { setCoupon({ ...data, value: Number(data.value) }); setCouponMsg(`${data.code} applied`); } else { setCoupon(null); setCouponMsg('This code isn’t valid for your cart.'); }
  };

  const placeOrder = async () => {
    if (!validate()) { document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ block: 'center' }); return; }
    setBusy(true); setFail('');
    track('add_payment_info', { currency: 'INR', value: t.total, payment_type: method });
    const payload = {
      email: f.email.trim(), phone: f.phone.replace(/^\+?91/, ''), full_name: f.full_name.trim(), payment_method: method, consent,
      coupon: coupon?.code ?? '', address: { line1: f.line1, line2: f.line2, landmark: f.landmark, city: f.city, state: f.state, pincode: f.pincode, country: 'IN' },
      items: lines.map(l => ({ variant_id: l.variant_id, qty: l.qty })), ...getAttribution(),
    };
    try {
      let order_no: string, token: string;
      if (!hasSupabase) {
        order_no = 'EK' + String(Date.now()).slice(-6); token = 'demo';
        const demo = JSON.parse(localStorage.getItem('ek_demo_orders') || '{}');
        demo[order_no] = { ...payload, order_no, items: lines, subtotal, ...t, status: 'placed', payment_status: method === 'cod' ? 'pending' : 'paid', created_at: new Date().toISOString() };
        localStorage.setItem('ek_demo_orders', JSON.stringify(demo));
      } else {
        const { data, error } = await browserClient().rpc('place_order', { payload });
        if (error) throw new Error(error.message);
        ({ order_no, token } = data);
        if (user && saveAddr && !saved.some(a => a.line1.trim().toLowerCase() === f.line1.trim().toLowerCase() && a.pincode === f.pincode))
          await browserClient().from('addresses').insert({ label: saved.length ? 'Address' : 'Home', full_name: f.full_name, phone: f.phone.replace(/\D/g, '').slice(-10), line1: f.line1, line2: f.line2 || null, city: f.city, state: f.state, pincode: f.pincode, is_default: !saved.length }).then(() => {}, () => {});
      }
      clear(); try { localStorage.removeItem('ek_cart_token'); } catch {}
      if (method === 'razorpay' && hasSupabase) {
        const paid = await payOrder(order_no, token).catch(() => false);
        router.push(`/order/${order_no}?t=${token}${paid ? '' : '&retry=1'}`);
      } else { if (hasSupabase) await fetch('/api/orders/confirm', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ order_no, token }) }).catch(() => {}); router.push(`/order/${order_no}?t=${token}`); }
    } catch (e) { setFail(e instanceof Error ? e.message : 'Order could not be placed.'); setBusy(false); }
  };

  if (!lines.length && !busy) return <div className="wrap empty" style={{ minHeight: '50vh' }}><h1 style={{ fontSize: '2rem' }}>Nothing to check out</h1><Link className="btn btn-primary" href="/shop">Browse products</Link></div>;
  const F = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, cls = '') => (
    <div className={`field ${cls}`}><label htmlFor={k}>{label}</label>
      <input id={k} className="input" value={f[k]} onChange={upd(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-e` : undefined} {...props} />
      {errors[k] && <span id={`${k}-e`} className="err">{errors[k]}</span>}</div>);

  return (
    <div className="wrap checkout">
      <div>
        {user === null && hasSupabase && <p className="notice" style={{ marginBottom: 12 }}>Have an account? <Link className="link" href="/account?next=/checkout">Sign in</Link> for saved addresses and order history — or continue as a guest.</p>}
        <section className="panel"><h2>Contact</h2>
          <div className="form-grid two">
            {F('email', 'Email', { type: 'email', autoComplete: 'email' })}
            {F('phone', 'Mobile number', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national', maxLength: 13 })}
            <label className="check span2"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />Send me offers and new-launch updates by email and WhatsApp (optional)</label>
            <p className="muted span2" style={{ fontSize: 12 }}>We save your cart with these details so you can pick up where you left off, and may send one reminder if you don&apos;t finish checking out.</p>
          </div></section>
        <section className="panel"><h2>Delivery address</h2>
          {saved.length > 1 && <div className="adm-chips" style={{ marginBottom: 12 }}>{saved.map(a => <button type="button" key={a.id} className={`adm-chip${f.line1 === a.line1 && f.pincode === a.pincode ? ' on' : ''}`} onClick={() => setF(x => ({ ...x, full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, pincode: a.pincode }))}>{a.label}: {a.line1.slice(0, 24)}…</button>)}</div>}
          <div className="form-grid two">
            {F('full_name', 'Full name', { autoComplete: 'name' }, 'span2')}
            {F('line1', 'House no., building, street', { autoComplete: 'address-line1' }, 'span2')}
            {F('line2', 'Area / locality (optional)', { autoComplete: 'address-line2' })}
            {F('landmark', 'Landmark (optional)')}
            {F('pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6, autoComplete: 'postal-code' })}
            {F('city', 'City', { autoComplete: 'address-level2' })}
            <div className="field span2"><label htmlFor="state">State</label><select id="state" className="select" value={f.state} onChange={upd('state')}>{STATES.map(s => <option key={s}>{s}</option>)}</select></div>
            {user && <label className="check span2"><input type="checkbox" checked={saveAddr} onChange={e => setSaveAddr(e.target.checked)} />Save this address to my account</label>}
          </div></section>
        <section className="panel"><h2>Payment</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            <label className="pay-opt"><input type="radio" name="pm" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} /><span><b>UPI, cards, net banking, wallets</b><br /><small className="muted">Secured by Razorpay. We never see your card details.</small></span></label>
            <label className="pay-opt"><input type="radio" name="pm" checked={method === 'cod'} onChange={() => setMethod('cod')} /><span><b>Cash on delivery</b><br /><small className="muted">{fees.cod_fee ? `${inr(fees.cod_fee)} handling fee` : 'No extra fee'}</small></span></label>
          </div></section>
      </div>
      <aside style={{ alignSelf: 'start', position: 'sticky', top: 90 }}>
        <section className="panel"><h2>Order summary</h2>
          {lines.map(l => <div key={l.variant_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 14, padding: '6px 0' }}><span>{l.name} <span className="muted">· {l.label} × {l.qty}</span></span><b>{inr(l.price * l.qty)}</b></div>)}
          <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}><label className="sr" htmlFor="coupon">Coupon code</label><input id="coupon" className="input" placeholder="Coupon code" value={code} onChange={e => setCode(e.target.value)} /><button className="btn btn-ghost" onClick={applyCoupon}>Apply</button></div>
          {couponMsg && <p className={coupon ? 'notice ok' : 'err'} style={{ marginBottom: 10 }}>{couponMsg}</p>}
          <div className="totals">
            <div><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            {t.discount > 0 && <div><span>Discount ({coupon?.code})</span><span>−{inr(t.discount)}</span></div>}
            <div><span>Shipping{method === 'cod' ? ' + COD' : ''}</span><span>{t.shipping ? inr(t.shipping) : 'Free'}</span></div>
            <div className="grand"><span>Total payable</span><span>{inr(t.total)}</span></div>
          </div>
          {fail && <p className="notice error" role="alert" style={{ marginTop: 12 }}>{fail}</p>}
          <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={busy} onClick={placeOrder}>{busy ? 'Placing order…' : method === 'cod' ? `Place order · ${inr(t.total)}` : `Pay ${inr(t.total)}`}</button>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>By placing this order you agree to our <Link href="/pages/terms" className="link">terms</Link> and <Link href="/pages/refund" className="link">refund policy</Link>.</p>
        </section>
      </aside>
    </div>
  );
}
