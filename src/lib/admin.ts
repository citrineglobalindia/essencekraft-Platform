'use client';
import { browserClient, hasSupabase } from './supabase';
import { demoClient } from './adminDemo';
// Real Supabase when configured; otherwise an in-browser demo dataset so the admin can be previewed.
type Client = ReturnType<typeof browserClient>;
export const db = (): Client => (hasSupabase ? browserClient() : (demoClient as unknown as Client));
export const isDemo = !hasSupabase;

/** Refresh the storefront cache after catalogue changes so they show on the live site immediately. */
export async function refreshStore(slug?: string) {
  if (!hasSupabase) return;
  try {
    const { data } = await browserClient().auth.getSession();
    const token = data.session?.access_token; if (!token) return;
    await fetch('/api/revalidate', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ slug }) });
  } catch { /* storefront will still refresh within 60s */ }
}

export function downloadCSV(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click();
}
export const statusTone: Record<string, string> = { placed: 'amber', confirmed: 'green', packed: 'green', shipped: 'green', delivered: 'green', cancelled: 'red', returned: 'grey', paid: 'green', pending: 'amber', failed: 'red', refunded: 'grey' };
export const fmtDate = (d: string) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
