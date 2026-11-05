-- Display order of products on the store, set from Admin → Products (up / down arrows).
alter table products add column if not exists sort int;
update products p set sort = s.rn from (select id, row_number() over (order by name) * 10 as rn from products) s
  where p.id = s.id and p.sort is null;

-- New products go to the end of the list.
create or replace function public.products_default_sort() returns trigger language plpgsql as $$
begin
  if new.sort is null then select coalesce(max(sort), 0) + 10 into new.sort from products; end if;
  return new;
end $$;
drop trigger if exists products_default_sort on products;
create trigger products_default_sort before insert on products for each row execute function public.products_default_sort();

-- Save a new order in one go: ids in the order they should appear.
create or replace function public.reorder_products(ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  update products p set sort = x.ord * 10 from unnest(ids) with ordinality x(id, ord) where p.id = x.id;
end $$;
revoke all on function public.reorder_products(uuid[]) from public, anon;
grant execute on function public.reorder_products(uuid[]) to authenticated;
