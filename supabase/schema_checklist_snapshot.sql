-- Freezes a location's onboarding checklist the moment it's archived
-- (marked launched), so future template edits (adding/removing tasks from
-- checklist_items) never reach back and alter an already-launched
-- location's historical record. NULL means "still tracking the live
-- template" — only set once a location is archived.
alter table locations add column if not exists checklist_snapshot jsonb;

-- A recovered/added reference link for a template task (e.g. "Tenant Upload
-- Template" links to a specific Google Sheet not visible anywhere in the
-- task's own text). One per task, shared by every location.
alter table checklist_items add column if not exists link_url text;

-- Per-location ad-hoc reference links added as the team works through that
-- location's checklist (e.g. "signed contract in Drive" for this garage
-- specifically) — separate from the template's own link_url above.
alter table checklist_progress add column if not exists links jsonb not null default '[]'::jsonb;

-- Manually nudges the displayed onboarding stage forward of what the
-- checklist alone would compute (e.g. still waiting on one Pre-Onboarding
-- task but the team has already moved on to Onboarding work). NULL means
-- "just use the automatic calculation." This is a floor, not a permanent
-- pin — once automatic progress catches up to or passes it, the override
-- stops mattering and display just follows automation again.
alter table locations add column if not exists stage_override smallint check (stage_override between 1 and 4);

-- The original Excel sheet's "Ownership" role label per task (Internal,
-- Onboarding, Implementation, Onboarding/Implementation, etc.) — used only
-- to compute a smart default assignee (see scheduleStore.js): Onboarding
-- tasks default to that location's Onboarding phase owner, Implementation
-- tasks default to its Install phase owner. Backfilled by
-- update_checklist_ownership.sql.
alter table checklist_items add column if not exists default_owner_role text;

-- Hides one task from just THIS location's checklist without touching the
-- shared template — e.g. "this garage doesn't need signage, it's a small
-- lot." Deleting a task from a location's view sets this instead of
-- removing the checklist_items row, which would have deleted it from every
-- other location too.
alter table checklist_progress add column if not exists excluded boolean not null default false;

-- Multiple, clearly-labeled reference links per task (some tasks legitimately
-- have more than one, e.g. "Setup Mode" + "Parking Contract Terms" alongside
-- a main dashboard link) — replaces the old single link_url column above,
-- which stays in place unused rather than being dropped. Backfilled by
-- update_checklist_reference_links.sql.
alter table checklist_items add column if not exists links jsonb not null default '[]'::jsonb;

-- A location temporarily paused (client gone quiet, budget hold, etc.) —
-- shown on the Dashboard the same way the calendar already shows
-- unconfirmed dates: dashed border, striped fill, "don't trust this state."
alter table locations add column if not exists on_hold boolean not null default false;

-- Whether this location has onsite staff through Spark — shown as a small
-- "Spark" bubble next to the city/state tag when true, same idea as the
-- existing per-location contractor field.
alter table locations add column if not exists has_onsite_staff boolean not null default false;

-- Same flag, tracked from the sales queue stage — carries over automatically
-- when a queue item is promoted to the calendar, so it doesn't need to be
-- re-entered.
alter table queue_items add column if not exists has_onsite_staff boolean not null default false;

-- Groups each team member into one of three buckets for Manage Team and the
-- calendar filter — Operations (installers), Sales, or Contractors/Other.
alter table team_members add column if not exists department text not null default 'Operations' check (department in ('Operations', 'Sales', 'Contractors/Other'));
