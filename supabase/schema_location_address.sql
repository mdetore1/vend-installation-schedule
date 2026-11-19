-- Street address from the HubSpot deal (address, city, state, zip), shown on
-- the location's Info tab and the Sales queue card. Filled by the HubSpot sync.
alter table queue_items add column if not exists address text;
alter table locations add column if not exists address text;
