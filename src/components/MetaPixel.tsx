'use client';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef } from 'react';
import { PIXEL_ID } from '@/lib/attribution';

// Meta (Facebook) Pixel — storefront only (not loaded in /admin).
// Base code fires the first PageView; later client-side navigations fire their own PageView here.
function RouteEvents() {
  const path = usePathname(); const sp = useSearchParams(); const first = useRef(true);
  useEffect(() => {
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    if (first.current) first.current = false; else fbq?.('track', 'PageView');
    const q = path === '/shop' ? sp.get('q') : null;
    if (q) fbq?.('track', 'Search', { search_string: q });
  }, [path, sp]);
  return null;
}
export function MetaPixel() {
  if (!PIXEL_ID) return null;
  return <>
    <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL_ID}');fbq('track','PageView');`}</Script>
    <noscript><img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`} /></noscript>
    <Suspense fallback={null}><RouteEvents /></Suspense>
  </>;
}
