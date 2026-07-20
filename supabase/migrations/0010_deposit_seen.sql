-- 0010: drop the confirm step, keep the alert
--
-- 0009 split "client sent proof" from "Roko confirmed it" so a late deposit
-- would stop flipping a hidden flag. That worked, but the confirm tap turned
-- out to be busywork: her bank already tells her the money landed, so the
-- screenshot is a courtesy heads-up, not evidence. Confirming was re-entering
-- something she already knew.
--
-- The tap was quietly doing a second job though. It was how the alert knew it
-- had been seen. Remove it with nothing in its place and the bar either sits
-- forever or expires on a timer, and a timer means a week away from the admin
-- loses the notification entirely.
--
-- So: uploads mark the deposit received again (automatic, no tap), and
-- deposit_seen_at takes over the acknowledgment. Opening the client card sets
-- it. The alert is "proof arrived and she hasn't looked since", compared by
-- timestamp rather than presence, so a card she happened to open last Monday
-- doesn't swallow a deposit that landed Wednesday.

alter table bookings add column if not exists deposit_seen_at timestamptz;

-- Left deliberately unbackfilled. Any row already carrying an upload time will
-- surface once, which is correct: nobody has actually seen those under the new
-- model. Rows from before 0009 have no zelle_uploaded_at and never alert, so
-- there's no flood of old deposits on deploy.
