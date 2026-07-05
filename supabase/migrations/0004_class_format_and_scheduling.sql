-- Online vs in-person classes + client-chosen time slot.
-- Additive and safe to run on the live DB (same pattern as 0002/0003).
-- Also folds in 0003's column with IF NOT EXISTS in case it was never applied.

-- 'online' or 'in_person'. Old rows stay null and render as legacy.
alter table class_registrations add column if not exists class_format text
  check (class_format in ('online','in_person'));

-- The time window the client picked at checkout (e.g. '11:00 AM – 2:00 PM').
alter table class_registrations add column if not exists preferred_time text;

-- From 0003 (client-chosen Wednesday) — no-op if already applied.
alter table class_registrations add column if not exists preferred_date date;

-- What Stripe actually charged, in dollars. Already exists on the live DB for
-- most installs; guarded here so a fresh DB matches production.
alter table class_registrations add column if not exists amount_paid numeric;

-- Relax the legacy check constraints so the values the app writes today are
-- all legal: consultation_type gains 'In-Person' (in-studio lessons), status
-- gains the pending/confirmed lifecycle, payment_status gains 'paid'/'unpaid'.
alter table class_registrations drop constraint if exists class_registrations_consultation_type_check;
alter table class_registrations add constraint class_registrations_consultation_type_check
  check (consultation_type is null or consultation_type in ('Zoom','Phone','In-Person'));

alter table class_registrations drop constraint if exists class_registrations_status_check;
alter table class_registrations add constraint class_registrations_status_check
  check (status in ('new','contacted','enrolled','declined','pending','confirmed','cancelled'));

alter table class_registrations drop constraint if exists class_registrations_payment_status_check;
alter table class_registrations add constraint class_registrations_payment_status_check
  check (payment_status in ('pending','unpaid','deposit_paid','paid','paid_in_full','refunded'));
