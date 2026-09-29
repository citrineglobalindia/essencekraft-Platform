import Link from 'next/link';
export default function NotFound() {
  return <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 24 }}>
    <div style={{ display: 'grid', gap: 12, justifyItems: 'center' }}><h1>This page has moved or no longer exists</h1>
      <p className="muted">Try searching the shop, or start from one of these.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}><Link className="btn btn-primary" href="/shop">All products</Link><Link className="btn btn-ghost" href="/concern/sleep-calm">Sleep &amp; Calm</Link><Link className="btn btn-ghost" href="/">Home</Link></div></div>
  </div>;
}
