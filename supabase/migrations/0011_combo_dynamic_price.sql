-- Combo pricing: "fixed" (the combo's own price) or "dynamic" (total of the picked items' prices).
--   products.combo.pricing = 'fixed' | 'dynamic'   (missing = fixed)
-- The price is always worked out here in the database, never taken from the browser.
create or replace function public.combo_unit_price(p products, v variants, picks jsonb) returns numeric
language sql stable security definer set search_path = public as $$
  select case when p.combo is not null and p.combo->>'pricing' = 'dynamic'
    then coalesce((select sum(cv.price) from jsonb_array_elements_text(coalesce(picks, '[]'::jsonb)) e(id) join variants cv on cv.id = e.id::uuid), 0)
    else v.price end
$$;
revoke all on function public.combo_unit_price(products, variants, jsonb) from public, anon, authenticated;

-- Lets the admin know this database supports dynamic combo pricing.
create or replace function public.combo_dynamic_supported() returns boolean language sql stable as $$ select true $$;
grant execute on function public.combo_dynamic_supported() to anon, authenticated;

create or replace function public.place_order(payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; v variants%rowtype; p products%rowtype; cv variants%rowtype; cp products%rowtype;
  sub numeric := 0; disc numeric := 0; ship numeric := 0;
  c coupons%rowtype; o orders%rowtype; free_ship numeric; flat numeric; codfee numeric;
  q int; picks jsonb; pk jsonb; inc jsonb; sel jsonb; need jsonb := '{}'::jsonb; k text; n int; unit numeric;
begin
  if jsonb_array_length(payload->'items') = 0 then raise exception 'Cart is empty'; end if;
  -- lock & validate
  for it in select * from jsonb_array_elements(payload->'items') loop
    select * into v from variants where id = (it->>'variant_id')::uuid for update;
    if not found then raise exception 'Item no longer available'; end if;
    select * into p from products where id = v.product_id and status = 'active';
    if not found then raise exception '% is no longer available', v.sku; end if;
    q := (it->>'qty')::int;
    if q < 1 then raise exception 'Invalid quantity'; end if;
    if not v.allow_backorder and v.stock < q then
      raise exception 'Only % left of % (%)', v.stock, p.name, v.label;
    end if;
    if p.combo is not null then
      picks := coalesce(it->'selections', '[]'::jsonb);
      if jsonb_typeof(picks) <> 'array' or jsonb_array_length(picks) <> coalesce((p.combo->>'pick')::int, 0) then
        raise exception 'Please pick % items for %', p.combo->>'pick', p.name;
      end if;
      if not coalesce((p.combo->>'allow_repeat')::boolean, true)
         and (select count(distinct x) from jsonb_array_elements_text(picks) x) <> jsonb_array_length(picks) then
        raise exception 'Each item in % can be picked only once', p.name;
      end if;
      for pk in select * from jsonb_array_elements(picks) loop
        if not (p.combo->'options') ? (pk #>> '{}') then raise exception 'That choice isn''t part of %', p.name; end if;
        need := jsonb_set(need, array[pk #>> '{}'], to_jsonb(coalesce((need->>(pk #>> '{}'))::int, 0) + q));
      end loop;
      for inc in select * from jsonb_array_elements(coalesce(p.combo->'includes', '[]'::jsonb)) loop
        need := jsonb_set(need, array[inc->>'variant_id'], to_jsonb(coalesce((need->>(inc->>'variant_id'))::int, 0) + q * coalesce((inc->>'qty')::int, 1)));
      end loop;
    end if;
    sub := sub + combo_unit_price(p, v, it->'selections') * q;
  end loop;
  -- component stock (all combos in the cart together)
  for k, n in select key, value::int from jsonb_each_text(need) loop
    select * into cv from variants where id = k::uuid for update;
    if not found then raise exception 'A combo item is no longer available'; end if;
    select * into cp from products where id = cv.product_id;
    if not cv.allow_backorder and cv.stock < n then
      raise exception 'Only % left of % (%) for your combo', cv.stock, cp.name, cv.label;
    end if;
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
    q := (it->>'qty')::int; sel := null; unit := combo_unit_price(p, v, it->'selections');
    if p.combo is not null then
      select jsonb_agg(x order by ord) into sel from (
        select jsonb_build_object('variant_id', cv2.id, 'name', cp2.name, 'label', cv2.label, 'sku', cv2.sku, 'qty', 1, 'free', false) x, e.ord
          from jsonb_array_elements_text(it->'selections') with ordinality e(id, ord)
          join variants cv2 on cv2.id = e.id::uuid join products cp2 on cp2.id = cv2.product_id
        union all
        select jsonb_build_object('variant_id', cv3.id, 'name', cp3.name, 'label', cv3.label, 'sku', cv3.sku, 'qty', coalesce((i.inc->>'qty')::int, 1), 'free', true), 1000 + i.ord
          from jsonb_array_elements(coalesce(p.combo->'includes', '[]'::jsonb)) with ordinality i(inc, ord)
          join variants cv3 on cv3.id = (i.inc->>'variant_id')::uuid join products cp3 on cp3.id = cv3.product_id
      ) s;
    end if;
    insert into order_items(order_id, variant_id, product_name, variant_label, sku, unit_price, qty, selections)
      values (o.id, v.id, p.name, v.label, v.sku, unit, q, sel);
    update variants set stock = stock - q where id = v.id;
    insert into stock_movements(variant_id, change, balance, reason, reference)
      values (v.id, -q, v.stock - q, 'sale', o.order_no);
  end loop;
  -- deduct combo components (picked items + free includes)
  for k, n in select key, value::int from jsonb_each_text(need) loop
    update variants set stock = stock - n where id = k::uuid returning * into cv;
    insert into stock_movements(variant_id, change, balance, reason, reference, note)
      values (cv.id, -n, cv.stock, 'sale', o.order_no, 'combo');
  end loop;

  return jsonb_build_object('order_no', o.order_no, 'token', o.access_token, 'total', o.total);
end $$;
grant execute on function public.place_order(jsonb) to anon, authenticated;
