// Which admin sections each role can open. Database security (RLS) is the real gate; this keeps menus honest.
export type Role = 'admin' | 'staff' | 'inventory' | 'marketing' | 'customer';
export const ROLE_INFO: [Role, string, string][] = [
  ['admin', 'Admin', 'Everything, including team, settings and activity log'],
  ['staff', 'Orders & support', 'Orders, shipping, customers, abandoned carts, reviews'],
  ['inventory', 'Inventory', 'Products, stock, and orders (to pack and ship)'],
  ['marketing', 'Marketing', 'Products copy, coupons, leads, campaigns, content, SEO, reviews'],
];
const ACCESS: Record<Exclude<Role, 'customer'>, string[]> = {
  admin: ['*'],
  staff: ['/admin', '/admin/orders', '/admin/customers', '/admin/abandoned', '/admin/reviews', '/admin/invoice'],
  inventory: ['/admin', '/admin/orders', '/admin/products', '/admin/inventory', '/admin/invoice'],
  marketing: ['/admin', '/admin/products', '/admin/coupons', '/admin/reviews', '/admin/leads', '/admin/abandoned', '/admin/campaigns', '/admin/loyalty', '/admin/promotions', '/admin/landing', '/admin/content', '/admin/pages', '/admin/encyclopedia', '/admin/claims', '/admin/seo'],
};
export const isStaffRole = (r?: string | null) => !!r && r !== 'customer' && r in ACCESS;
export function canOpen(role: string | null | undefined, path: string) {
  if (!isStaffRole(role)) return false;
  const list = ACCESS[role as keyof typeof ACCESS];
  if (list.includes('*')) return true;
  return list.some(h => (h === '/admin' ? path === '/admin' : path === h || path.startsWith(h + '/')));
}
