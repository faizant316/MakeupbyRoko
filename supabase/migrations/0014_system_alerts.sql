-- 0014: Somewhere for a failure to land.
--
-- The bridal inquiry bug survived six days for one reason: when the insert was
-- rejected, nothing anywhere recorded that it had happened. The client saw a
-- normal confirmation, both emails rendered from the in-memory form, the
-- booking saved in its own request, and the only trace was a console.error in a
-- serverless log nobody reads. A silent failure is worse than a loud outage,
-- because an outage gets fixed the same hour.
--
-- So every write path that can lose client data now writes a row here when it
-- fails, and emails whoever maintains the site. The email is the alarm; this
-- table is the record, for answering "how long has this been broken?" and "how
-- many clients did it touch?" after the fact. Nothing surfaces it in the admin
-- dashboard on purpose: Roko is the other admin and this is not her problem to
-- read. The table is deliberately generic, so any future check that discovers
-- something wrong should raise an alert rather than invent its own reporting.
create table if not exists system_alerts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Where it came from, e.g. 'api/bridal-inquiries'.
  source text not null,
  -- What kind of thing broke, e.g. 'insert_failed'. Combined with `source` this
  -- is the throttle key, so repeated identical failures email once, not fifty
  -- times, while still recording every occurrence.
  kind text not null,
  severity text not null default 'error',
  message text not null,
  -- Whatever helps diagnose it: the Postgres code, the table, the payload KEYS
  -- (never the values, so client PII stays out of the alert log).
  context jsonb,
  -- Reserved for marking one handled. Nothing writes it today (alerts are dealt
  -- with by fixing the cause, not by clicking anything), kept so the history can
  -- be annotated later without another migration.
  resolved_at timestamptz,
  -- Set when the alert email went out, so the throttle is a fact rather than a
  -- guess about what was sent.
  notified_at timestamptz
);

create index if not exists system_alerts_open_idx
  on system_alerts (created_at desc) where resolved_at is null;
create index if not exists system_alerts_throttle_idx
  on system_alerts (source, kind, created_at desc);
