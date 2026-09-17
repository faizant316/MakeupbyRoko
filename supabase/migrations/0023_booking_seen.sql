-- 0022: Has Roko opened this booking yet?
--
-- The Recent bookings rail said "booked 6m ago" in small grey type and nothing
-- else, on a white page, so a booking could land while she had the admin open
-- and sit there unnoticed. The rail needs to know which bookings she has not
-- looked at, and only the database can know that across her phone and laptop.
--
-- Same shape as deposit_seen_at (0010): opening the client card stamps it, and
-- the rail treats a live booking with no stamp as new. That is an
-- acknowledgment, not a timer, so it never fires on every booking for a day
-- and it never expires on its own while she is away from the admin for a week.
--
-- Bookings she enters herself through Add Client are stamped at insert by
-- /api/bookings, because nobody needs telling about their own typing.

alter table bookings add column if not exists admin_seen_at timestamptz;

-- Backfill, so deploy day is not a wall of "new" on bookings she handled weeks
-- ago. Everything is stamped except a pending booking from the last day, which
-- she genuinely may not have opened. Anything she already confirmed, completed
-- or cancelled she has obviously seen, and Booksy imports were never news.
update bookings
set admin_seen_at = created_at
where admin_seen_at is null
  and (
    created_at < now() - interval '1 day'
    or coalesce(status, 'pending') <> 'pending'
    or source = 'booksy'
  );
