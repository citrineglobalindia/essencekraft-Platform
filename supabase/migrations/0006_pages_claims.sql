-- Content pages migrated from the old site (FAQ, policies, use-case landing pages, guides) + claims review queue.
create table if not exists site_pages (
  path text primary key check (path ~ '^/[a-z0-9/-]+$'),
  kind text not null check (kind in ('support','policy','category','landing','hub','guide')),
  title text not null, description text, eyebrow text, h1 text not null, html text not null,
  products text[] default '{}', status text not null default 'published' check (status in ('draft','published')),
  updated_at timestamptz default now()
);
alter table site_pages enable row level security;
create policy "public reads published pages" on site_pages for select using (status = 'published' or is_staff());
create policy "marketing edits pages" on site_pages for all using (has_role(array['admin','marketing']::app_role[])) with check (has_role(array['admin','marketing']::app_role[]));
create trigger audit_site_pages after update or delete on site_pages for each row execute function audit_row();

-- Claims review: every article/page is scanned for medical or unverifiable claims (Drugs & Magic Remedies Act, ASCI).
create table if not exists claim_reviews (
  key text primary key, kind text not null check (kind in ('wiki','page')), ref text not null, title text not null,
  flags jsonb not null default '[]', severity text not null check (severity in ('high','medium','low','none')), score int not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','needs_changes','not_for_ads')),
  note text, reviewed_by uuid, reviewed_at timestamptz, scanned_at timestamptz default now()
);
create index if not exists claim_reviews_sev_idx on claim_reviews(severity, status);
alter table claim_reviews enable row level security;
create policy "staff reads claims" on claim_reviews for select using (is_staff());
create policy "marketing reviews claims" on claim_reviews for update using (has_role(array['admin','marketing']::app_role[]));
create trigger audit_claims after update on claim_reviews for each row execute function audit_row();
-- Reviewed status flows into the encyclopedia editor's claim status, and vice versa stays visible in both places.
create or replace function public.claims_sync() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.reviewed_by := auth.uid(); new.reviewed_at := now();
  if new.kind = 'wiki' then
    update wiki_overrides set claim_status = case new.status when 'approved' then 'approved' when 'pending' then 'pending' else 'rejected' end where slug = new.ref;
  end if;
  return new;
end $$;
create trigger claims_sync before update of status on claim_reviews for each row execute function claims_sync();
revoke execute on function public.claims_sync() from public, anon, authenticated;
