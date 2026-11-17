-- Hardware details from the HubSpot deal, on both queue items and locations
-- (copied over on promote, kept current by the HubSpot sync).
-- Entry lanes already live in the existing `lanes` column.
--   kiosks                  <- "# of Kiosks" (free text in HubSpot)
--   gates                   <- "Gates (#)"
--   gates_keep_new          <- "Gates (keep / new)": Keep / New / Mix
--   exit_lanes              <- "# of Exit Lanes"
--   monthly_parking_billing <- "Monthly Parking Billing": Yes / No
--   lpr                     <- "LPR" (cameras): Yes / No / I don't know
alter table queue_items add column if not exists kiosks text;
alter table queue_items add column if not exists gates integer;
alter table queue_items add column if not exists gates_keep_new text;
alter table queue_items add column if not exists exit_lanes integer;
alter table queue_items add column if not exists monthly_parking_billing text;
alter table queue_items add column if not exists lpr text;

alter table locations add column if not exists kiosks text;
alter table locations add column if not exists gates integer;
alter table locations add column if not exists gates_keep_new text;
alter table locations add column if not exists exit_lanes integer;
alter table locations add column if not exists monthly_parking_billing text;
alter table locations add column if not exists lpr text;
