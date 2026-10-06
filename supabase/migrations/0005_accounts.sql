-- Customer accounts, order tracking timeline, GST tax invoices.

-- ── Accounts ──
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade default auth.uid(),
  label text default 'Home', full_name text not null, phone text not null, line1 text not null, line2 text,
  city text not null, state text not null, pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean default false, created_at timestamptz default now()
);
create index if not exists addresses_user_idx on addresses(user_id);
alter table addresses enable row level security;
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists wishlist (
  user_id uuid not null references auth.users on delete cascade default auth.uid(), product_slug text not null,
  created_at timestamptz default now(), primary key (user_id, product_slug)
);
alter table wishlist enable row level security;
create policy "own wishlist" on wishlist for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Customers can see their own points and referral code (matched on their sign-in email)
create policy "own loyalty" on loyalty_ledger for select using (lower(email) = lower(auth.jwt() ->> 'email'));
create policy "own referral" on referral_codes for select using (lower(email) = lower(auth.jwt() ->> 'email'));

create or replace function public.update_my_profile(p_name text, p_phone text) returns void
language sql security definer set search_path = public as $$
  update profiles set full_name = nullif(trim(p_name),''), phone = nullif(right(regexp_replace(coalesce(p_phone,''),'\D','','g'), 10),'') where id = auth.uid();
$$;
-- Attach earlier guest orders placed with the same (verified) email to the signed-in account
create or replace function public.claim_my_orders() returns int
language plpgsql security definer set search_path = public as $$
declare n int; em text := lower(auth.jwt() ->> 'email');
begin
  if auth.uid() is null or em is null then return 0; end if;
  update orders set user_id = auth.uid() where user_id is null and lower(email) = em;
  get diagnostics n = row_count; return n;
end $$;
revoke execute on function public.update_my_profile(text,text), public.claim_my_orders() from public, anon;
grant execute on function public.update_my_profile(text,text), public.claim_my_orders() to authenticated;

-- ── Tracking ──
alter table orders add column if not exists courier text, add column if not exists awb text,
  add column if not exists expected_delivery date, add column if not exists invoice_no text unique, add column if not exists invoice_date timestamptz;
create table if not exists order_events (
  id bigserial primary key, order_id uuid not null references orders on delete cascade,
  status text not null, note text, created_at timestamptz default now()
);
create index if not exists order_events_order_idx on order_events(order_id, created_at);
alter table order_events enable row level security;
create policy "events via order" on order_events for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));

-- ── GST invoices ──
alter table products add column if not exists hsn text default '3301', add column if not exists gst_rate numeric(4,2) default 18;
alter table order_items add column if not exists hsn text, add column if not exists gst_rate numeric(4,2);
create table if not exists invoice_counters (fy text primary key, last int not null default 0);
alter table invoice_counters enable row level security;

create or replace function public.order_items_tax() returns trigger language plpgsql security definer set search_path = public as $$
begin
  select coalesce(p.hsn, '3301'), coalesce(p.gst_rate, 18) into new.hsn, new.gst_rate
    from variants v join products p on p.id = v.product_id where v.id = new.variant_id;
  new.hsn := coalesce(new.hsn, '3301'); new.gst_rate := coalesce(new.gst_rate, 18);
  return new;
end $$;
drop trigger if exists order_items_tax on order_items;
create trigger order_items_tax before insert on order_items for each row execute function order_items_tax();

-- Timeline + invoice number: invoice is issued when the order is confirmed (or later), never for cancelled orders.
create or replace function public.orders_track() returns trigger language plpgsql security definer set search_path = public as $$
declare v_fy text; v_n int; d date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if tg_op = 'INSERT' then
    insert into order_events(order_id, status, note) values (new.id, 'placed', case when new.payment_method = 'cod' then 'Cash on delivery' else 'Awaiting payment' end);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into order_events(order_id, status, note) values (new.id, new.status,
      case when new.status = 'shipped' and coalesce(new.courier, new.awb) is not null then concat_ws(' · ', new.courier, 'AWB ' || new.awb) end);
  elsif (new.awb is distinct from old.awb or new.courier is distinct from old.courier) and new.awb is not null then
    insert into order_events(order_id, status, note) values (new.id, 'tracking', concat_ws(' · ', new.courier, 'AWB ' || new.awb));
  end if;
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    insert into order_events(order_id, status, note) values (new.id, 'paid', 'Payment received');
  end if;
  if new.invoice_no is null and new.status in ('confirmed','packed','shipped','delivered') then
    v_fy := case when extract(month from d) >= 4 then to_char(d,'YY') || '-' || to_char(d + interval '1 year','YY') else to_char(d - interval '1 year','YY') || '-' || to_char(d,'YY') end;
    insert into invoice_counters as c (fy, last) values (v_fy, 1) on conflict (fy) do update set last = c.last + 1 returning c.last into v_n;
    new.invoice_no := 'EK/' || v_fy || '/' || lpad(v_n::text, 5, '0'); new.invoice_date := now();
  end if;
  return new;
end $$;
drop trigger if exists orders_track_ins on orders;
drop trigger if exists orders_track_upd on orders;
create trigger orders_track_ins after insert on orders for each row execute function orders_track();
create trigger orders_track_upd before update on orders for each row execute function orders_track();

-- Backfill: timeline + invoices for orders that already exist
insert into order_events(order_id, status, created_at) select id, 'placed', created_at from orders o where not exists (select 1 from order_events e where e.order_id = o.id);
insert into order_events(order_id, status, created_at) select id, status, updated_at from orders where status <> 'placed';
update order_items i set hsn = coalesce(p.hsn,'3301'), gst_rate = coalesce(p.gst_rate,18) from variants v join products p on p.id = v.product_id where v.id = i.variant_id and i.hsn is null;
update orders set updated_at = updated_at where invoice_no is null and status in ('confirmed','packed','shipped','delivered');

-- Order lookup returns the timeline and referral code too
create or replace function public.get_order(p_no text, p_token uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select to_jsonb(o) || jsonb_build_object(
    'items', (select jsonb_agg(to_jsonb(i) order by i.id) from order_items i where i.order_id = o.id),
    'events', (select jsonb_agg(jsonb_build_object('status', e.status, 'note', e.note, 'at', e.created_at) order by e.created_at, e.id) from order_events e where e.order_id = o.id),
    'referral_code', (select code from referral_codes r where r.email = lower(o.email)))
  from orders o where o.order_no = p_no and o.access_token = p_token;
$$;

revoke execute on function public.order_items_tax(), public.orders_track() from public, anon, authenticated;
