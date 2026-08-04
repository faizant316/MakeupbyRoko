-- 0017: Close the two internal tables to the public API key.
--
-- Supabase's security advisor raised these as errors: `system_alerts` (0014)
-- and `applied_migrations` (created by scripts/db-push.mjs) both live in the
-- `public` schema, which PostgREST exposes, and neither had row level security
-- on. The anon key ships in the browser on every page load, so anyone who
-- opened dev tools could have read, edited, or deleted either one. The alert
-- log is the record of what has broken and when; the migration ledger is the
-- only thing that knows which migrations have run, and a deleted row there
-- means a replay of migrations that were never meant to run twice.
--
-- Neither table is ever read through the anon key. Everything that touches
-- them goes through the service role client in src/lib/supabase/server.js
-- (raiseAlert, /api/health) or the Management API as `postgres` (db-push), and
-- both of those bypass RLS. So the fix is RLS on with NO policies at all:
-- deny-by-default for anon and authenticated, unchanged for everything the
-- site actually uses. Policies get added the day something legitimately needs
-- to read these from the browser, which is not today.
alter table applied_migrations enable row level security;
alter table system_alerts enable row level security;

-- Belt and braces. RLS alone is enough, but revoking the grants means these two
-- stop appearing in the PostgREST schema at all rather than answering with an
-- empty array, and it states the intent plainly for whoever reads this next:
-- these are the site's own bookkeeping, not client data with rules attached.
revoke all on table applied_migrations from anon, authenticated;
revoke all on table system_alerts from anon, authenticated;
