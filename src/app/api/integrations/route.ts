import { NextResponse } from 'next/server';
import { isStaffRequest } from '@/lib/staff';
import { adminClient } from '@/lib/server';
import { srConfigured, srPing, shipCfg } from '@/lib/shiprocket';
import { PIXEL_ID } from '@/lib/attribution';
import { WHATSAPP, SITE_URL } from '@/lib/format';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type S = { key: string; name: string; what: string; status: 'ok' | 'error' | 'off'; detail: string };
const withTimeout = <T,>(p: Promise<T>, ms = 8000) => Promise.race([p, new Promise<never>((_, r) => setTimeout(() => r(new Error('timed out')), ms))]);
async function check(fn: () => Promise<Omit<S, 'key' | 'name' | 'what'>>): Promise<Omit<S, 'key' | 'name' | 'what'>> {
  try { return await withTimeout(fn()); } catch (e) { return { status: 'error', detail: e instanceof Error ? e.message : 'Check failed' }; }
}

// Live integration status for Admin → Settings. Never returns secret values — only whether each service answers.
export async function GET(req: Request) {
  if (!(await isStaffRequest(req))) return NextResponse.json({ error: 'Staff only' }, { status: 403 });
  const env = process.env;
  const rows: S[] = await Promise.all([
    check(async () => { const { error } = await adminClient().from('settings').select('key', { head: true, count: 'exact' }); if (error) throw error; return { status: 'ok', detail: 'Database, login and storage reachable' }; })
      .then(r => ({ key: 'supabase', name: 'Supabase', what: 'Database, login, storage', ...r })),
    check(async () => {
      if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) return { status: 'off', detail: 'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in Vercel' };
      const r = await fetch('https://api.razorpay.com/v1/payments?count=1', { headers: { Authorization: 'Basic ' + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64') }, cache: 'no-store' });
      if (r.status === 401) return { status: 'error', detail: 'Keys rejected by Razorpay — check the key id/secret in Vercel' };
      if (!r.ok) return { status: 'error', detail: `Razorpay answered ${r.status}` };
      const mode = env.RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'Live mode' : 'Test mode';
      return { status: 'ok', detail: `${mode} · keys valid${env.RAZORPAY_WEBHOOK_SECRET ? ' · webhook secret set' : ' · webhook secret missing'}` };
    }).then(r => ({ key: 'razorpay', name: 'Razorpay', what: 'UPI, cards, net banking', ...r })),
    check(async () => {
      if (!env.BREVO_API_KEY) return { status: 'off', detail: 'BREVO_API_KEY not set — order emails are not sent' };
      const r = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': env.BREVO_API_KEY, accept: 'application/json' }, cache: 'no-store' });
      if (r.status === 401) return { status: 'error', detail: 'API key rejected by Brevo' };
      if (!r.ok) return { status: 'error', detail: `Brevo answered ${r.status}` };
      const j = await r.json().catch(() => ({}));
      const credits = (j.plan ?? []).map((p: { credits?: number; type?: string }) => p.credits).find((c: unknown) => typeof c === 'number');
      return { status: 'ok', detail: `Order & team emails active${credits != null ? ` · ${credits} email credits left` : ''}` };
    }).then(r => ({ key: 'brevo', name: 'Brevo', what: 'Order confirmations, team invites', ...r })),
    check(async () => {
      if (!srConfigured()) return { status: 'off', detail: 'SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD not set' };
      await srPing(); const c = await shipCfg();
      return { status: 'ok', detail: `Signed in · pickup “${c.sr_pickup}” · auto-send ${c.sr_auto ? 'ON' : 'OFF (use “Ship with Shiprocket” on each order)'}` };
    }).then(r => ({ key: 'shiprocket', name: 'Shiprocket', what: 'Shipping, labels, tracking', ...r })),
    Promise.resolve({ key: 'meta', name: 'Meta Pixel', what: 'Facebook/Instagram ads tracking', status: PIXEL_ID ? 'ok' : 'off', detail: PIXEL_ID ? `Pixel ${PIXEL_ID} on all store pages` : 'Not set' } as S),
    Promise.resolve({ key: 'gtm', name: 'Google Tag Manager', what: 'GA4, Google Ads', status: env.NEXT_PUBLIC_GTM_ID ? 'ok' : 'off', detail: env.NEXT_PUBLIC_GTM_ID ? `Container ${env.NEXT_PUBLIC_GTM_ID}` : 'Not set — add NEXT_PUBLIC_GTM_ID in Vercel to enable GA4' } as S),
    Promise.resolve({ key: 'whatsapp', name: 'WhatsApp', what: 'Chat button & order help', status: WHATSAPP ? 'ok' : 'off', detail: WHATSAPP ? `+${WHATSAPP.slice(0, 2)} ${WHATSAPP.slice(2)}` : 'Not set' } as S),
  ]);
  return NextResponse.json({ checked_at: new Date().toISOString(), site: SITE_URL, rows }, { headers: { 'cache-control': 'no-store' } });
}
