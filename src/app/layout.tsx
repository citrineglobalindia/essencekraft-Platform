import type { Metadata, Viewport } from 'next';
import { BRAND } from '@/lib/brand';
import { Fraunces, Instrument_Sans } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { CartProvider } from '@/lib/cart';
import { SITE_URL } from '@/lib/format';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--f-fraunces', display: 'swap', weight: ['500', '600', '700'] });
const sans = Instrument_Sans({ subsets: ['latin'], variable: '--f-sans', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'EssenceKraft — 100% Pure Essential Oils', template: '%s | EssenceKraft' },
  description: 'Pure, GC-MS tested essential and carrier oils made in India. Shop lavender, rosemary, tea tree, peppermint and more.',
  openGraph: { siteName: 'EssenceKraft', type: 'website', locale: 'en_IN' },
  icons: { icon: BRAND.icon, apple: BRAND.icon },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0f3d2e' };

const GTM = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${sans.variable}`}>
      <body>
        {GTM && <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM}');`}</Script>}
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
