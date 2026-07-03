-- Client-chosen class date (the Wednesday they picked at checkout).
-- Kept separate from appointment_date, which stays the admin-confirmed lesson
-- date/time. Additive, nullable, and safe to run on the live DB without
-- touching existing rows (same pattern as 0002).

alter table class_registrations add column if not exists preferred_date date;
