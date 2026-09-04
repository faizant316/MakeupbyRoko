-- 0019: A record that an email actually went out.
--
-- system_alerts (0014) records FAILURES. That turned out to be half the answer.
-- When a bride asks "did she get her deposit instructions?", an empty alert log
-- only says "nothing we tried to send was rejected". It cannot distinguish that
-- from "we never tried", which is the case that actually bites: the bridal form
-- fired its confirmation request without awaiting it, so a dropped connection
-- or a closed tab meant no email, no Resend entry, no alert, and a booking in
-- the dashboard that looked flawless.
--
-- So every client-facing send now writes a row here BEFORE anything can go
-- wrong with it, and the row is the answer to "what did this client receive?".
-- Two things update it afterwards:
--
--   1. The send itself, with Resend's message id and sent/failed.
--   2. /api/resend-webhook, with what Resend's servers observed after that:
--      delivered, bounced, complained. "Handed to Resend" is not "landed in her
--      inbox", and a bounce is the one outcome nobody would ever notice.
--
-- Unlike system_alerts, this one IS surfaced in the admin dashboard, on the
-- client card. It is Roko's business whether her bride was emailed, and unlike
-- a Postgres error code it is something she can act on: the panel gives her a
-- resend button.
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- What this email was about. Both nullable and both `on delete set null`:
  -- deleting a booking should not erase the record that we emailed someone, and
  -- an alert or a one-off admin message belongs to neither.
  booking_id uuid references bookings(id) on delete set null,
  registration_id uuid references class_registrations(id) on delete set null,

  -- Which email in the flow, e.g. 'bridal_confirmation', 'booking_confirmed',
  -- 'consultation', 'class_lesson'. Free text on purpose: a new email should
  -- not need a migration to become loggable.
  kind text not null,
  -- 'client' | 'admin'. Roko's own copy is logged too, because "the client
  -- email arrived but mine didn't" is a real and separately confusing failure.
  audience text not null default 'client',

  recipient text not null,
  subject text,

  -- Resend's message id. The join key for the webhook, and what you paste into
  -- the Resend dashboard to see the exact bytes that were sent.
  resend_id text,

  -- queued  → row written, send not yet resolved (only seen mid-flight)
  -- sent    → Resend accepted it
  -- delivered / bounced / complained / delayed → observed by Resend afterwards
  -- failed  → Resend rejected it outright; see `error`
  status text not null default 'queued',
  error text,

  sent_at timestamptz,
  delivered_at timestamptz,
  -- The last webhook event and when, so a status that later changed (delivered
  -- then complained) still reads as a sequence rather than a single verdict.
  last_event text,
  last_event_at timestamptz
);

-- The client card's query: everything sent about one booking, newest first.
create index if not exists email_log_booking_idx
  on email_log (booking_id, created_at desc);
create index if not exists email_log_registration_idx
  on email_log (registration_id, created_at desc);
-- The webhook's lookup, on every event Resend sends.
create index if not exists email_log_resend_idx on email_log (resend_id);
-- "What have we ever sent this person?", across bookings.
create index if not exists email_log_recipient_idx
  on email_log (lower(recipient), created_at desc);

-- Same posture as 0017: the anon key ships in the browser, and this table holds
-- client email addresses and subject lines. Everything that touches it goes
-- through the service role client, which bypasses RLS, so deny-by-default with
-- no policies is exactly right. The admin dashboard reads it through an
-- admin-gated API route, not directly from the browser.
alter table email_log enable row level security;
revoke all on table email_log from anon, authenticated;
