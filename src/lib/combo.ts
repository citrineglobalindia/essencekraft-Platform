// Combo order lines carry the customer's picks (and free items) in order_items.selections.
export type Sel = { variant_id?: string; name: string; label?: string; sku?: string; qty?: number; free?: boolean };
export const selText = (s?: Sel[] | null, sep = ', ') =>
  s?.length ? s.map(x => `${(x.qty ?? 1) > 1 ? `${x.qty} × ` : ''}${x.name}${x.label ? ` (${x.label})` : ''}${x.free ? ' — free' : ''}`).join(sep) : '';
