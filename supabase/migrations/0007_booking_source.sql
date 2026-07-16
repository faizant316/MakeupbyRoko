-- 0007: Booksy import support.
--
-- 1) `source` marks where a booking came from ('booksy' for CSV imports,
--    null for bookings made through the site). The admin UI shows a small
--    "Booksy" chip on tagged rows so imported clients are distinguishable.
-- 2) Booksy client exports often have a phone number but no email, and we
--    still want those clients imported. Email becomes optional at the DB
--    level; the public booking flow still requires it in the API layer.

alter table bookings add column if not exists source text;

alter table bookings alter column email drop not null;

create index if not exists bookings_source_idx on bookings(source) where source is not null;
