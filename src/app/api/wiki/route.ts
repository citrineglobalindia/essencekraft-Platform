import { NextResponse } from 'next/server';
import { wikiIndex, getEntry } from '@/lib/wiki';
import contentData from '../../../../data/wiki/content.json';
// Admin helper: ?slug=x returns one article's editable fields; no slug returns the lightweight index.
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug');
  if (!slug) return NextResponse.json(wikiIndex.map(({ slug, title, category }) => ({ slug, title, category })));
  const e = getEntry(slug); if (!e) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ entry: e, fields: (contentData as Record<string, unknown>)[slug] ?? {} });
}
