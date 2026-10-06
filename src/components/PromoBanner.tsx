import Link from 'next/link';
import type { Promo } from '@/lib/growth';
export function PromoBanner({ p }: { p: Promo }) {
  return (
    <section className={`promo-strip ${p.theme ?? 'forest'}`} aria-label="Offer">
      <div className="wrap promo-strip-in">
        <div><b>{p.title}</b>{p.body && <span>{p.body}</span>}</div>
        <div className="promo-strip-r">{p.coupon_code && <code>{p.coupon_code}</code>}{p.cta && p.href && <Link className="btn btn-pill" href={p.href}>{p.cta} →</Link>}</div>
      </div>
    </section>
  );
}
