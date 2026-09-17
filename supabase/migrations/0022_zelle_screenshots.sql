-- 0022: More than one Zelle screenshot per deposit.
--
-- A deposit does not always arrive as one payment. Banks cap how much a client
-- can send on Zelle in a day, so a $850 bridal deposit is often two transfers
-- and two confirmation screens. The upload page only kept one, and a second
-- upload replaced the first, so Roko could only ever see half the proof.
--
-- `zelle_screenshots` holds every storage path, in the order they were sent.
-- `zelle_screenshot` stays and keeps pointing at the first one, because the
-- admin reads it everywhere as "has she sent proof yet", and none of those
-- checks need to know how many there are.

alter table bookings add column if not exists zelle_screenshots text[];
alter table bridal_inquiries add column if not exists zelle_screenshots text[];

-- Existing single uploads become a one-item list, so the admin can read the
-- list alone without falling back to the old column.
update bookings
   set zelle_screenshots = array[zelle_screenshot]
 where zelle_screenshot is not null and zelle_screenshots is null;

update bridal_inquiries
   set zelle_screenshots = array[zelle_screenshot]
 where zelle_screenshot is not null and zelle_screenshots is null;
