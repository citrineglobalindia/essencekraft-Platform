'use client';
import { db, refreshStore } from './admin';
// Delete a product (with confirmation). Ordered products can be deleted too — orders keep their own copy of the item — or archived instead.
export async function deleteProduct(id: string, name: string): Promise<{ ok: boolean; msg: string; archived?: boolean }> {
  const { data: vs } = await db().from('variants').select('id').eq('product_id', id);
  const ids = (vs ?? []).map(v => v.id as string);
  const { count } = ids.length ? await db().from('order_items').select('id', { count: 'exact', head: true }).in('variant_id', ids) : { count: 0 };
  if ((count ?? 0) > 0) {
    // Orders keep their own copy of name/size/SKU/price (order_items.variant_id is set to null), so invoices and history stay intact.
    if (!confirm(`“${name}” appears in ${count} order${count === 1 ? '' : 's'}. Those orders and invoices keep their own copy of the product name, size and price, so they won’t change.\n\nDelete it permanently? Its sizes, stock history and reviews are removed. This can’t be undone.\n\n(Cancel to archive it instead.)`)) {
      if (!confirm(`Archive “${name}” instead? It disappears from the store but stays in your records.`)) return { ok: false, msg: '' };
      const { error } = await db().from('products').update({ status: 'archived', is_bestseller: false, is_new: false }).eq('id', id);
      if (!error) await refreshStore();
      return error ? { ok: false, msg: error.message } : { ok: true, archived: true, msg: `“${name}” archived — hidden from the store, kept for order history.` };
    }
    const { error } = await db().from('products').delete().eq('id', id);
    if (!error) await refreshStore();
    return error ? { ok: false, msg: error.message } : { ok: true, msg: `“${name}” deleted. Its ${count} past order${count === 1 ? '' : 's'} still show the product details.` };
  }
  if (!confirm(`Permanently delete “${name}” and all its sizes and stock history?\n\nThis can’t be undone.`)) return { ok: false, msg: '' };
  const { error } = await db().from('products').delete().eq('id', id);
  if (!error) await refreshStore();
  return error ? { ok: false, msg: error.message } : { ok: true, msg: `“${name}” deleted.` };
}
