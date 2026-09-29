import type { MetadataRoute } from 'next';
import { getConcerns, getProducts, getCategories } from '@/lib/data';
import { SITE_URL } from '@/lib/format';
export const revalidate = 3600;
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [p, c, cat] = await Promise.all([getProducts(), getConcerns(), getCategories()]);
  return [
    { url: SITE_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/shop`, changeFrequency: 'daily', priority: .9 },
    ...cat.map(x => ({ url: `${SITE_URL}/shop?category=${x.slug}`, priority: .8 })),
    ...c.map(x => ({ url: `${SITE_URL}/concern/${x.slug}`, priority: .8 })),
    ...p.map(x => ({ url: `${SITE_URL}/product/${x.slug}`, lastModified: x.created_at, priority: .7 })),
  ];
}
