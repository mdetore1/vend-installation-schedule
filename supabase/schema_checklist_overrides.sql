-- Per-location edits to a task's instructions, reference links and
-- attachments. NULL means "inherit the shared template's" — a non-null value
-- (including '' or '[]', which mean "deliberately cleared") applies to just
-- this one location. Manage Template keeps editing the shared copy for
-- everyone; a location that has its own version keeps it when the template
-- changes later, until someone resets it back to the template.
alter table checklist_progress add column if not exists instructions_override text;
alter table checklist_progress add column if not exists reference_links_override jsonb;
alter table checklist_progress add column if not exists attachments_override jsonb;
