-- Admin extensions: reviews moderation, redirects manager, store content settings.
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products on delete cascade,
  author text not null, rating int not null check (rating between 1 and 5),
  title text, body text, verified boolean default false,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
create table if not exists redirects (
  id uuid primary key default gen_random_uuid(),
  source text unique not null, destination text not null,
  permanent boolean default true, hits int default 0, created_at timestamptz default now()
);
alter table reviews enable row level security;
alter table redirects enable row level security;
create policy "public reads approved" on reviews for select using (status = 'approved' or is_staff());
create policy "anyone submits" on reviews for insert with check (status = 'pending');
create policy "staff moderates" on reviews for update using (has_role(array['admin','marketing']::app_role[]));
create policy "staff deletes" on reviews for delete using (has_role(array['admin','marketing']::app_role[]));
create policy "public read" on redirects for select using (true);
create policy "seo manages" on redirects for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));
-- Staff can see team list; admins change roles (policy "admin manages profiles" already exists)
create policy "staff reads team" on profiles for select using (is_staff());
-- audit trigger for settings + coupons + redirects
create or replace function public.audit_row() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(actor, action, entity, entity_id, detail)
  values (auth.uid(), tg_table_name || '.' || lower(tg_op), tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', (case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'key'),
          case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end $$;
create trigger audit_settings after insert or update or delete on settings for each row execute function audit_row();
create trigger audit_coupons after insert or update or delete on coupons for each row execute function audit_row();
create trigger audit_redirects after insert or update or delete on redirects for each row execute function audit_row();
create trigger audit_reviews after update or delete on reviews for each row execute function audit_row();
create trigger audit_products after update on products for each row execute function audit_row();

-- Shipping fees now come from Admin → Settings
create or replace function public.place_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v variants%rowtype; p products%rowtype;
  sub numeric := 0; disc numeric := 0; ship numeric := 0;
  c coupons%rowtype; o orders%rowtype; free_ship numeric; flat numeric; codfee numeric;
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

  select (value->>'free_shipping_min')::numeric, (value->>'shipping_flat')::numeric, (value->>'cod_fee')::numeric
    into free_ship, flat, codfee from settings where key = 'store';
  free_ship := coalesce(free_ship, 999); flat := coalesce(flat, 79); codfee := coalesce(codfee, 49);
  ship := case when sub - disc >= free_ship then 0 else flat end;
  if payload->>'payment_method' = 'cod' then ship := ship + codfee; end if;

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

