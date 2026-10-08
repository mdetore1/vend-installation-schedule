-- Hand-placed map pins. The map plots locations and queue deals from their
-- free-text "City, State"; when that can't be placed (or only lands at a
-- state's center) someone can search an address and pin it here instead.
-- item_key is 'location:<id>' or 'queue:<id>'. needs_confirm flags a pin
-- placed from a partial/uncertain address so it gets double-checked before
-- anyone drives out to it.
create table if not exists geo_overrides (
  item_key text primary key,
  lat double precision not null,
  lng double precision not null,
  address text,
  needs_confirm boolean not null default true,
  created_at timestamptz not null default now()
);

alter table geo_overrides enable row level security;
create policy "geo_overrides readable by approved users" on geo_overrides for select using (is_approved());
create policy "geo_overrides insertable by admins" on geo_overrides for insert with check (is_admin());
create policy "geo_overrides updatable by admins" on geo_overrides for update using (is_admin());
create policy "geo_overrides deletable by admins" on geo_overrides for delete using (is_admin());

alter publication supabase_realtime add table geo_overrides;
