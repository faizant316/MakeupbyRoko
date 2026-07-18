-- 0008: Roko's own private notes on a booking.
-- Admin-only free text (allergies, preferences, reminders) shown on the client
-- card and never sent to or seen by the client. Separate from `notes`, which
-- holds what the client submitted (ready-by + their comments).
alter table bookings add column if not exists admin_notes text;
