-- Add columns the bridal inquiry form/API write but that were missing from the
-- bridal_inquiries table. Without these, every inquiry insert failed with
-- Postgres error 42703 ("column does not exist"), so no inquiry record was ever
-- saved and the admin booking page had no bridal details to show. The form did
-- not check the insert response, so the failure was silent (the booking and
-- emails still went through).
alter table bridal_inquiries add column if not exists ready_by_time text;
alter table bridal_inquiries add column if not exists photographer_arrival_time text;
alter table bridal_inquiries add column if not exists out_of_state boolean;
alter table bridal_inquiries add column if not exists service text;
