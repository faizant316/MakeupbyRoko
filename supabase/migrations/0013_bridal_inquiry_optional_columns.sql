-- 0013: Stop the bridal_inquiries table rejecting real inquiries.
--
-- Two separate faults were silently throwing away every bridal inquiry, so the
-- admin client card had no wedding details to show even though the inquiry
-- email (built from the in-memory form, never from the saved row) looked
-- complete. Same failure mode as 0001, new columns.
--
-- FAULT 1 — 0006 was never actually run against the live database, so
-- `makeup_ready_by_time` did not exist. Every insert failed 42703/PGRST204 and
-- fell through to the API's retry, which drops that field: the bride's
-- requested ready-by never made it into the inquiry row.
alter table bridal_inquiries add column if not exists makeup_ready_by_time text;

-- FAULT 2 — the table still carried NOT NULL on questions the form stopped
-- asking. `venue_access_time` was removed from the form entirely (so it arrives
-- undefined) and `event_start_time` is trial-only, so a non-trial inquiry hit
-- 23502 and was thrown away, booking and emails going through regardless. These
-- are optional answers now, and the table has to agree.
alter table bridal_inquiries alter column venue_access_time drop not null;
alter table bridal_inquiries alter column event_start_time drop not null;

-- The same trap, disarmed before it fires. Phone/location/date are required by
-- the FORM (which is where a missing answer should be caught and shown to the
-- client), not by the table, where the only outcome is a discarded inquiry.
alter table bridal_inquiries alter column phone drop not null;
alter table bridal_inquiries alter column event_location drop not null;
alter table bridal_inquiries alter column wedding_date drop not null;
