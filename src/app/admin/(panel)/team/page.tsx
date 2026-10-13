'use client';
import { useCallback, useEffect, useState } from 'react';
import { browserClient, hasSupabase } from '@/lib/supabase';
import { fmtDate } from '@/lib/admin';
import { ROLE_INFO } from '@/lib/roles';
import { PageHead, Saved } from '@/components/AdminUI';

type M = { id: string; full_name: string | null; email: string; role: string; last_sign_in_at: string | null; invited_at: string | null; pending: boolean };
async function api(method: string, body?: unknown) {
  const { data } = await browserClient().auth.getSession();
  const r = await fetch('/api/team', { method, headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error ?? `Request failed (${r.status})`); return j;
}

export default function Team() {
  const [rows, setRows] = useState<M[] | null>(null); const [me, setMe] = useState('');
  const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const [f, setF] = useState({ full_name: '', email: '', role: 'staff' }); const [busy, setBusy] = useState('');
  const load = useCallback(() => api('GET').then(j => setRows(j.rows)).catch(e => { setRows([]); setMsg({ t: 'error', m: e.message }); }), []);
  useEffect(() => { if (!hasSupabase) { setRows([]); return; } load(); browserClient().auth.getUser().then(({ data }) => setMe(data.user?.id ?? '')); }, [load]);
  const run = async (key: string, fn: () => Promise<string>) => { setBusy(key); setMsg(null); try { setMsg({ t: 'ok', m: await fn() }); await load(); } catch (e) { setMsg({ t: 'error', m: e instanceof Error ? e.message : 'Failed' }); } setBusy(''); };
  const invite = (e: React.FormEvent) => { e.preventDefault(); run('invite', async () => { const j = await api('POST', f); setF({ full_name: '', email: '', role: f.role });
    return j.invited ? `Invite sent to ${f.email}. They’ll set a password from the email.` : `${f.email} already had an account — role set to ${f.role}${j.emailed ? ' and they’ve been emailed' : ''}.`; }); };
  const label = (r: string) => ROLE_INFO.find(x => x[0] === r)?.[1] ?? r;

  return <>
    <PageHead title="Team & roles" sub="Invite people by email and give each person only the access their job needs." />
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card"><div className="adm-card-h"><div><h3>Invite a team member</h3><p>They get an email to set their password, then sign in at /admin.</p></div></div>
        <form onSubmit={invite} className="form-grid">
          <div className="form-grid two">
            <div className="field"><label htmlFor="tn">Name</label><input id="tn" className="input" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} placeholder="Full name" /></div>
            <div className="field"><label htmlFor="te">Email</label><input id="te" type="email" required className="input" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="name@example.com" /></div>
          </div>
          <div className="field"><label htmlFor="tr">Role</label><select id="tr" className="select" value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{ROLE_INFO.map(([r, l, d]) => <option key={r} value={r}>{l} — {d}</option>)}</select></div>
          <button className="btn btn-primary" style={{ justifySelf: 'start' }} disabled={busy === 'invite'}>{busy === 'invite' ? 'Sending…' : 'Send invite'}</button>
        </form>
        <h3 style={{ fontSize: 14, margin: '18px 0 8px', fontFamily: 'var(--font-body)' }}>What each role can do</h3>
        <ul className="adm-legend">{ROLE_INFO.map(([r, l, d]) => <li key={r} style={{ textTransform: 'none' }}><span className="pill" style={{ minWidth: 120, textAlign: 'center' }}>{l}</span>{d}</li>)}</ul>
      </section>
      <section className="adm-card"><div className="adm-card-h"><div><h3>Members</h3><p>{rows ? `${rows.length} ${rows.length === 1 ? 'person has' : 'people have'} admin access` : 'Loading…'}</p></div></div>
        <div className="adm-list">{(rows ?? []).map(u => <div key={u.id} className="adm-li static team-row">
          <span className="adm-av">{(u.full_name || u.email || '?').slice(0, 2).toUpperCase()}</span>
          <div style={{ minWidth: 0 }}><b>{u.full_name || u.email}{u.id === me && <small className="muted"> (you)</small>}</b><small style={{ overflowWrap: 'anywhere' }}>{u.email}</small>
            <small>{u.pending ? <span className="pill amber">Invite pending</span> : `Last sign-in ${fmtDate(u.last_sign_in_at!)}`}</small></div>
          <div className="team-actions">
            <select className="select" style={{ width: 'auto', minHeight: 36 }} value={u.role} disabled={!!busy} aria-label={`Role for ${u.full_name || u.email}`}
              onChange={e => { const role = e.target.value; run(u.id, async () => { await api('PATCH', { id: u.id, role }); return `${u.full_name || u.email} is now ${label(role)}.`; }); }}>
              {ROLE_INFO.map(([r, l]) => <option key={r} value={r}>{l}</option>)}</select>
            {u.pending && <button className="link" disabled={!!busy} onClick={() => run(u.id, async () => { await api('POST', { email: u.email, full_name: u.full_name, resend: true }); return `Invite re-sent to ${u.email}.`; })}>Resend invite</button>}
            {u.id !== me && <button className="link link-danger" disabled={!!busy} onClick={() => { if (!confirm(`Remove admin access for ${u.full_name || u.email}? Their customer account (if any) stays.`)) return; run(u.id, async () => { await api('PATCH', { id: u.id, role: 'customer' }); return `${u.full_name || u.email} no longer has admin access.`; }); }}>Remove access</button>}
          </div></div>)}
          {rows && !rows.length && <p className="muted">No team members yet.</p>}</div>
        <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Changes apply on the person’s next page load. Tip: turn on two-step login for admins in Supabase → Authentication → MFA.</p>
      </section>
    </div>
  </>;
}
