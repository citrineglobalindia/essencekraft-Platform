-- Website visit counter for the admin dashboard (Today / 7 days / 30 days / 3 months).
-- Rows are written only by the server (/api/visit, service role); staff read aggregates through visit_stats().
create table if not exists site_visits (
  id bigserial primary key,
  vid text not null,              -- anonymous browser id (random, stored in the visitor's localStorage)
  sid text not null,              -- tab session id (sessionStorage) → one "visit"
  path text not null,
  referrer text,
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on site_visits (created_at);
alter table site_visits enable row level security;   -- no policies: not readable/writable with the public key

create or replace function public.visit_stats(p_from timestamptz) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not is_staff() then raise exception 'Not authorised'; end if;
  select jsonb_build_object(
    'pageviews', (select count(*) from site_visits where created_at >= p_from),
    'visits',    (select count(distinct sid) from site_visits where created_at >= p_from),
    'visitors',  (select count(distinct vid) from site_visits where created_at >= p_from),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'visits', v, 'pageviews', pv) order by d) from (
        select (created_at at time zone 'Asia/Kolkata')::date d, count(distinct sid) v, count(*) pv
        from site_visits where created_at >= p_from group by 1) x), '[]'::jsonb),
    'top_pages', coalesce((select jsonb_agg(jsonb_build_object('path', path, 'views', n) order by n desc) from (
        select path, count(*) n from site_visits where created_at >= p_from group by path order by n desc limit 5) y), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.visit_stats(timestamptz) from public, anon;
grant execute on function public.visit_stats(timestamptz) to authenticated;
