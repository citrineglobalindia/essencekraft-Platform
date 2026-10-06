'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db, isDemo } from '@/lib/admin';
import { BoxIcon, ChartIcon, LayersIcon, TagIcon, UsersIcon, CartIcon, SearchIcon, LeafIcon } from '@/components/Icons';

type Item = [string, string, (p: { size?: number }) => JSX.Element];
const GROUPS: [string, Item[]][] = [
  ['Overview', [['/admin', 'Dashboard', ChartIcon]]],
  ['Sales', [['/admin/orders', 'Orders', CartIcon], ['/admin/coupons', 'Coupons', TagIcon]]],
  ['Catalogue', [['/admin/products', 'Products', BoxIcon], ['/admin/inventory', 'Inventory', LayersIcon]]],
  ['Marketing', [['/admin/leads', 'Leads', UsersIcon]]],
];
const ALL: Item[] = GROUPS.flatMap(([, l]) => l);
const Bell = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;

export default function Panel({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string } | null>(null);
  const [low, setLow] = useState(0); const [pending, setPending] = useState(0); const [q, setQ] = useState('');
  useEffect(() => {
    db().auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace('/admin/login');
      const { data: p } = await db().from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      setMe({ email: data.user.email ?? '', role: p?.role ?? 'customer' });
    });
    db().from('variants').select('stock,low_stock_threshold').then(({ data }) => setLow((data ?? []).filter(v => v.stock <= v.low_stock_threshold).length));
    db().from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed').then(({ count }) => setPending(count ?? 0));
  }, [router, path]);
  const current = (href: string) => href === '/admin' ? path === '/admin' : path.startsWith(href);
  const title = ALL.find(([h]) => current(h))?.[1] ?? 'Admin';
  const badge = (h: string) => h === '/admin/orders' && pending ? pending : h === '/admin/inventory' && low ? low : 0;
  const initials = (me?.email ?? 'A').slice(0, 2).toUpperCase();
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand"><span><LeafIcon size={18} /></span><div><b>EssenceKraft</b><small>Admin console</small></div></Link>
        <nav aria-label="Admin">
          {GROUPS.map(([g, links]) => <div key={g} className="adm-group"><p>{g}</p>
            {links.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined}><Icon size={18} /><span>{label}</span>{badge(href) > 0 && <em>{badge(href)}</em>}</Link>)}
          </div>)}
        </nav>
        <div className="adm-side-foot">
          <Link href="/" target="_blank">View store ↗</Link>
          {me && <div className="adm-me"><span>{initials}</span><div><b>{me.email}</b><small>{me.role}</small></div></div>}
        </div>
      </aside>
      <div className="adm-body">
        {isDemo && <div className="adm-demo">Demo mode — sample orders and leads. Connect Supabase to manage real data. Changes reset on reload.</div>}
        <header className="adm-top">
          <h1>{title}</h1>
          <form className="adm-search" role="search" onSubmit={e => { e.preventDefault(); if (q.trim()) router.push(`/admin/orders?q=${encodeURIComponent(q.trim())}`); }}>
            <SearchIcon size={16} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders, customers…" aria-label="Search orders" />
          </form>
          <div className="adm-top-r">
            <Link href="/admin/inventory?filter=low" className="adm-bell" aria-label={`${low} low-stock alerts`}><Bell />{low > 0 && <i>{low}</i>}</Link>
            <button className="adm-avatar" title="Sign out" onClick={async () => { await db().auth.signOut(); router.replace('/admin/login'); }}>{initials}</button>
          </div>
        </header>
        <nav className="adm-tabs" aria-label="Admin sections">{ALL.map(([href, label]) => <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined}>{label}{badge(href) > 0 && <em>{badge(href)}</em>}</Link>)}</nav>
        <main className="adm-main">{children}</main>
      </div>
    </div>
  );
}
