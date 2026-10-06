-- Marketing & growth: abandoned carts, landing pages, campaigns, loyalty & referrals, encyclopedia edits, promotions.

-- ── Abandoned carts ──
create table if not exists abandoned_carts (
  token uuid primary key, email text, phone text, name text, lines jsonb not null default '[]', subtotal numeric(10,2) default 0,
  consent boolean default false, recovered_order text, reminded_at timestamptz, reminders int default 0,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table abandoned_carts enable row level security;
create policy "marketing reads carts" on abandoned_carts for select using (has_role(array['admin','marketing','staff']::app_role[]));
create policy "marketing updates carts" on abandoned_carts for update using (has_role(array['admin','marketing','staff']::app_role[]));
create or replace function public.save_cart(p_token uuid, p_email text, p_phone text, p_name text, p_lines jsonb, p_subtotal numeric, p_consent boolean)
returns void language sql security definer set search_path = public as $$
  insert into abandoned_carts(token, email, phone, name, lines, subtotal, consent)
  values (p_token, nullif(lower(trim(p_email)),''), nullif(trim(p_phone),''), nullif(trim(p_name),''), coalesce(p_lines,'[]'), coalesce(p_subtotal,0), coalesce(p_consent,false))
  on conflict (token) do update set email = coalesce(excluded.email, abandoned_carts.email), phone = coalesce(excluded.phone, abandoned_carts.phone),
    name = coalesce(excluded.name, abandoned_carts.name), lines = excluded.lines, subtotal = excluded.subtotal, consent = excluded.consent, updated_at = now()
  where abandoned_carts.recovered_order is null;
$$;
create or replace function public.get_cart(p_token uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select lines from abandoned_carts where token = p_token and recovered_order is null;
$$;
grant execute on function save_cart(uuid,text,text,text,jsonb,numeric,boolean), get_cart(uuid) to anon, authenticated;

-- ── Landing pages ──
create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null,
  status text not null default 'draft' check (status in ('draft','published')), blocks jsonb not null default '[]',
  seo_title text, seo_description text, views int default 0, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table landing_pages enable row level security;
create policy "public reads published" on landing_pages for select using (status = 'published' or is_staff());
create policy "marketing manages pages" on landing_pages for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));

-- ── Campaigns (broadcast log) ──
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(), name text not null, channel text not null check (channel in ('whatsapp','email','sms')),
  segment jsonb not null default '{}', message text not null, coupon_code text, audience int default 0,
  created_by uuid default auth.uid(), created_at timestamptz default now()
);
alter table campaigns enable row level security;
create policy "marketing manages campaigns" on campaigns for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));

-- ── Loyalty & referrals ──
create table if not exists loyalty_ledger (
  id bigserial primary key, email text not null, points int not null, reason text not null, order_no text, note text,
  created_at timestamptz default now()
);
create index if not exists loyalty_email_idx on loyalty_ledger(lower(email));
create table if not exists referral_codes (email text primary key, code text unique not null, created_at timestamptz default now());
alter table loyalty_ledger enable row level security;
alter table referral_codes enable row level security;
create policy "marketing reads loyalty" on loyalty_ledger for select using (has_role(array['admin','marketing','staff']::app_role[]));
create policy "marketing reads referrals" on referral_codes for select using (has_role(array['admin','marketing','staff']::app_role[]));
insert into settings(key, value) values ('loyalty', '{"enabled":true,"earn_per_100":1,"point_value":0.5,"referral_bonus":100,"referral_discount":10,"min_redeem":100}')
  on conflict (key) do nothing;

create or replace function public.ensure_referral(p_email text) returns text language plpgsql security definer set search_path = public as $$
declare c text; s jsonb;
begin
  if p_email is null or p_email = '' then return null; end if;
  select code into c from referral_codes where email = lower(p_email);
  if c is not null then return c; end if;
  select value into s from settings where key = 'loyalty';
  loop
    c := 'REF-' || upper(substr(regexp_replace(split_part(p_email,'@',1),'[^a-zA-Z]','','g') || 'EK', 1, 4)) || lpad((floor(random()*10000))::int::text, 4, '0');
    exit when not exists (select 1 from referral_codes where code = c) and not exists (select 1 from coupons where upper(code) = c);
  end loop;
  insert into referral_codes(email, code) values (lower(p_email), c);
  insert into coupons(code, kind, value, min_cart, active) values (c, 'percent', coalesce((s->>'referral_discount')::numeric, 10), 0, coalesce((s->>'enabled')::boolean, true));
  return c;
end $$;

-- Every new order gets its buyer a referral code; abandoned carts from the same buyer are marked recovered.
create or replace function public.orders_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform ensure_referral(new.email);
  update abandoned_carts set recovered_order = new.order_no, updated_at = now()
    where recovered_order is null and ((email is not null and email = lower(new.email)) or (phone is not null and phone = new.phone))
      and updated_at > now() - interval '30 days';
  return new;
end $$;
drop trigger if exists orders_after_insert on orders;
create trigger orders_after_insert after insert on orders for each row execute function orders_after_insert();

-- Points are earned when an order is delivered (not when placed), and reversed if it is returned.
create or replace function public.orders_loyalty() returns trigger language plpgsql security definer set search_path = public as $$
declare s jsonb; earn int; ref text;
begin
  select value into s from settings where key = 'loyalty';
  if s is null or not coalesce((s->>'enabled')::boolean, true) then return new; end if;
  if new.status = 'delivered' and old.status is distinct from 'delivered' then
    earn := floor((new.total - new.shipping) / 100) * coalesce((s->>'earn_per_100')::int, 1);
    if earn > 0 then insert into loyalty_ledger(email, points, reason, order_no) values (lower(new.email), earn, 'order', new.order_no); end if;
    select email into ref from referral_codes where code = upper(coalesce(new.coupon_code,''));
    if ref is not null and ref <> lower(new.email) and not exists (select 1 from loyalty_ledger where reason = 'referral' and order_no = new.order_no) then
      insert into loyalty_ledger(email, points, reason, order_no, note) values (ref, coalesce((s->>'referral_bonus')::int, 100), 'referral', new.order_no, 'Referred ' || lower(new.email));
    end if;
  elsif new.status = 'returned' and old.status is distinct from 'returned' then
    insert into loyalty_ledger(email, points, reason, order_no)
      select lower(new.email), -sum(points), 'return', new.order_no from loyalty_ledger where order_no = new.order_no and reason = 'order' and lower(email) = lower(new.email) having sum(points) > 0;
  end if;
  return new;
end $$;
drop trigger if exists orders_loyalty on orders;
create trigger orders_loyalty after update of status on orders for each row execute function orders_loyalty();

-- Staff convert points into a single-use coupon for the customer.
create or replace function public.redeem_points(p_email text, p_points int) returns text language plpgsql security definer set search_path = public as $$
declare bal int; s jsonb; c text; amt numeric;
begin
  if not has_role(array['admin','marketing','staff']::app_role[]) then raise exception 'Not authorised'; end if;
  select value into s from settings where key = 'loyalty';
  select coalesce(sum(points),0) into bal from loyalty_ledger where lower(email) = lower(p_email);
  if p_points < coalesce((s->>'min_redeem')::int, 100) then raise exception 'Minimum redemption is % points', coalesce((s->>'min_redeem')::int, 100); end if;
  if p_points > bal then raise exception 'Only % points available', bal; end if;
  amt := round(p_points * coalesce((s->>'point_value')::numeric, 0.5));
  c := 'PTS-' || upper(substr(md5(random()::text), 1, 6));
  insert into coupons(code, kind, value, min_cart, max_uses, active, ends_at) values (c, 'flat', amt, 0, 1, true, now() + interval '90 days');
  insert into loyalty_ledger(email, points, reason, note) values (lower(p_email), -p_points, 'redeem', c);
  insert into audit_log(actor, action, entity, entity_id, detail) values (auth.uid(), 'loyalty.redeem', 'loyalty', lower(p_email), jsonb_build_object('points', p_points, 'coupon', c, 'value', amt));
  return c;
end $$;

-- Order lookup now also returns the buyer's referral code.
create or replace function public.get_order(p_no text, p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object('items', (select jsonb_agg(to_jsonb(i)) from order_items i where i.order_id = o.id),
    'referral_code', (select code from referral_codes r where r.email = lower(o.email)))
  from orders o where o.order_no = p_no and o.access_token = p_token;
$$;

-- ── Encyclopedia edits ──
create table if not exists wiki_overrides (
  slug text primary key, title text, fields jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  claim_status text not null default 'pending' check (claim_status in ('pending','approved','rejected')),
  updated_by uuid default auth.uid(), updated_at timestamptz default now()
);
alter table wiki_overrides enable row level security;
create policy "public reads published edits" on wiki_overrides for select using (status = 'published' or is_staff());
create policy "marketing edits wiki" on wiki_overrides for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));

-- ── Banners & popups ──
create table if not exists promotions (
  id uuid primary key default gen_random_uuid(), kind text not null check (kind in ('banner','popup')),
  title text not null, body text, cta text, href text, coupon_code text, theme text default 'forest',
  starts_at timestamptz default now(), ends_at timestamptz, active boolean default true, created_at timestamptz default now()
);
alter table promotions enable row level security;
create policy "public reads live promos" on promotions for select using ((active and starts_at <= now() and (ends_at is null or ends_at > now())) or is_staff());
create policy "marketing manages promos" on promotions for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));

-- Audit trail for the new admin areas
create trigger audit_landing after insert or update or delete on landing_pages for each row execute function audit_row();
create trigger audit_promotions after insert or update or delete on promotions for each row execute function audit_row();
create trigger audit_wiki after insert or update or delete on wiki_overrides for each row execute function audit_row();
create trigger audit_campaigns after insert on campaigns for each row execute function audit_row();

-- Internal helpers are not public API
revoke execute on function public.ensure_referral(text) from public, anon, authenticated;
revoke execute on function public.orders_after_insert() from public, anon, authenticated;
revoke execute on function public.orders_loyalty() from public, anon, authenticated;
revoke execute on function public.redeem_points(text, int) from public, anon;
grant execute on function public.redeem_points(text, int) to authenticated;
