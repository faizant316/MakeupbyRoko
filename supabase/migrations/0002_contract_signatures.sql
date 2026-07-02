-- Client-signed service agreement (contract) fields.
-- Every booking captures the signature (typed name), when it was signed, the
-- contract version they agreed to, their explicit photo-posting consent, and a
-- link to the generated PDF copy. Added to all three booking surfaces so the
-- sign step works the same for appointments, bridal, and classes.
-- All columns are nullable/defaulted, so this is safe to run on the live DB
-- without touching existing rows.

-- Appointments
alter table bookings add column if not exists contract_signed boolean default false;
alter table bookings add column if not exists contract_signed_name text;
alter table bookings add column if not exists contract_signed_at timestamptz;
alter table bookings add column if not exists contract_version text;
alter table bookings add column if not exists contract_photo_consent boolean;
alter table bookings add column if not exists contract_pdf_url text;

-- Bridal
alter table bridal_inquiries add column if not exists contract_signed boolean default false;
alter table bridal_inquiries add column if not exists contract_signed_name text;
alter table bridal_inquiries add column if not exists contract_signed_at timestamptz;
alter table bridal_inquiries add column if not exists contract_version text;
alter table bridal_inquiries add column if not exists contract_photo_consent boolean;
alter table bridal_inquiries add column if not exists contract_pdf_url text;

-- Classes
alter table class_registrations add column if not exists contract_signed boolean default false;
alter table class_registrations add column if not exists contract_signed_name text;
alter table class_registrations add column if not exists contract_signed_at timestamptz;
alter table class_registrations add column if not exists contract_version text;
alter table class_registrations add column if not exists contract_photo_consent boolean;
alter table class_registrations add column if not exists contract_pdf_url text;
