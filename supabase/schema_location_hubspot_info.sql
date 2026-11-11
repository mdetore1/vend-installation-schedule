-- HubSpot deal details on a location, so the info from the Sales queue is
-- still there to reference after a deal is added to the calendar (the queue
-- row is deleted on promote). Copied over on promote; the HubSpot sync keeps
-- them current by deal id, and backfills locations promoted before these
-- columns existed. Mirrors the same-named queue_items columns.
alter table locations add column if not exists hubspot_stage text;
alter table locations add column if not exists garage_type text;
alter table locations add column if not exists number_of_parking_spaces integer;
alter table locations add column if not exists property_type text;
alter table locations add column if not exists incumbent_operator text;
alter table locations add column if not exists contract_signed_date date;
alter table locations add column if not exists potential_go_live_date date;
