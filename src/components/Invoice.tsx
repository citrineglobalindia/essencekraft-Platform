'use client';
import { useEffect, useRef, useState } from 'react';
import { selText, type Sel } from '@/lib/combo';
// GST tax invoice (prices are GST-inclusive). Intra-state → CGST+SGST, inter-state → IGST.
type Item = { product_name: string; variant_label: string; sku: string; unit_price: number; qty: number; hsn?: string | null; gst_rate?: number | null; selections?: Sel[] | null };
export type InvOrder = { order_no: string; invoice_no: string | null; invoice_date: string | null; created_at: string; full_name: string; email: string; phone: string;
  address: Record<string, string>; subtotal: number; discount: number; shipping: number; total: number; payment_method: string; payment_status: string; coupon_code: string | null; items: Item[] };
export type Seller = { legal_name?: string; gstin?: string; address?: string; support_email?: string; whatsapp?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATE_CODE: Record<string, string> = { '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh' };

function words(n: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? '-' + a[x % 10] : ''}`;
  const three = (x: number) => `${x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' and ' : '') : ''}${x % 100 ? two(x % 100) : ''}`;
  if (n === 0) return 'Zero';
  const parts: string[] = []; const cr = Math.floor(n / 1e7), lk = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1000), rest = n % 1000;
  if (cr) parts.push(`${three(cr)} Crore`); if (lk) parts.push(`${two(lk)} Lakh`); if (th) parts.push(`${two(th)} Thousand`);
  if (rest) parts.push(n >= 1000 && rest < 100 ? `and ${two(rest)}` : three(rest));
  return parts.join(' ');
}
export function amountInWords(n: number) { const r = Math.floor(n), p = Math.round((n - r) * 100); return `Rupees ${words(r)}${p ? ` and ${words(p)} Paise` : ''} Only.`; }

export function computeTax(o: InvOrder, s: Seller) {
  const sellerState = s.gstin && /^\d{2}/.test(s.gstin) ? STATE_CODE[s.gstin.slice(0, 2)] : 'Karnataka';
  const intra = (o.address.state || '').toLowerCase() === (sellerState || '').toLowerCase();
  const gross = o.items.reduce((t, i) => t + Number(i.unit_price) * i.qty, 0) || 1;
  const disc = Number(o.discount) || 0;
  const lines = o.items.map(i => {
    const rate = Number(i.gst_rate ?? 18); const lineGross = Number(i.unit_price) * i.qty;
    const value = lineGross - disc * (lineGross / gross);           // discount spread by value
    const taxable = r2(value / (1 + rate / 100)); const tax = r2(value - taxable);
    return { ...i, rate, gross: r2(lineGross), discount: r2(lineGross - value), taxable, tax, total: r2(value) };
  });
  const maxRate = Math.max(...lines.map(l => l.rate), 0);
  const shipTaxable = r2(Number(o.shipping) / (1 + maxRate / 100)); const shipTax = r2(Number(o.shipping) - shipTaxable);
  const taxable = r2(lines.reduce((t, l) => t + l.taxable, 0) + shipTaxable); const tax = r2(lines.reduce((t, l) => t + l.tax, 0) + shipTax);
  return { intra, sellerState, lines, shipTaxable, shipTax, maxRate, taxable, tax, cgst: intra ? r2(tax / 2) : 0, sgst: intra ? r2(tax - r2(tax / 2)) : 0, igst: intra ? 0 : tax };
}

const num = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPhone = (p: string) => { const d = String(p ?? '').replace(/\D/g, '').slice(-10); return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p; };
const squash = (x: string) => x.toLowerCase().replace(/[^a-z0-9]/g, '');
/** “Name - size”, without repeating the size when the product name already includes it (e.g. “Diffuser 300ML” + “300 ml”). */
const itemName = (name: string, label?: string) => { const n = (name ?? '').trim(); const l = (label ?? '').trim(); return l && !squash(n).includes(squash(l)) ? `${n} - ${l}` : n; };
export const DEFAULT_GSTIN = '29BICPS1895N1ZD';

/** EssenceKraft invoice — A4, laid out to match the approved design (EssenceKraft_Invoice_Final.pdf). Prices are GST-inclusive. */
export function Invoice({ o, seller }: { o: InvOrder; seller: Seller }) {
  const date = new Date(o.invoice_date ?? o.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const a = o.address ?? {};
  const rows: { desc: string; sub?: string; qty: number; rate: number; amount: number }[] = o.items.map(i => ({
    desc: itemName(i.product_name, i.variant_label), sub: i.selections?.length ? selText(i.selections) : undefined,
    qty: i.qty, rate: Number(i.unit_price), amount: Number(i.unit_price) * i.qty }));
  if (Number(o.shipping) > 0) rows.push({ desc: 'Shipping charges', qty: 1, rate: Number(o.shipping), amount: Number(o.shipping) });
  if (Number(o.discount) > 0) rows.push({ desc: `Discount${o.coupon_code ? ` (${o.coupon_code})` : ''}`, qty: 1, rate: -Number(o.discount), amount: -Number(o.discount) });
  const isInv = !!o.invoice_no;
  // Scale the A4 sheet down on narrow screens; printing always uses full A4 (CSS resets the scale).
  const box = useRef<HTMLDivElement>(null); const [k, setK] = useState(1);
  useEffect(() => { const el = box.current; if (!el) return; const fit = () => setK(Math.min(1, el.clientWidth / 793.7)); fit();
    const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect(); }, []);
  return (
    <div className="ekinv-fit" ref={box} style={{ ['--k' as string]: k, height: `calc(841.89pt * ${k})` }}><article className="ekinv" aria-label={isInv ? `Invoice ${o.invoice_no}` : `Order summary ${o.order_no}`}>
      <img className="ekinv-bg" src="/invoice/letterhead.jpg" alt="" />
      <img className="ekinv-logo" src="/invoice/logo.png" alt="essenceKRAFT — The Alchemy of Scent" />
      <ul className="ekinv-contact">
        <li className="b12">+91 96069 90666</li>
        <li className="b11">www.essencekraft.in</li>
        <li className="r11">No 32, ground floor, 8th main<br />Yadavagiri, Mysore - 570020</li>
      </ul>
      <h1 className="ekinv-title">{isInv ? 'INVOICE' : 'ORDER SUMMARY'}</h1>
      <div className="ekinv-bill">
        <b>Bill to</b>
        <span>{o.full_name}</span>
        {a.line1 && <span>{a.line1}{a.line2 ? ',' : ''}</span>}
        {a.line2 && <span>{a.line2}{/,\s*$/.test(a.line2) ? '' : ','}</span>}
        <span>{[a.city, a.pincode].filter(Boolean).join(' - ')}</span>
        <span>Phone: {fmtPhone(o.phone)}</span>
      </div>
      <div className="ekinv-meta">
        <span><b>{isInv ? 'Invoice date:' : 'Order date:'}</b> {date}</span>
        <span><b>{isInv ? 'Invoice no.:' : 'Order no.:'} {isInv ? o.invoice_no : o.order_no}</b></span>
        <span><b>GSTIN:</b> {seller.gstin || DEFAULT_GSTIN}</span>
      </div>
      <div className="ekinv-body">
        <table className="ekinv-table">
          <thead><tr><th className="c-no">#</th><th className="c-desc">Item description</th><th className="c-num">Qty</th><th className="c-num">Rate (INR)</th><th className="c-amt">Amount (INR)</th></tr></thead>
          <tbody>{rows.map((r, i) => <tr key={i}><td className="c-no">{i + 1}</td><td className="c-desc">{r.desc}{r.sub && <small>{r.sub}</small>}</td><td className="c-num">{r.qty}</td><td className="c-num">{r.rate < 0 ? '-' : ''}{num(Math.abs(r.rate))}</td><td className="c-amt">{r.amount < 0 ? '-' : ''}{num(Math.abs(r.amount))}</td></tr>)}</tbody>
        </table>
        <div className="ekinv-total"><span>Total amount (INR)</span><span>{num(Number(o.total))}</span></div>
        <p className="ekinv-words"><b>Amount in words:</b> {amountInWords(Number(o.total))}</p>
        <p className="ekinv-gst">All prices and the total amount are inclusive of GST.</p>
        <p className="ekinv-foot">This is a computer-generated invoice and does not require a physical signature.</p>
      </div>
    </article></div>
  );
}
