-- Re-signed service agreements: the waiting phase and the paper trail.
--
-- Before this, a re-sign silently overwrote contract_signed_name/at, so the
-- original signature vanished and there was no way to tell "she sent a new
-- agreement and the client hasn't signed yet" from "signed, all good".
--
--   contract_resign_requested_at   when Roko emailed a Review & Sign link
--   contract_resign_requested_for  the appointment window it was sent for
--   contract_signed_for            the window the CURRENT signature covers
--   contract_signature_history     every superseded signature, oldest first
--
-- Pending is derived, not stored: requested_at newer than signed_at means the
-- client still owes a signature. That way it self-corrects even if a write is
-- missed, and it survives a second re-sign request.
--
-- All columns are nullable/defaulted, so this is safe to run on the live DB
-- without touching existing rows.

alter table bookings add column if not exists contract_resign_requested_at timestamptz;
alter table bookings add column if not exists contract_resign_requested_for text;
alter table bookings add column if not exists contract_signed_for text;
alter table bookings add column if not exists contract_signature_history jsonb default '[]'::jsonb;
