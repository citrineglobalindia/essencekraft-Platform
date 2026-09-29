# EssenceKraft — ecommerce + admin

Next.js 14 (App Router) · Supabase (Postgres, Auth, Storage) · Razorpay · Vercel.
Runs in **demo mode** (seed catalogue, localStorage orders) when Supabase env vars are empty.

## 1. Local run
```bash
npm install
cp .env.example .env.local   # leave Supabase blank for demo mode
npm run dev                  # http://localhost:3000
```

## 2. Database (Supabase → SQL editor, in this order)
1. `supabase/migrations/0001_schema.sql` — tables, RLS, RPCs (place_order, adjust_stock, set_order_status, …), storage bucket
2. `supabase/seed.sql` — 14 oils, 28 SKUs, concerns, WELCOME10 coupon (placeholder prices — replace with live catalogue)
3. Sign up once at `/admin/login` via Supabase Auth (Authentication → Users → Add user), then:
   ```sql
   update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
   ```
   Roles: `admin` (everything), `inventory` (products + stock), `marketing` (coupons, leads, content), `staff` (orders).
4. Optional: enable pg_cron and schedule `select public.release_stale_orders()` every 15 min to release stock held by unpaid online orders.

## 3. Vercel environment variables
| Name | Where |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | same page (server only — never NEXT_PUBLIC) |
| RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET | Razorpay → Settings → API keys |
| RAZORPAY_WEBHOOK_SECRET | Razorpay → Webhooks → `https://<domain>/api/razorpay/webhook` (payment.captured, payment.failed) |
| NEXT_PUBLIC_SITE_URL, NEXT_PUBLIC_GTM_ID, NEXT_PUBLIC_WHATSAPP_NUMBER | your values |

## 4. How stock works
- Every change goes through the `stock_movements` ledger (sale, purchase, return, adjustment, damage, cancel, initial).
- `place_order()` locks rows, rejects overselling, decrements stock and applies coupons atomically.
- Cancelling/returning an order in admin restocks automatically. Staff adjust stock only via `adjust_stock()` (inventory/admin roles), which also writes `audit_log`.

## 5. Routes
Store: `/`, `/shop`, `/concern/[slug]`, `/product/[slug]`, `/cart`, `/checkout`, `/order/[no]`, `/account` (track order), `/wishlist`, `/pages/[slug]`
Admin: `/admin`, `/admin/orders`, `/admin/products`, `/admin/inventory`, `/admin/coupons`, `/admin/leads`

## 6. Not yet built (next phases)
Customer login/OTP accounts · reviews · blog/wiki migration + 301 map · Meta CAPI + Merchant feed · courier API (Shiprocket) · admin MFA · transactional email (Brevo).
