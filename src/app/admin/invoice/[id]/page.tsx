'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/admin';
import { Invoice, type InvOrder, type Seller } from '@/components/Invoice';

export default function AdminInvoice({ params }: { params: { id: string } }) {
  const [o, setO] = useState<InvOrder | null>(null); const [s, setS] = useState<Seller>({});
  useEffect(() => {
    db().from('orders').select('*, order_items(*)').eq('id', params.id).single().then(({ data }) => data && setO({ ...(data as unknown as InvOrder), items: (data as unknown as { order_items: InvOrder['items'] }).order_items }));
    db().from('settings').select('value').eq('key', 'store').maybeSingle().then(({ data }) => data && setS(data.value as Seller));
  }, [params.id]);
  if (!o) return <p style={{ padding: 24 }}>Loading…</p>;
  return <main className="inv-page" style={{ padding: 24 }}>
    <div className="no-print inv-actions"><Link className="link" href={`/admin/orders/${params.id}`}>← Back to order</Link><button className="btn btn-primary btn-sm" onClick={() => window.print()}>Download PDF / Print</button></div>
    <Invoice o={o} seller={s} />
  </main>;
}
