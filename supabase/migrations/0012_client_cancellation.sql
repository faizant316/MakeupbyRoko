-- 0012: Client-initiated cancellation.
--
-- Adds the paper trail for a cancellation started by the client (from the new
-- /cancel-booking page), plus the pieces classes were missing.
--
-- WHO/WHY/WHEN on a booking. `cancelled_by` is 'client' or 'admin', so the admin
-- card can show a "Cancelled by client" banner and the client's own words. The
-- reason rides into the email and is kept here for the record.
alter table bookings add column if not exists cancelled_by text;      -- 'client' | 'admin'
alter table bookings add column if not exists cancelled_at timestamptz;
alter table bookings add column if not exists cancel_reason text;

-- Bridal is a REQUEST, never an instant cancel: these flag a pending request
-- WITHOUT changing status or releasing the date. Roko calls, then cancels by
-- hand. `cancel_requested_at` is cleared when she resolves it.
alter table bookings add column if not exists cancel_requested_at timestamptz;
alter table bookings add column if not exists cancel_request_message text;

-- Classes had no secure per-client link and no 'cancelled' status. Give them the
-- same token bookings use, plus the same cancel paper trail.
alter table class_registrations add column if not exists upload_token text;
alter table class_registrations add column if not exists cancelled_by text;
alter table class_registrations add column if not exists cancelled_at timestamptz;
alter table class_registrations add column if not exists cancel_reason text;

create index if not exists class_registrations_upload_token_idx on class_registrations(upload_token);

-- Backfill a token for every existing class row so admin-built links always work.
update class_registrations
  set upload_token = replace(gen_random_uuid()::text, '-', '')
  where upload_token is null;

-- Re-assert the FULL class status set (from 0004: pending/confirmed are used by
-- checkout + paid confirmation, cancelled by the cancel flow). Kept identical to
-- 0004 so it neither drops a value nor breaks class purchases.
alter table class_registrations drop constraint if exists class_registrations_status_check;
alter table class_registrations add constraint class_registrations_status_check
  check (status in ('new','contacted','enrolled','declined','pending','confirmed','cancelled'));
