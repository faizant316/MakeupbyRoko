-- 0021: Blocked time on Roko's own calendar.
--
-- Booksy has a "time reservation": pick a stretch of a day, type why ("Habibi
-- beats concert", "Botox", "Mars bridal shower"), and the calendar shows that
-- stretch as taken. Roko uses it constantly and asked for the same thing here,
-- from the Add Client panel.
--
-- This is NOT a day off. `blocked_dates` closes a whole day to the public
-- booking forms, and it stays the only thing that does. A time block is a note
-- on her own calendar: the public site sells whole days, not hours, so there is
-- no public time slot for a two hour block to close. Keeping the two tables
-- apart means a dentist appointment can never accidentally shut a Saturday.
--
-- `time` uses the same window string as bookings.time ("2:00 PM – 7:30 PM"),
-- so every calendar that already lays out appointments can lay these out with
-- the same parser. Null means the whole day.
--
-- `source` is 'booksy' for reservations carried over from Booksy, null for
-- ones she makes here.
create table if not exists time_blocks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  date date not null,
  time text,
  reason text not null default '',
  source text
);

create index if not exists time_blocks_date_idx on time_blocks(date);

-- The reasons are personal ("Birthday", "Dentist"), so nothing here is readable
-- with the public anon key. Every read and write goes through the admin-only
-- routes in app/api/time-blocks, which use the service role and check the
-- admin allowlist first. Same shape as 0017: RLS on, no policies, grants gone.
alter table time_blocks enable row level security;
revoke all on table time_blocks from anon, authenticated;
