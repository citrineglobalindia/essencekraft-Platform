'use client';
import Link from 'next/link';
import { BRAND } from '@/lib/brand';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db, isDemo } from '@/lib/admin';
import { BoxIcon, ChartIcon, LayersIcon, TagIcon, UsersIcon, CartIcon, SearchIcon } from '@/components/Icons';

const ic = (d: string) => function I({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>; };
const StarIcon = ic('M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z');
const MailIcon = ic('M3 6h18v12H3zM3 7l9 6 9-6');
const PageIcon = ic('M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6');
const GlobeIcon = ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18');
const SendIcon = ic('M22 2 11 13M22 2l-7 20-4-9-9-4z');
const GiftIcon = ic('M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z');
const MegaIcon = ic('M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15 9a3 3 0 0 1 0 6M18 6a7 7 0 0 1 0 12');
const BookIcon = ic('M2 5c3-1.5 7-1.5 10 1 3-2.5 7-2.5 10-1v14c-3-1.5-7-1.5-10 1-3-2.5-7-2.5-10-1zM12 6v14');
const ShieldIcon = ic('M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z');
const ClockIcon = ic('M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2');
const GearIcon = ic('M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21h-3v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3v-3h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3h3v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2v3h-.2a1.7 1.7 0 0 0-1.5 1z');
type Item = [string, string, (p: { size?: number }) => JSX.Element];
const GROUPS: [string, Item[]][] = [
  ['Overview', [['/admin', 'Dashboard', ChartIcon]]],
  ['Sales', [['/admin/orders', 'Orders', CartIcon], ['/admin/customers', 'Customers', UsersIcon], ['/admin/coupons', 'Coupons', TagIcon]]],
  ['Catalogue', [['/admin/products', 'Products', BoxIcon], ['/admin/inventory', 'Inventory', LayersIcon], ['/admin/reviews', 'Reviews', StarIcon]]],
  ['Marketing', [['/admin/leads', 'Leads', MailIcon], ['/admin/abandoned', 'Abandoned carts', CartIcon], ['/admin/campaigns', 'Segments & broadcasts', SendIcon], ['/admin/loyalty', 'Loyalty & referrals', GiftIcon], ['/admin/promotions', 'Banners & popups', MegaIcon], ['/admin/landing', 'Landing pages', PageIcon]]],
  ['Content', [['/admin/content', 'Homepage & content', PageIcon], ['/admin/pages', 'Site pages', PageIcon], ['/admin/encyclopedia', 'Encyclopedia', BookIcon], ['/admin/claims', 'Claims review', ShieldIcon], ['/admin/seo', 'SEO & redirects', GlobeIcon]]],
  ['System', [['/admin/team', 'Team & roles', ShieldIcon], ['/admin/activity', 'Activity log', ClockIcon], ['/admin/settings', 'Settings', GearIcon]]],
];
const ALL: Item[] = GROUPS.flatMap(([, l]) => l);
const Bell = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;

export default function Panel({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string } | null>(null);
  const [low, setLow] = useState(0); const [pending, setPending] = useState(0); const [rev, setRev] = useState(0); const [q, setQ] = useState('');
  useEffect(() => {
    db().auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace('/admin/login');
      const { data: p } = await db().from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      setMe({ email: data.user.email ?? '', role: p?.role ?? 'customer' });
    });
    db().from('variants').select('stock,low_stock_threshold').then(({ data }) => setLow((data ?? []).filter(v => v.stock <= v.low_stock_threshold).length));
    db().from('orders').select('id', { count: 'exact', head: true }).eq('status', 'placed').then(({ count }) => setPending(count ?? 0));
    db().from('reviews').select('id', { count: 'exact', head: true }).eq('status', 'pending').then(({ count }) => setRev(count ?? 0));
  }, [router, path]);
  const current = (href: string) => href === '/admin' ? path === '/admin' : path.startsWith(href);
  const title = ALL.find(([h]) => current(h))?.[1] ?? 'Admin';
  const badge = (h: string) => h === '/admin/orders' && pending ? pending : h === '/admin/inventory' && low ? low : h === '/admin/reviews' && rev ? rev : 0;
  const initials = (me?.email ?? 'A').slice(0, 2).toUpperCase();
  return (
    <div className="adm">
      <aside className="adm-side">
        <Link href="/admin" className="adm-brand"><span><img src={BRAND.mark.replace('logo-mark-dark', 'logo-mark-light')} alt="" width={18} height={26} style={{ height: 26, width: 'auto' }} /></span><div><b>EssenceKraft</b><small>Admin console</small></div></Link>
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
