import type { Metadata } from 'next';
export const metadata: Metadata = { title: { default: 'Admin', template: '%s · EssenceKraft Admin' }, robots: { index: false, follow: false } };
export default function L({ children }: { children: React.ReactNode }) { return children; }
