-- Vend Installation Schedule — Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.

-- ── Profiles (role lives here, separate from Supabase's own auth.users) ────
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  role text not null default 'pending' check (role in ('pending', 'viewer', 'admin')),
  created_at timestamptz not null default now()
);

-- New sign-ups get a profile row automatically, defaulted to 'pending' (no
-- data access) until an admin promotes them from Manage Users.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ── Team (installers/onboarding staff assignable to phases) ────────────────
create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  initials text not null,
  color_bg text not null,
  color_text text not null,
  created_at timestamptz not null default now()
);

create table if not exists time_off (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references team_members(id) on delete cascade,
  start_date date not null,
  end_date date not null
);

-- ── Locations + phases (the main schedule) ──────────────────────────────────
create table if not exists locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text default '',
  archived boolean not null default false,
  lanes text,
  access_type text,
  sales_rep text,
  property_management text,
  ownership text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists phases (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  label text not null,
  owner_id uuid references team_members(id) on delete set null,
  start_date date not null,
  end_date date not null,
  confirmed boolean not null default false,
  done boolean not null default false,
  conflict_acknowledged boolean not null default false
);

-- ── Sales queue ──────────────────────────────────────────────────────────
create table if not exists queue_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text default '',
  lanes text,
  access_type text,
  contract_state text default 'In Progress',
  potential_go_live_date date,
  sales_rep text,
  property_management text,
  ownership text,
  created_at timestamptz not null default now()
);

create table if not exists sales_reps (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- ── Locations map ────────────────────────────────────────────────────────
create table if not exists live_garages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text,
  street text,
  city text,
  state text,
  lat double precision not null,
  lng double precision not null
);

create table if not exists map_pins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  place text default '',
  lat double precision not null,
  lng double precision not null,
  live boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists map_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  member_names text[] not null default '{}'
);

-- ── Row-level security ───────────────────────────────────────────────────
alter table profiles enable row level security;
alter table team_members enable row level security;
alter table time_off enable row level security;
alter table locations enable row level security;
alter table phases enable row level security;
alter table queue_items enable row level security;
alter table sales_reps enable row level security;
alter table live_garages enable row level security;
alter table map_pins enable row level security;
alter table map_groups enable row level security;

-- Any signed-in user with an approved profile (viewer or admin) can read
-- everything; only admins can write. "pending" users can't read anything
-- until an admin promotes them.
create or replace function is_approved()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('viewer', 'admin')
  );
$$ language sql security definer stable;

create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- profiles: everyone approved can see the roster; only admins manage roles.
create policy "profiles readable by approved users" on profiles for select using (is_approved() or id = auth.uid());
create policy "profiles editable by admins" on profiles for update using (is_admin());
create policy "profiles deletable by admins" on profiles for delete using (is_admin());

do $$
declare
  t text;
begin
  foreach t in array array['team_members','time_off','locations','phases','queue_items','sales_reps','live_garages','map_pins','map_groups']
  loop
    execute format('create policy "%1$s readable by approved users" on %1$I for select using (is_approved());', t);
    execute format('create policy "%1$s writable by admins" on %1$I for insert with check (is_admin());', t);
    execute format('create policy "%1$s updatable by admins" on %1$I for update using (is_admin());', t);
    execute format('create policy "%1$s deletable by admins" on %1$I for delete using (is_admin());', t);
  end loop;
end $$;

-- ── Realtime (so edits show up live for everyone without refreshing) ─────
alter publication supabase_realtime add table locations, phases, team_members, time_off, queue_items, sales_reps, map_pins, map_groups, live_garages, profiles;
