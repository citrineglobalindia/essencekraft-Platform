-- EssenceKraft ecommerce schema: catalogue, inventory, orders, marketing, admin.
-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+).

-- ───────────── Roles ─────────────
create type app_role as enum ('customer','staff','inventory','marketing','admin');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  role app_role not null default 'customer',
  created_at timestamptz not null default now()
);

create or replace function public.has_role(roles app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from profiles where id = auth.uid() and role = any(roles));
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.has_role(array['staff','inventory','marketing','admin']::app_role[]);
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Catalogue ─────────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, intro text,
  sort int not null default 0
);
create table concerns (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null, name text not null, intro text,
  color text default '#6b8f5e', sort int not null default 0
);
create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  botanical_name text,
  tagline text,
  description text,
  category_id uuid references categories on delete set null,
  aroma text, extraction text, origin text,
  uses text[] default '{}',
  suggested_blends text[] default '{}',
  safety text,
  purity text,
  color text default '#7a5a9e',           -- accent used by bottle illustration
  images text[] default '{}',
  is_bestseller boolean default false,
  is_new boolean default false,
  status text not null default 'active' check (status in ('draft','active','archived')),
  claim_status text not null default 'pending' check (claim_status in ('pending','approved','rejected')),
  rating numeric(2,1) default 0, review_count int default 0,
  seo_title text, seo_description text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create table product_concerns (
  product_id uuid references products on delete cascade,
  concern_id uuid references concerns on delete cascade,
  primary key (product_id, concern_id)
);
create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products on delete cascade,
  sku text unique not null,
  label text not null,                    -- e.g. "15 ml"
  price numeric(10,2) not null check (price >= 0),
  compare_at numeric(10,2),
  stock int not null default 0,
  reserved int not null default 0,
  low_stock_threshold int not null default 10,
  allow_backorder boolean not null default false,
  sort int default 0
);
create index on variants(product_id);

-- Every stock change is ledgered.
create table stock_movements (
  id bigserial primary key,
  variant_id uuid not null references variants on delete cascade,
  change int not null,
  balance int not null,
  reason text not null check (reason in ('purchase','sale','return','adjustment','damage','cancel','initial')),
  reference text,
  note text,
  actor uuid references auth.users,
  created_at timestamptz default now()
);
create index on stock_movements(variant_id, created_at desc);

-- ───────────── Commerce ─────────────
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  kind text not null check (kind in ('percent','flat')),
  value numeric(10,2) not null,
  min_cart numeric(10,2) default 0,
  max_uses int, used int default 0,
  starts_at timestamptz default now(), ends_at timestamptz,
  active boolean default true
);

create sequence order_no_seq start 10001;
create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('EK' || nextval('order_no_seq')),
  access_token uuid not null default gen_random_uuid(),   -- secure guest link
  user_id uuid references auth.users,
  email text not null, phone text not null, full_name text not null,
  address jsonb not null,
  subtotal numeric(10,2) not null, discount numeric(10,2) default 0,
  shipping numeric(10,2) default 0, total numeric(10,2) not null,
  coupon_code text,
  payment_method text not null check (payment_method in ('cod','razorpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  payment_ref text,
  status text not null default 'placed' check (status in ('placed','confirmed','packed','shipped','delivered','cancelled','returned')),
  tracking_url text,
  marketing_consent boolean default false,
  first_touch jsonb, last_touch jsonb,
  notes text,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on orders(created_at desc);
create table order_items (
  id bigserial primary key,
  order_id uuid not null references orders on delete cascade,
  variant_id uuid references variants on delete set null,
  product_name text not null, variant_label text not null, sku text not null,
  unit_price numeric(10,2) not null, qty int not null check (qty > 0)
);

-- ───────────── Marketing ─────────────
create table leads (
  id uuid primary key default gen_random_uuid(),
  source text not null,                 -- newsletter, whatsapp, back_in_stock, wholesale...
  name text, email text, phone text, interest text,
  variant_id uuid references variants on delete set null,
  landing_page text, first_touch jsonb, last_touch jsonb,
  consent boolean not null default false,
  status text default 'new',
  created_at timestamptz default now()
);
create table settings (key text primary key, value jsonb not null);
create table audit_log (
  id bigserial primary key, actor uuid, action text not null,
  entity text, entity_id text, detail jsonb, created_at timestamptz default now()
);

-- ───────────── RPC: place order atomically ─────────────
create or replace function public.place_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v variants%rowtype; p products%rowtype;
  sub numeric := 0; disc numeric := 0; ship numeric := 0;
  c coupons%rowtype; o orders%rowtype; free_ship numeric;
begin
  if jsonb_array_length(payload->'items') = 0 then raise exception 'Cart is empty'; end if;
  -- lock & validate
  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into v from variants where id = (it->>'variant_id')::uuid for update;
    if not found then raise exception 'Item no longer available'; end if;
    select * into p from products where id = v.product_id and status = 'active';
    if not found then raise exception '% is no longer available', v.sku; end if;
    if (it->>'qty')::int < 1 then raise exception 'Invalid quantity'; end if;
    if not v.allow_backorder and v.stock < (it->>'qty')::int then
      raise exception 'Only % left of % (%)', v.stock, p.name, v.label;
    end if;
    sub := sub + v.price * (it->>'qty')::int;
  end loop;

  if coalesce(payload->>'coupon','') <> '' then
    select * into c from coupons where upper(code) = upper(payload->>'coupon') and active
      and starts_at <= now() and (ends_at is null or ends_at > now())
      and (max_uses is null or used < max_uses) and sub >= min_cart;
    if found then
      disc := case when c.kind = 'percent' then round(sub * c.value / 100, 2) else least(c.value, sub) end;
      update coupons set used = used + 1 where id = c.id;
    end if;
  end if;

  select coalesce((value->>'free_shipping_min')::numeric, 999) into free_ship from settings where key = 'store';
  free_ship := coalesce(free_ship, 999);
  ship := case when sub - disc >= free_ship then 0 else 79 end;
  if payload->>'payment_method' = 'cod' then ship := ship + 49; end if;

  insert into orders(user_id, email, phone, full_name, address, subtotal, discount, shipping, total,
    coupon_code, payment_method, marketing_consent, first_touch, last_touch)
  values (auth.uid(), payload->>'email', payload->>'phone', payload->>'full_name', payload->'address',
    sub, disc, ship, sub - disc + ship, nullif(payload->>'coupon',''), payload->>'payment_method',
    coalesce((payload->>'consent')::boolean,false), payload->'first_touch', payload->'last_touch')
  returning * into o;

  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into v from variants where id = (it->>'variant_id')::uuid;
    select * into p from products where id = v.product_id;
    insert into order_items(order_id, variant_id, product_name, variant_label, sku, unit_price, qty)
      values (o.id, v.id, p.name, v.label, v.sku, v.price, (it->>'qty')::int);
    update variants set stock = stock - (it->>'qty')::int where id = v.id;
    insert into stock_movements(variant_id, change, balance, reason, reference)
      values (v.id, -(it->>'qty')::int, v.stock - (it->>'qty')::int, 'sale', o.order_no);
  end loop;

  return jsonb_build_object('order_no', o.order_no, 'token', o.access_token, 'total', o.total);
end $$;

create or replace function public.get_order(p_no text, p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object('items',
    (select jsonb_agg(to_jsonb(i)) from order_items i where i.order_id = o.id))
  from orders o where o.order_no = p_no and o.access_token = p_token;
$$;

create or replace function public.validate_coupon(p_code text, p_subtotal numeric) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', code, 'kind', kind, 'value', value, 'min_cart', min_cart)
  from coupons where upper(code) = upper(p_code) and active and starts_at <= now()
    and (ends_at is null or ends_at > now()) and (max_uses is null or used < max_uses)
    and p_subtotal >= min_cart;
$$;

-- Staff stock adjustment with ledger + audit
create or replace function public.adjust_stock(p_variant uuid, p_change int, p_reason text, p_note text default null, p_ref text default null)
returns int language plpgsql security definer set search_path = public as $$
declare nb int;
begin
  if not has_role(array['inventory','admin']::app_role[]) then raise exception 'Not authorised'; end if;
  update variants set stock = stock + p_change where id = p_variant returning stock into nb;
  if nb < 0 then raise exception 'Stock cannot go below zero'; end if;
  insert into stock_movements(variant_id, change, balance, reason, note, reference, actor)
    values (p_variant, p_change, nb, p_reason, p_note, p_ref, auth.uid());
  insert into audit_log(actor, action, entity, entity_id, detail)
    values (auth.uid(), 'stock.adjust', 'variant', p_variant::text, jsonb_build_object('change', p_change, 'reason', p_reason));
  return nb;
end $$;

-- Order status change; cancelling restocks items once.
create or replace function public.set_order_status(p_order uuid, p_status text, p_tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders%rowtype; i order_items%rowtype; nb int;
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  select * into o from orders where id = p_order for update;
  if p_status in ('cancelled','returned') and o.status not in ('cancelled','returned') then
    for i in select * from order_items where order_id = o.id loop
      update variants set stock = stock + i.qty where id = i.variant_id returning stock into nb;
      insert into stock_movements(variant_id, change, balance, reason, reference, actor)
        values (i.variant_id, i.qty, nb, case when p_status='cancelled' then 'cancel' else 'return' end, o.order_no, auth.uid());
    end loop;
  end if;
  update orders set status = p_status, tracking_url = coalesce(p_tracking, tracking_url), updated_at = now() where id = o.id;
  insert into audit_log(actor, action, entity, entity_id, detail)
    values (auth.uid(), 'order.status', 'order', o.order_no, jsonb_build_object('from', o.status, 'to', p_status));
end $$;

-- ───────────── Row-level security ─────────────
alter table profiles enable row level security;
alter table categories enable row level security;
alter table concerns enable row level security;
alter table products enable row level security;
alter table product_concerns enable row level security;
alter table variants enable row level security;
alter table stock_movements enable row level security;
alter table coupons enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table leads enable row level security;
alter table settings enable row level security;
alter table audit_log enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid() or is_staff());
create policy "admin manages profiles" on profiles for update using (has_role(array['admin']::app_role[]));

create policy "public read" on categories for select using (true);
create policy "public read" on concerns for select using (true);
create policy "public read" on product_concerns for select using (true);
create policy "public read" on settings for select using (true);
create policy "public read active" on products for select using (status = 'active' or is_staff());
create policy "public read" on variants for select using (true);

create policy "staff write" on categories for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));
create policy "staff write" on concerns for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));
create policy "staff write" on products for all using (has_role(array['admin','inventory','marketing']::app_role[])) with check (has_role(array['admin','inventory','marketing']::app_role[]));
create policy "staff write" on product_concerns for all using (has_role(array['admin','inventory','marketing']::app_role[])) with check (has_role(array['admin','inventory','marketing']::app_role[]));
-- stock itself is only changed through adjust_stock(); staff can edit price/labels
create policy "staff write" on variants for all using (has_role(array['admin','inventory']::app_role[])) with check (has_role(array['admin','inventory']::app_role[]));
create policy "staff write" on settings for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));

create policy "staff read" on stock_movements for select using (is_staff());
create policy "marketing manages" on coupons for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));
create policy "customer own orders" on orders for select using (user_id = auth.uid() or is_staff());
create policy "staff update orders" on orders for update using (is_staff());
create policy "items via order" on order_items for select using (exists(select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
create policy "anyone creates lead" on leads for insert with check (true);
create policy "staff reads leads" on leads for select using (has_role(array['admin','marketing']::app_role[]));
create policy "staff updates leads" on leads for update using (has_role(array['admin','marketing']::app_role[]));
create policy "admin reads audit" on audit_log for select using (has_role(array['admin']::app_role[]));

grant execute on function place_order(jsonb), get_order(text, uuid), validate_coupon(text, numeric) to anon, authenticated;
grant execute on function adjust_stock(uuid,int,text,text,text), set_order_status(uuid,text,text) to authenticated;

-- Guest order lookup by order number + email (ORD-001) → returns the secure link token
create or replace function public.track_order(p_no text, p_email text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('order_no', order_no, 'token', access_token)
  from orders where order_no = upper(p_no) and lower(email) = lower(p_email);
$$;
grant execute on function track_order(text, text) to anon, authenticated;

-- Release stock held by online-payment orders never paid (schedule with pg_cron every 15 min):
-- select cron.schedule('release-stale', '*/15 * * * *', 'select public.release_stale_orders()');
create or replace function public.release_stale_orders() returns int
language plpgsql security definer set search_path = public as $$
declare o record; i order_items%rowtype; nb int; n int := 0;
begin
  for o in select * from orders where payment_method = 'razorpay' and payment_status in ('pending','failed')
      and status = 'placed' and created_at < now() - interval '45 minutes' for update skip locked loop
    for i in select * from order_items where order_id = o.id loop
      update variants set stock = stock + i.qty where id = i.variant_id returning stock into nb;
      insert into stock_movements(variant_id, change, balance, reason, reference, note)
        values (i.variant_id, i.qty, nb, 'cancel', o.order_no, 'Payment not completed');
    end loop;
    update orders set status = 'cancelled', updated_at = now() where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Product image storage (public read, staff write)
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true) on conflict do nothing;
create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
create policy "staff upload images" on storage.objects for insert with check (bucket_id = 'product-images' and public.is_staff());
create policy "staff delete images" on storage.objects for delete using (bucket_id = 'product-images' and public.is_staff());

-- Make a user admin after they sign up once:
-- update profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
