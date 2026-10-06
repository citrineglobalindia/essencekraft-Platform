'use client';
import { useCallback, useEffect, useState } from 'react';
import { db } from '@/lib/admin';
import { PageHead, Saved } from '@/components/AdminUI';

type U = { id: string; full_name: string | null; email?: string; role: string };
const ROLES: [string, string][] = [['admin', 'Everything, including team & settings'], ['inventory', 'Products and stock'], ['marketing', 'Coupons, leads, content, SEO, reviews'], ['staff', 'Orders and customers'], ['customer', 'No admin access']];
export default function Team() {
  const [rows, setRows] = useState<U[]>([]); const [msg, setMsg] = useState<{ t: 'ok' | 'error'; m: string } | null>(null);
  const load = useCallback(() => db().from('profiles').select('*').neq('role', 'customer').order('role').then(({ data }) => setRows((data ?? []) as U[])), []);
  useEffect(() => { load(); }, [load]);
  const setRole = async (u: U, role: string) => { if (u.role === 'admin' && rows.filter(r => r.role === 'admin').length === 1 && role !== 'admin') return setMsg({ t: 'error', m: 'At least one admin is required.' });
    const { error } = await db().from('profiles').update({ role }).eq('id', u.id); setMsg(error ? { t: 'error', m: error.message } : { t: 'ok', m: `${u.full_name ?? u.email} is now ${role}.` }); load(); };
  return <>
    <PageHead title="Team & roles" sub="Least-privilege access: give each person only what their job needs." />
    <Saved msg={msg} />
    <div className="adm-2col">
      <section className="adm-card"><div className="adm-card-h"><div><h3>Members</h3><p>{rows.length} people with admin access</p></div></div>
        <div className="adm-list">{rows.map(u => <div key={u.id} className="adm-li static" style={{ gridTemplateColumns: 'auto 1fr auto' }}>
          <span className="adm-av">{(u.full_name ?? u.email ?? '?').slice(0, 2).toUpperCase()}</span><div><b>{u.full_name ?? '—'}</b><small>{u.email ?? u.id}</small></div>
          <select className="select" style={{ width: 'auto', minHeight: 36 }} value={u.role} onChange={e => setRole(u, e.target.value)} aria-label={`Role for ${u.full_name}`}>{ROLES.map(([r]) => <option key={r}>{r}</option>)}</select></div>)}</div>
      </section>
      <section className="adm-card"><div className="adm-card-h"><div><h3>Adding someone</h3></div></div>
        <ol style={{ paddingLeft: 18, display: 'grid', gap: 8, fontSize: 14 }}><li>Ask them to sign up once at <code>/admin/login</code> (or invite them from Supabase → Authentication).</li><li>Set their role here — they get access on their next page load.</li><li>Turn on two-step login for admins in Supabase → Authentication → MFA.</li></ol>
        <h3 style={{ fontSize: 14, margin: '16px 0 8px', fontFamily: 'var(--font-body)' }}>What each role can do</h3>
        <ul className="adm-legend">{ROLES.map(([r, d]) => <li key={r} style={{ textTransform: 'none' }}><span className="pill" style={{ minWidth: 84, textAlign: 'center' }}>{r}</span>{d}</li>)}</ul>
      </section>
    </div>
  </>;
}
