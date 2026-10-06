'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { hasSupabase, browserClient } from '@/lib/supabase';
import { Invoice, type InvOrder, type Seller } from '@/components/Invoice';

function View({ no }: { no: string }) {
  const t = useSearchParams().get('t') ?? '';
  const [o, setO] = useState<InvOrder | null | undefined>(undefined); const [s, setS] = useState<Seller>({});
  useEffect(() => {
    if (!hasSupabase) { setO(null); return; }
    browserClient().rpc('get_order', { p_no: no, p_token: t }).then(({ data }) => setO((data as InvOrder) ?? null));
    browserClient().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS(data.value as Seller));
  }, [no, t]);
  if (o === undefined) return <div className="wrap section"><p>Loading invoice…</p></div>;
  if (!o) return <div className="wrap empty"><h1>Invoice not found</h1><Link className="btn btn-primary" href="/account">Track an order</Link></div>;
  return <div className="wrap section inv-page">
    <div className="no-print inv-actions"><Link className="link" href={`/order/${no}?t=${t}`}>← Back to order</Link><button className="btn btn-primary btn-sm" onClick={() => window.print()}>Download PDF / Print</button></div>
    {!o.invoice_no && <p className="notice no-print">The tax invoice is issued once your order is confirmed. Below is your order summary.</p>}
    <Invoice o={o} seller={s} />
  </div>;
}
export default function Page({ params }: { params: { no: string } }) { return <Suspense><View no={params.no} /></Suspense>; }
