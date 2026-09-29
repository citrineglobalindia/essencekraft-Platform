import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// Placeholder policy/content pages — migrate approved copy from the current site (MIG-001, SEO-008).
const PAGES: Record<string, { title: string; body: string[] }> = {
  about: { title: 'Our story', body: ['EssenceKraft bottles pure essential and carrier oils in India.', 'Replace this with the approved brand story from essencekraft.in during migration.'] },
  purity: { title: 'Purity & testing', body: ['Every batch is checked by GC-MS before bottling. Reports are available on request.'] },
  'safe-use': { title: 'Safe-use guide', body: ['Essential oils are concentrated. Dilute 2–3 drops in 10 ml of a carrier oil such as jojoba before applying to skin.', 'Patch-test on the inner arm and wait 24 hours. Keep away from eyes, children and pets.', 'If you are pregnant, nursing or under medical care, speak to your doctor first. Essential oils are not a substitute for medical treatment.'] },
  shipping: { title: 'Shipping', body: ['Free shipping on orders above ₹999. Orders below that ship for ₹79. Most metro deliveries arrive in 2–4 working days.'] },
  returns: { title: 'Returns', body: ['Unopened products can be returned within 7 days of delivery. Contact us with your order number to start a return.'] },
  refund: { title: 'Refund policy', body: ['Approved refunds are processed to the original payment method within 5–7 working days.'] },
  contact: { title: 'Contact', body: ['Email: care@essencekraft.in', 'WhatsApp: available Monday to Saturday, 10am–7pm.'] },
  privacy: { title: 'Privacy policy', body: ['Replace with the approved privacy policy before launch.'] },
  terms: { title: 'Terms of service', body: ['Replace with the approved terms before launch.'] },
};
export function generateStaticParams() { return Object.keys(PAGES).map(slug => ({ slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata { const p = PAGES[params.slug]; return p ? { title: p.title, alternates: { canonical: `/pages/${params.slug}` } } : {}; }
export default function Page({ params }: { params: { slug: string } }) {
  const p = PAGES[params.slug]; if (!p) notFound();
  return <div className="wrap" style={{ maxWidth: 760 }}>
    <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden>/</span><span aria-current="page">{p.title}</span></nav>
    <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', marginBottom: 16 }}>{p.title}</h1>
    <div style={{ display: 'grid', gap: 12, fontSize: 16, lineHeight: 1.7, paddingBottom: 40 }}>{p.body.map(b => <p key={b}>{b}</p>)}</div>
  </div>;
}
