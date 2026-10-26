-- ARR / deal amount on a location, so it stays visible on the calendar after
-- a deal leaves the Sales queue. The HubSpot sync keeps it up to date by deal id.
alter table locations add column if not exists deal_amount numeric;
