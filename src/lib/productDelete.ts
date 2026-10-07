'use client';
import { db } from './admin';
// Delete a product. Products that were ever ordered are archived instead, so invoices, order history and reports stay intact.
export async function deleteProduct(id: string, name: string): Promise<{ ok: boolean; msg: string; archived?: boolean }> {
  const { data: vs } = await db().from('variants').select('id').eq('product_id', id);
  const ids = (vs ?? []).map(v => v.id as string);
  const { count } = ids.length ? await db().from('order_items').select('id', { count: 'exact', head: true }).in('variant_id', ids) : { count: 0 };
  if ((count ?? 0) > 0) {
    if (!confirm(`“${name}” appears in ${count} order${count === 1 ? '' : 's'}, so it can’t be removed without breaking order history.\n\nArchive it instead? It will disappear from the store but stay in your records.`)) return { ok: false, msg: '' };
    const { error } = await db().from('products').update({ status: 'archived', is_bestseller: false, is_new: false }).eq('id', id);
    return error ? { ok: false, msg: error.message } : { ok: true, archived: true, msg: `“${name}” archived — hidden from the store, kept for order history.` };
  }
  if (!confirm(`Permanently delete “${name}” and all its sizes and stock history?\n\nThis can’t be undone.`)) return { ok: false, msg: '' };
  const { error } = await db().from('products').delete().eq('id', id);
  return error ? { ok: false, msg: error.message } : { ok: true, msg: `“${name}” deleted.` };
}
