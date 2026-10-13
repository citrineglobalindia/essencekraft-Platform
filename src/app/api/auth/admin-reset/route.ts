import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server';
import { setPasswordLink, teamEmail } from '@/lib/teamMail';
export const dynamic = 'force-dynamic';
// “Forgot password?” on the admin login. Only team members get an email; the response is identical either way.
export async function POST(req: Request) {
  const { email: raw } = await req.json().catch(() => ({}));
  const email = String(raw ?? '').trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const db = adminClient();
    const g = await db.auth.admin.generateLink({ type: 'recovery', email }).catch(() => null);
    const u = g?.data?.user;
    if (u && g?.data.properties?.hashed_token) {
      const { data: p } = await db.from('profiles').select('role, full_name').eq('id', u.id).maybeSingle();
      if (p && p.role !== 'customer') await teamEmail(email, p.full_name ?? '', 'Reset your EssenceKraft admin password', 'Use the button below to choose a new password.', 'Set a new password', setPasswordLink(new URL(req.url).origin, g.data.properties.hashed_token, 'recovery'));
    }
  }
  return NextResponse.json({ ok: true });
}
