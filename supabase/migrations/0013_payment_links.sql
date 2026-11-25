-- Payment links: an admin creates an order for a customer (catalogue items and/or custom lines, own prices),
-- shares the order's secure link, and the customer pays it online with the normal Razorpay checkout.
alter table orders add column if not exists source text, add column if not exists link_expires_at timestamptz,
  add column if not exists created_by uuid;

-- payload: { full_name, email, phone, address{line1,line2,city,state,pincode},
--   items: [{ variant_id, qty, unit_price? } | { name, label?, qty, unit_price }],
--   discount?, shipping?, notes?, expires_days? (default 7) }
create or replace function public.admin_create_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare it jsonb; v variants%rowtype; p products%rowtype; o orders%rowtype; q int; price numeric;
  sub numeric := 0; disc numeric; ship numeric; days int; uid uuid;
begin
  if not has_role(array['admin','staff']::app_role[]) then raise exception 'Only admin or orders staff can create payment links'; end if;
  if coalesce(trim(payload->>'full_name'),'') = '' or coalesce(trim(payload->>'phone'),'') = '' or coalesce(trim(payload->>'email'),'') = '' then
    raise exception 'Customer name, phone and email are required'; end if;
  if jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then raise exception 'Add at least one item'; end if;

  for it in select * from jsonb_array_elements(payload->'items') loop
    q := coalesce((it->>'qty')::int, 0);
    if q < 1 then raise exception 'Quantity must be at least 1'; end if;
    if coalesce(it->>'variant_id','') <> '' then
      select * into v from variants where id = (it->>'variant_id')::uuid for update;
      if not found then raise exception 'A selected product no longer exists'; end if;
      select * into p from products where id = v.product_id;
      if p.combo is not null then raise exception '% is a combo — add the oils as separate items instead', p.name; end if;
      if not v.allow_backorder and v.stock < q then raise exception 'Only % left of % (%)', v.stock, p.name, v.label; end if;
      price := coalesce((it->>'unit_price')::numeric, v.price);
    else
      if coalesce(trim(it->>'name'),'') = '' then raise exception 'Custom items need a name'; end if;
      price := (it->>'unit_price')::numeric;
    end if;
    if price is null or price < 0 then raise exception 'Every item needs a price'; end if;
    sub := sub + price * q;
  end loop;

  disc := least(greatest(coalesce((payload->>'discount')::numeric, 0), 0), sub);
  ship := greatest(coalesce((payload->>'shipping')::numeric, 0), 0);
  if sub - disc + ship < 1 then raise exception 'The total must be at least ₹1 for online payment'; end if;
  days := coalesce((payload->>'expires_days')::int, 7);
  select id into uid from auth.users where lower(email) = lower(trim(payload->>'email')) limit 1;

  insert into orders(user_id, email, phone, full_name, address, subtotal, discount, shipping, total,
    payment_method, notes, source, link_expires_at, created_by)
  values (uid, lower(trim(payload->>'email')), trim(payload->>'phone'), trim(payload->>'full_name'), coalesce(payload->'address', '{}'::jsonb),
    sub, disc, ship, sub - disc + ship, 'razorpay', nullif(trim(payload->>'notes'),''), 'payment_link',
    case when days > 0 then now() + make_interval(days => days) end, auth.uid())
  returning * into o;

  for it in select * from jsonb_array_elements(payload->'items') loop
    q := (it->>'qty')::int;
    if coalesce(it->>'variant_id','') <> '' then
      select * into v from variants where id = (it->>'variant_id')::uuid;
      select * into p from products where id = v.product_id;
      insert into order_items(order_id, variant_id, product_name, variant_label, sku, unit_price, qty)
        values (o.id, v.id, p.name, v.label, v.sku, coalesce((it->>'unit_price')::numeric, v.price), q);
      update variants set stock = stock - q where id = v.id;
      insert into stock_movements(variant_id, change, balance, reason, reference, note)
        values (v.id, -q, v.stock - q, 'sale', o.order_no, 'payment link');
    else
      insert into order_items(order_id, variant_id, product_name, variant_label, sku, unit_price, qty)
        values (o.id, null, trim(it->>'name'), coalesce(nullif(trim(it->>'label'),''), 'Custom'), 'CUSTOM', (it->>'unit_price')::numeric, q);
    end if;
  end loop;

  insert into audit_log(actor, action, entity, entity_id, detail)
    values (auth.uid(), 'order.payment_link', 'order', o.order_no, jsonb_build_object('total', o.total, 'email', o.email));
  return jsonb_build_object('id', o.id, 'order_no', o.order_no, 'token', o.access_token, 'total', o.total, 'expires_at', o.link_expires_at);
end $$;
revoke all on function public.admin_create_order(jsonb) from public, anon;
grant execute on function public.admin_create_order(jsonb) to authenticated;

-- Unpaid website orders are released after 45 minutes; payment-link orders stay open until their link expires.
create or replace function public.release_stale_orders() returns int
language plpgsql security definer set search_path = public as $$
declare o record; i order_items%rowtype; nb int; n int := 0;
begin
  for o in select * from orders where payment_method = 'razorpay' and payment_status in ('pending','failed') and status = 'placed'
      and (case when source = 'payment_link' then link_expires_at is not null and link_expires_at < now()
                else created_at < now() - interval '45 minutes' end)
      for update skip locked loop
    for i in select * from order_items where order_id = o.id and variant_id is not null loop
      update variants set stock = stock + i.qty where id = i.variant_id returning stock into nb;
      insert into stock_movements(variant_id, change, balance, reason, reference, note)
        values (i.variant_id, i.qty, nb, 'cancel', o.order_no, 'Payment not completed');
    end loop;
    update orders set status = 'cancelled', updated_at = now() where id = o.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.release_stale_orders() from public, anon, authenticated;
