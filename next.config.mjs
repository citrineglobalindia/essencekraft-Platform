/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }] },
  async redirects() {
    return [
      { source: '/pages/about', destination: '/about', permanent: true },
      // Legacy essencekraft.in routes (SEO-001)
      { source: '/products', destination: '/shop', permanent: true },
      // /essential-oils, /carrier-oils, /aromatherapy, /faq, /contact, policies, /essential-oils-for-* and /learn/* are migrated content pages (site_pages)
      ...['/login', '/signup', '/profile', '/forgot-password', '/verify-email', '/verify-otp'].map(source => ({ source, destination: '/account', permanent: true })),
      { source: '/wiki', destination: '/categories', permanent: true },
      ...[['shipping', '/shipping'], ['returns', '/shipping'], ['refund', '/shipping'], ['contact', '/contact'], ['privacy', '/privacy'], ['terms', '/terms']].map(([s, d]) => ({ source: `/pages/${s}`, destination: d, permanent: true })),
      ...[['1','rosemary'],['4','jojoba-carrier-oil'],['5','lemongrass'],['6','citronella'],['8','tulsi'],['9','lavender'],['11','geranium'],['12','tea-tree'],['13','cedarwood'],['14','clary-sage'],['15','eucalyptus'],['16','orange'],['17','peppermint']]
        .map(([id, s]) => ({ source: `/products/${id}`, destination: `/product/${s.includes('-oil') ? s : s + '-essential-oil'}`, permanent: true })),
    ];
  },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ]}];
  }
};
export default nextConfig;
