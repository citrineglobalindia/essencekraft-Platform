'use client';
declare global { interface Window { Razorpay?: new (o: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } } }

function loadScript() {
  return new Promise<void>((res, rej) => {
    if (window.Razorpay) return res();
    const s = document.createElement('script'); s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => res(); s.onerror = () => rej(new Error('Could not load payment window')); document.body.appendChild(s);
  });
}

/** Opens Razorpay for an existing order. Resolves true when verified, false when dismissed/failed. Retries reuse the same order (CHK-007). */
export async function payOrder(order_no: string, token: string): Promise<boolean> {
  await loadScript();
  const r = await fetch('/api/razorpay/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_no, token }) });
  const o = await r.json();
  if (!r.ok) throw new Error(o.error || 'Payment could not be started');
  return new Promise(resolve => {
    const rz = new window.Razorpay!({
      key: o.key, order_id: o.razorpay_order_id, amount: o.amount, currency: 'INR', name: 'EssenceKraft', description: `Order ${order_no}`,
      prefill: { name: o.name, email: o.email, contact: o.phone }, theme: { color: '#0f3d2e' },
      handler: async (resp: Record<string, string>) => {
        const v = await fetch('/api/razorpay/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ order_no, token, ...resp }) });
        resolve(v.ok);
      },
      modal: { ondismiss: () => resolve(false) },
    });
    rz.on('payment.failed', () => resolve(false));
    rz.open();
  });
}
