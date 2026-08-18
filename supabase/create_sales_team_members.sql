-- Backfill: make sure everyone in the Sales Reps list (sales_reps, used by
-- the Sales Queue's "Sales rep" field) has a Sales-department Team member.
-- Safe to re-run — both steps are idempotent.
-- Requires the team_members.department column (see schema_checklist_snapshot.sql).

-- 1) Anyone who already exists as a team member under a different
--    department (e.g. added manually before this feature existed) gets
--    moved into Sales instead of duplicated.
update team_members tm
set department = 'Sales'
from sales_reps sr
where lower(tm.name) = lower(sr.name)
  and tm.department is distinct from 'Sales';

-- 2) Anyone left with no team_members row at all gets created fresh.
with base as (
  select coalesce(max(sort_order), -1) as start_order, count(*) as start_count from team_members
),
palette(color_bg, color_text) as (
  values
    ('#3E8BFF', '#FDFDFD'),
    ('#14D5A3', '#111114'),
    ('#FFC24B', '#111114'),
    ('#FF4D4F', '#FDFDFD'),
    ('#009F95', '#FDFDFD'),
    ('#4A4A50', '#FDFDFD'),
    ('#7C6FEA', '#FDFDFD'),
    ('#FF7A45', '#FDFDFD')
),
palette_ord as (
  select *, row_number() over () - 1 as ord from palette
),
new_reps as (
  select
    sr.name,
    row_number() over (order by sr.name) - 1 as rn
  from sales_reps sr
  where not exists (select 1 from team_members tm where lower(tm.name) = lower(sr.name))
)
insert into team_members (name, initials, department, color_bg, color_text, sort_order)
select
  nr.name,
  upper(
    substr(split_part(trim(nr.name), ' ', 1), 1, 1) ||
    substr(split_part(trim(nr.name), ' ', 2), 1, 1)
  ) as initials,
  'Sales',
  p.color_bg,
  p.color_text,
  b.start_order + 1 + nr.rn
from new_reps nr
cross join base b
join palette_ord p on p.ord = (b.start_count + nr.rn) % 8;
