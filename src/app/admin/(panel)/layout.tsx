'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hasSupabase } from '@/lib/supabase';
import { db } from '@/lib/admin';
import { BoxIcon, ChartIcon, LayersIcon, TagIcon, UsersIcon, CartIcon } from '@/components/Icons';

const NAV = [
  ['/admin', 'Dashboard', ChartIcon], ['/admin/orders', 'Orders', CartIcon], ['/admin/products', 'Products', BoxIcon],
  ['/admin/inventory', 'Inventory', LayersIcon], ['/admin/coupons', 'Coupons', TagIcon], ['/admin/leads', 'Leads', UsersIcon],
] as const;

export default function Panel({ children }: { children: React.ReactNode }) {
  const path = usePathname(); const router = useRouter();
  const [me, setMe] = useState<{ email: string; role: string } | null>(null);
  useEffect(() => {
    if (!hasSupabase) return;
    db().auth.getUser().then(async ({ data }) => {
      if (!data.user) return router.replace('/admin/login');
      const { data: p } = await db().from('profiles').select('role').eq('id', data.user.id).maybeSingle();
      setMe({ email: data.user.email ?? '', role: p?.role ?? 'customer' });
    });
  }, [router]);
  if (!hasSupabase) return <div className="login"><div className="panel"><h1 style={{ fontSize: '1.6rem' }}>Admin needs Supabase</h1><p>Add your Supabase URL and anon key to the environment and run <code>supabase/migrations/0001_schema.sql</code> and <code>supabase/seed.sql</code>.</p></div></div>;
  const current = (href: string) => href === '/admin' ? path === '/admin' : path.startsWith(href);
  return (
    <div className="admin">
      <aside className="admin-side">
        <span className="logo logo-left" style={{ padding: '6px 12px 18px' }}><b style={{ color: '#fff', fontSize: 22 }}>EssenceKraft</b><small style={{ color: '#b9cbbf' }}>ADMIN</small></span>
        {NAV.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined}><Icon size={18} />{label}</Link>)}
        <div style={{ marginTop: 'auto', fontSize: 12.5, padding: '0 12px', display: 'grid', gap: 6 }}>
          <Link href="/" style={{ padding: 0 }}>View store ↗</Link>
          {me && <span>{me.email}<br /><span className="pill" style={{ marginTop: 4 }}>{me.role}</span></span>}
        </div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="admin-top">
          <b style={{ fontFamily: 'var(--font-display)', color: 'var(--forest)', fontSize: 18 }}>{NAV.find(([h]) => current(h))?.[1] ?? 'Admin'}</b>
          <button className="btn btn-ghost btn-sm" onClick={async () => { await db().auth.signOut(); router.replace('/admin/login'); }}>Sign out</button>
        </div>
        <nav className="admin-tabs" aria-label="Admin sections">{NAV.map(([href, label]) => <Link key={href} href={href} aria-current={current(href) ? 'page' : undefined}>{label}</Link>)}</nav>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
