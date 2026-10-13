import { NextResponse } from 'next/server';
import { adminClient } from '@/lib/server';
import { adminCaller } from '@/lib/staff';
import { setPasswordLink, teamEmail } from '@/lib/teamMail';
import { ROLE_INFO } from '@/lib/roles';
export const dynamic = 'force-dynamic';
const ROLES = ['admin', 'staff', 'inventory', 'marketing'];
const label = (r: string) => ROLE_INFO.find(x => x[0] === r)?.[1] ?? r;
const deny = () => NextResponse.json({ error: 'Only admins can manage the team.' }, { status: 403 });

async function allUsers() {
  const db = adminClient(); const out = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error; out.push(...data.users); if (data.users.length < 1000) break;
  }
  return out;
}
async function adminCount() { const { count } = await adminClient().from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin'); return count ?? 0; }

// List team members (everyone whose role isn't customer), with email and sign-in status.
export async function GET(req: Request) {
  if (!(await adminCaller(req))) return deny();
  const db = adminClient();
  const { data: ps } = await db.from('profiles').select('id, full_name, role').neq('role', 'customer');
  const users = await allUsers(); const byId = new Map(users.map(u => [u.id, u]));
  const rows = (ps ?? []).map(p => { const u = byId.get(p.id); return { id: p.id, full_name: p.full_name, role: p.role, email: u?.email ?? '', last_sign_in_at: u?.last_sign_in_at ?? null, invited_at: u?.invited_at ?? null, pending: !u?.last_sign_in_at }; });
  rows.sort((a, b) => ROLES.indexOf(a.role) - ROLES.indexOf(b.role) || (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email));
  return NextResponse.json({ rows });
}

// Invite (new email) or grant a role (existing account). Sends a set-password / access email via Brevo.
export async function POST(req: Request) {
  if (!(await adminCaller(req))) return deny();
  const { email: raw, full_name, role, resend } = await req.json().catch(() => ({}));
  const email = String(raw ?? '').trim().toLowerCase(); const name = String(full_name ?? '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (!resend && !ROLES.includes(role)) return NextResponse.json({ error: 'Choose a role.' }, { status: 400 });
  const db = adminClient(); const origin = new URL(req.url).origin;
  const existing = (await allUsers()).find(u => u.email?.toLowerCase() === email);
  let userId: string; let link: string; let isNew = false;
  if (!existing) {
    const g = await db.auth.admin.generateLink({ type: 'invite', email, options: { data: { full_name: name } } });
    if (g.error || !g.data.user) return NextResponse.json({ error: g.error?.message ?? 'Could not create the invite.' }, { status: 500 });
    userId = g.data.user.id; link = setPasswordLink(origin, g.data.properties.hashed_token, 'invite'); isNew = true;
  } else {
    userId = existing.id;
    const g = await db.auth.admin.generateLink({ type: existing.last_sign_in_at ? 'magiclink' : 'recovery', email });
    link = g.data?.properties?.hashed_token ? setPasswordLink(origin, g.data.properties.hashed_token, existing.last_sign_in_at ? 'magiclink' : 'recovery') : `${origin}/admin/login`;
  }
  // Profile row is created by the signup trigger; upsert covers any race.
  const patch: Record<string, unknown> = { id: userId }; if (!resend) patch.role = role; if (name) patch.full_name = name;
  const { data: prof } = await db.from('profiles').select('role, full_name').eq('id', userId).maybeSingle();
  if (!resend && prof?.role === 'admin' && role !== 'admin' && (await adminCount()) <= 1) return NextResponse.json({ error: 'At least one admin is required.' }, { status: 400 });
  const { error: pe } = prof ? await db.from('profiles').update(patch).eq('id', userId) : await db.from('profiles').insert(patch);
  if (pe) return NextResponse.json({ error: pe.message }, { status: 500 });
  const r = resend ? (prof?.role ?? 'staff') : role; const who = name || prof?.full_name || '';
  const sent = isNew || (existing && !existing.last_sign_in_at)
    ? await teamEmail(email, who, 'You’re invited to EssenceKraft admin', `You’ve been added to the EssenceKraft admin as <b>${label(r)}</b>. Set your password to get started.`, 'Set my password', link)
    : await teamEmail(email, who, 'You now have EssenceKraft admin access', `Your account now has <b>${label(r)}</b> access to the EssenceKraft admin.`, 'Open admin', link);
  return NextResponse.json({ ok: true, invited: isNew, emailed: sent });
}

// Change a member's role.
export async function PATCH(req: Request) {
  const me = await adminCaller(req); if (!me) return deny();
  const { id, role } = await req.json().catch(() => ({}));
  if (!ROLES.includes(role) && role !== 'customer') return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });
  const db = adminClient();
  const { data: cur } = await db.from('profiles').select('role').eq('id', id).maybeSingle();
  if (!cur) return NextResponse.json({ error: 'Member not found.' }, { status: 404 });
  if (cur.role === 'admin' && role !== 'admin' && (await adminCount()) <= 1) return NextResponse.json({ error: 'At least one admin is required.' }, { status: 400 });
  const { error } = await db.from('profiles').update({ role }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.from('audit_log').insert({ actor: me, action: role === 'customer' ? 'team.remove' : 'team.role', entity: 'profile', entity_id: id, detail: { from: cur.role, to: role } }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
