'use client';
// GST tax invoice (prices are GST-inclusive). Intra-state → CGST+SGST, inter-state → IGST.
type Item = { product_name: string; variant_label: string; sku: string; unit_price: number; qty: number; hsn?: string | null; gst_rate?: number | null };
export type InvOrder = { order_no: string; invoice_no: string | null; invoice_date: string | null; created_at: string; full_name: string; email: string; phone: string;
  address: Record<string, string>; subtotal: number; discount: number; shipping: number; total: number; payment_method: string; payment_status: string; coupon_code: string | null; items: Item[] };
export type Seller = { legal_name?: string; gstin?: string; address?: string; support_email?: string; whatsapp?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const STATE_CODE: Record<string, string> = { '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh' };

function words(n: number): string {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (x: number) => x < 20 ? a[x] : `${b[Math.floor(x / 10)]}${x % 10 ? ' ' + a[x % 10] : ''}`;
  const three = (x: number) => `${x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : ''}${x % 100 ? two(x % 100) : ''}`;
  if (n === 0) return 'Zero';
  const parts: string[] = []; const cr = Math.floor(n / 1e7), lk = Math.floor((n % 1e7) / 1e5), th = Math.floor((n % 1e5) / 1000), rest = n % 1000;
  if (cr) parts.push(`${three(cr)} Crore`); if (lk) parts.push(`${two(lk)} Lakh`); if (th) parts.push(`${two(th)} Thousand`); if (rest) parts.push(three(rest));
  return parts.join(' ');
}
export function amountInWords(n: number) { const r = Math.floor(n), p = Math.round((n - r) * 100); return `Rupees ${words(r)}${p ? ` and ${words(p)} Paise` : ''} Only`; }

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

export function Invoice({ o, seller }: { o: InvOrder; seller: Seller }) {
  const t = computeTax(o, seller);
  const date = new Date(o.invoice_date ?? o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <article className="invoice">
      <header className="inv-head">
        <div><b className="inv-brand">{seller.legal_name || 'EssenceKraft'}</b><p>{seller.address || 'Mysuru, Karnataka'}</p>{seller.gstin ? <p>GSTIN: <b>{seller.gstin}</b></p> : <p className="inv-warn">GSTIN not set — add it in Admin → Settings</p>}<p>{seller.support_email}</p></div>
        <div className="inv-title"><h1>{o.invoice_no ? 'Tax Invoice' : 'Order Summary'}</h1><dl>
          {o.invoice_no && <><dt>Invoice no.</dt><dd>{o.invoice_no}</dd></>}<dt>{o.invoice_no ? 'Invoice date' : 'Order date'}</dt><dd>{date}</dd><dt>Order no.</dt><dd>{o.order_no}</dd>
          <dt>Place of supply</dt><dd>{o.address.state}</dd><dt>Payment</dt><dd>{o.payment_method === 'cod' ? 'Cash on delivery' : 'Prepaid (Razorpay)'} · {o.payment_status}</dd></dl></div>
      </header>
      <section className="inv-parties"><div><h3>Bill to / Ship to</h3><p><b>{o.full_name}</b><br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.pincode}<br />{o.phone} · {o.email}</p></div></section>
      <div className="inv-table"><table>
        <thead><tr><th>#</th><th>Item</th><th>HSN</th><th>Qty</th><th>Rate</th><th>Discount</th><th>Taxable</th><th>GST</th>{t.intra ? <><th>CGST</th><th>SGST</th></> : <th>IGST</th>}<th>Total</th></tr></thead>
        <tbody>{t.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.product_name}<br /><small>{l.variant_label} · {l.sku}</small></td><td>{l.hsn ?? '3301'}</td><td>{l.qty}</td><td>{money(Number(l.unit_price))}</td><td>{l.discount ? money(l.discount) : '—'}</td><td>{money(l.taxable)}</td><td>{l.rate}%</td>
          {t.intra ? <><td>{money(r2(l.tax / 2))}</td><td>{money(r2(l.tax - r2(l.tax / 2)))}</td></> : <td>{money(l.tax)}</td>}<td>{money(l.total)}</td></tr>)}
          {Number(o.shipping) > 0 && <tr><td>{t.lines.length + 1}</td><td>Shipping &amp; handling</td><td>9965</td><td>1</td><td>{money(Number(o.shipping))}</td><td>—</td><td>{money(t.shipTaxable)}</td><td>{t.maxRate}%</td>
            {t.intra ? <><td>{money(r2(t.shipTax / 2))}</td><td>{money(r2(t.shipTax - r2(t.shipTax / 2)))}</td></> : <td>{money(t.shipTax)}</td>}<td>{money(Number(o.shipping))}</td></tr>}</tbody>
      </table></div>
      <section className="inv-sum"><p className="inv-words"><b>Amount in words:</b> {amountInWords(Number(o.total))}</p>
        <dl><dt>Taxable value</dt><dd>{money(t.taxable)}</dd>{t.intra ? <><dt>CGST</dt><dd>{money(t.cgst)}</dd><dt>SGST</dt><dd>{money(t.sgst)}</dd></> : <><dt>IGST</dt><dd>{money(t.igst)}</dd></>}
          {o.coupon_code && <><dt>Coupon</dt><dd>{o.coupon_code}</dd></>}<dt className="inv-grand">Invoice total</dt><dd className="inv-grand">{money(Number(o.total))}</dd></dl></section>
      <footer className="inv-foot"><p>Prices are inclusive of GST. This is a computer-generated invoice and does not require a signature.</p><p>Thank you for choosing pure. — {seller.legal_name || 'EssenceKraft'}</p></footer>
    </article>
  );
}
