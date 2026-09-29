export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const pctOff = (price: number, cmp: number | null) => (cmp && cmp > price ? Math.round((1 - price / cmp) * 100) : 0);
export const SHIPPING_FLAT = 79;
export const COD_FEE = 49;
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.essencekraft.in';
export const WHATSAPP = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '919000000000';
