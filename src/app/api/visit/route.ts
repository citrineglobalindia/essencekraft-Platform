import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server';
export const dynamic = 'force-dynamic';
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|uptime|monitor/i;
// Store page-view beacon → site_visits. Bots and admin pages are ignored. Never errors to the browser.
export async function POST(req: Request) {
  try {
    if (BOT.test(req.headers.get('user-agent') ?? '')) return new NextResponse(null, { status: 204 });
    const b = await req.json().catch(() => ({}));
    const vid = String(b.vid ?? '').slice(0, 64), sid = String(b.sid ?? '').slice(0, 64), path = String(b.path ?? '').slice(0, 300);
    if (!/^[\w-]{8,64}$/.test(vid) || !/^[\w-]{8,64}$/.test(sid) || !path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return new NextResponse(null, { status: 204 });
    let ref = String(b.ref ?? '').slice(0, 300); try { if (ref && new URL(ref).host === new URL(req.url).host) ref = ''; } catch { ref = ''; }
    await adminClient().from('site_visits').insert({ vid, sid, path, referrer: ref || null });
  } catch { /* table not created yet, or transient — ignore */ }
  return new NextResponse(null, { status: 204 });
}
