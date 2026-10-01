-- Logs the outcome of every background sync run (currently just
-- hubspot-sync) so the app can show "last synced X ago" and flag when a run
-- had errors, instead of that only being discoverable by digging through
-- Supabase's own Edge Function logs after someone notices stale data.
create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'hubspot',
  ran_at timestamptz not null default now(),
  ok boolean not null,
  total_deals integer,
  synced integer,
  skipped integer,
  removed_stale integer,
  errors jsonb not null default '[]'::jsonb
);

alter table sync_runs enable row level security;
create policy "sync_runs readable by approved users" on sync_runs for select using (is_approved());
create policy "sync_runs writable by admins" on sync_runs for insert with check (is_admin());

alter publication supabase_realtime add table sync_runs;
