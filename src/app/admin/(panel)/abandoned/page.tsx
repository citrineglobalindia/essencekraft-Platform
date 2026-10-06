'use client';
import { useCallback, useEffect, useState } from 'react';
import { db, downloadCSV, fmtDate } from '@/lib/admin';
import { inr } from '@/lib/format';
import { PageHead, Stats } from '@/components/AdminUI';

type C = { token: string; email: string | null; phone: string | null; name: string | null; lines: { name: string; label: string; qty: number; price: number }[]; subtotal: number; consent: boolean; recovered_order: string | null; reminded_at: string | null; reminders: number; updated_at: string };
const SITE = typeof window !== 'undefined' ? window.location.origin : '';
export default function Abandoned() {
  const [rows, setRows] = useState<C[]>([]); const [tab, setTab] = useState('open');
  const load = useCallback(() => db().from('abandoned_carts').select('*').order('updated_at', { ascending: false }).limit(1000).then(({ data }) => setRows((data ?? []) as C[])), []);
  useEffect(() => { load(); }, [load]);
  const stale = (c: C) => Date.now() - +new Date(c.updated_at) > 60 * 60e3;
  const open = rows.filter(c => !c.recovered_order && stale(c)); const rec = rows.filter(c => c.recovered_order);
  const list = tab === 'open' ? open : tab === 'recovered' ? rec : rows;
  const msg = (c: C) => `Hi ${c.name?.split(' ')[0] || 'there'}, you left ${c.lines.map(l => l.name.replace(/ (Essential|Carrier) Oil/, '')).join(', ')} in your EssenceKraft cart. It's saved for you here: ${SITE}/cart?restore=${c.token}`;
  const remind = async (c: C, via: 'wa' | 'mail') => {
    if (via === 'wa' && c.phone) window.open(`https://wa.me/91${c.phone.slice(-10)}?text=${encodeURIComponent(msg(c))}`, '_blank');
    if (via === 'mail' && c.email) window.location.href = `mailto:${c.email}?subject=${encodeURIComponent('Your EssenceKraft cart is waiting')}&body=${encodeURIComponent(msg(c))}`;
    await db().from('abandoned_carts').update({ reminded_at: new Date().toISOString(), reminders: (c.reminders ?? 0) + 1 }).eq('token', c.token); load();
  };
  const value = open.reduce((s, c) => s + Number(c.subtotal), 0);
  return <>
    <PageHead title="Abandoned carts" sub="Shoppers who entered their email or mobile at checkout but didn’t order. Send one friendly reminder with a link that restores their cart.">
      <button className="btn btn-ghost btn-sm" onClick={() => downloadCSV('abandoned-carts.csv', list.map(c => ({ name: c.name, email: c.email, phone: c.phone, items: c.lines.map(l => `${l.name} ${l.label} x${l.qty}`).join('; '), value: c.subtotal, consent: c.consent, recovered: c.recovered_order, restore_link: `${SITE}/cart?restore=${c.token}` })))}>Export CSV</button>
    </PageHead>
    <Stats items={[['Open carts', open.length, open.length ? 'amber' : ''], ['Value at stake', inr(value)], ['Recovered', rec.length], ['Recovery rate', `${rows.length ? Math.round((rec.length / rows.length) * 100) : 0}%`]]} />
    <div className="adm-seg">{[['open', `Open (${open.length})`], ['recovered', `Recovered (${rec.length})`], ['all', `All (${rows.length})`]].map(([k, l]) => <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>
    <div className="table-wrap"><table>
      <thead><tr><th>Shopper</th><th>Cart</th><th>Value</th><th className="hide-sm">Last active</th><th></th></tr></thead>
      <tbody>{list.map(c => <tr key={c.token}>
        <td><b>{c.name ?? '—'}</b><br /><small className="muted">{c.email ?? ''}{c.email && c.phone ? ' · ' : ''}{c.phone ?? ''}</small>{c.consent && <><br /><span className="pill green">opted in</span></>}</td>
        <td style={{ fontSize: 13 }}>{c.lines.map((l, i) => <div key={i}>{l.name} <span className="muted">{l.label} × {l.qty}</span></div>)}</td>
        <td><b>{inr(c.subtotal)}</b></td>
        <td className="hide-sm">{fmtDate(c.updated_at)}{c.reminded_at && <><br /><small className="muted">reminded {fmtDate(c.reminded_at)}</small></>}</td>
        <td style={{ whiteSpace: 'nowrap' }}>{c.recovered_order ? <span className="pill green">→ {c.recovered_order}</span> : c.reminders >= 1 ? <span className="pill grey">reminded</span> : <>
          {c.phone && <button className="btn btn-primary btn-sm" onClick={() => remind(c, 'wa')}>WhatsApp</button>} {c.email && <button className="btn btn-ghost btn-sm" onClick={() => remind(c, 'mail')}>Email</button>}</>}</td>
      </tr>)}{!list.length && <tr><td colSpan={5} className="muted">No carts here yet. Carts appear one hour after a shopper stops at checkout.</td></tr>}</tbody>
    </table></div>
    <p className="muted" style={{ fontSize: 13 }}>One reminder per cart keeps this respectful. Automatic sending can be switched on once a WhatsApp Business API or email provider (e.g. Brevo) is connected.</p>
  </>;
}
