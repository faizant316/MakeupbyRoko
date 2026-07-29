-- 0015: Where the client actually is.
--
-- Roko travels to a large share of her jobs, and until now the site had nowhere
-- to record where to. `bookings` had no address column at all: the non-bridal
-- form asked "do you need Roko to travel to you? yes/no" and then never asked
-- where, and the 2026-07-16 Booksy CSV import had no address field either. The
-- only address anywhere was `bridal_inquiries.event_location`, which covers
-- brides who filled in the site form and nobody else.
--
-- So she could see a confirmed travel booking and have no idea what city it was
-- in without texting the client. These three columns close that.

-- Full address as one displayable line, e.g. "2372 Cabrillo, Hayward, CA 94545".
alter table bookings add column if not exists location text;

-- City on its own. Kept separate rather than parsed back out of `location` at
-- render time so the appointments list can show a city chip cheaply, which is
-- the actual thing she scans for when deciding whether two jobs fit in a day.
alter table bookings add column if not exists location_city text;

-- What Booksy charged for the trip. Arrives with the imported addresses and is
-- worth keeping: it is the only record of what she has historically charged to
-- travel to a given area.
alter table bookings add column if not exists travel_fee numeric;
