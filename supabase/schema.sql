-- ============================================================
-- Makeup by Roko — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ============================================================
-- BOOKINGS
-- ============================================================
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  name text not null,
  email text, -- optional since 0007: Booksy imports may only have a phone
  phone text,
  service text not null,
  date date,
  time text,
  notes text,
  status text default 'pending' check (status in ('pending','confirmed','completed','cancelled')),
  deposit_received boolean default false,
  deposit_reminder_sent boolean default false,
  appointment_reminder_sent boolean default false,
  feedback_request_sent boolean default false,
  zelle_screenshot text,
  upload_token text,
  reference_photos text[],
  source text -- 'booksy' for CSV-imported clients, null for site bookings
);

create index if not exists bookings_created_at_idx on bookings(created_at desc);
create index if not exists bookings_date_idx on bookings(date);
create index if not exists bookings_upload_token_idx on bookings(upload_token);

-- ============================================================
-- BRIDAL INQUIRIES
-- ============================================================
create table if not exists bridal_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  bride_name text not null,
  soon_to_be_last_name text,
  email text not null,
  phone text not null,
  instagram_handle text,
  wedding_date text not null,
  event_location text not null,
  event_start_time text not null,
  photographer text,
  hairstylist text,
  venue_access_time text not null,
  num_people_glam text,
  additional_details text,
  how_heard text,
  ready_by_time text,
  makeup_ready_by_time text,
  photographer_arrival_time text,
  out_of_state boolean,
  service text,
  preferred_date text,
  preferred_time text,
  status text default 'new' check (status in ('new','contacted','booked','declined')),
  zelle_screenshot text,
  upload_token text,
  zelle_received boolean default false
);

create index if not exists bridal_inquiries_upload_token_idx on bridal_inquiries(upload_token);

-- ============================================================
-- SERVICES
-- ============================================================
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  title text not null,
  category text not null check (category in ('bridal','event','creative','lessons')),
  price text not null,
  price_value numeric,
  duration text not null,
  deposit text,
  description text,
  includes text[],
  key_features text[],
  what_to_expect text,
  before_after_photos text[],
  photo text,
  is_active boolean default true,
  sort_order integer default 0
);

create index if not exists services_sort_order_idx on services(sort_order asc);

-- ============================================================
-- REVIEWS
-- ============================================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  name text not null,
  service text,
  message text not null,
  rating integer not null check (rating between 1 and 5),
  status text default 'pending' check (status in ('pending','approved'))
);

-- ============================================================
-- CLASS REGISTRATIONS
-- ============================================================
create table if not exists class_registrations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now() not null,
  full_name text not null,
  email text not null,
  phone text not null,
  private_basic_lesson boolean default false,
  virtual_lesson boolean default false,
  intermediate_lesson boolean default false,
  glam_class boolean default false,
  masterclass boolean default false,
  additional_notes text,
  status text default 'new' check (status in ('new','contacted','enrolled','declined')),
  payment_status text default 'pending' check (payment_status in ('pending','deposit_paid','paid_in_full','refunded')),
  stripe_session_id text,
  appointment_date date,
  appointment_time text,
  consultation_type text check (consultation_type in ('Zoom', 'Phone')),
  lesson_notes text
);

-- ============================================================
-- DAY CAPACITIES
-- ============================================================
create table if not exists day_capacities (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  capacity integer not null
);

-- ============================================================
-- BLOCKED DATES
-- ============================================================
create table if not exists blocked_dates (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  reason text
);

-- ============================================================
-- APP SETTINGS
-- ============================================================
create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value text
);

-- Seed default max bookings per day
insert into app_settings (key, value) values ('max_bookings_per_day', '3')
  on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table bookings enable row level security;
alter table bridal_inquiries enable row level security;
alter table services enable row level security;
alter table reviews enable row level security;
alter table class_registrations enable row level security;
alter table day_capacities enable row level security;
alter table blocked_dates enable row level security;
alter table app_settings enable row level security;

-- ---- services: public read (active only), authenticated write ----
create policy "services_public_read" on services for select using (true);
create policy "services_auth_insert" on services for insert with check (auth.role() = 'authenticated');
create policy "services_auth_update" on services for update using (auth.role() = 'authenticated');
create policy "services_auth_delete" on services for delete using (auth.role() = 'authenticated');

-- ---- reviews: public read (approved), public insert, authenticated manage ----
create policy "reviews_public_read" on reviews for select using (status = 'approved' or auth.role() = 'authenticated');
create policy "reviews_public_insert" on reviews for insert with check (true);
create policy "reviews_auth_update" on reviews for update using (auth.role() = 'authenticated');
create policy "reviews_auth_delete" on reviews for delete using (auth.role() = 'authenticated');

-- ---- day_capacities: public read, authenticated write ----
create policy "day_capacities_public_read" on day_capacities for select using (true);
create policy "day_capacities_auth_insert" on day_capacities for insert with check (auth.role() = 'authenticated');
create policy "day_capacities_auth_update" on day_capacities for update using (auth.role() = 'authenticated');
create policy "day_capacities_auth_delete" on day_capacities for delete using (auth.role() = 'authenticated');

-- ---- blocked_dates: public read, authenticated write ----
create policy "blocked_dates_public_read" on blocked_dates for select using (true);
create policy "blocked_dates_auth_insert" on blocked_dates for insert with check (auth.role() = 'authenticated');
create policy "blocked_dates_auth_delete" on blocked_dates for delete using (auth.role() = 'authenticated');

-- ---- app_settings: public read, authenticated write ----
create policy "app_settings_public_read" on app_settings for select using (true);
create policy "app_settings_auth_upsert" on app_settings for insert with check (auth.role() = 'authenticated');
create policy "app_settings_auth_update" on app_settings for update using (auth.role() = 'authenticated');

-- ---- bookings: public insert, authenticated read/update/delete ----
create policy "bookings_public_insert" on bookings for insert with check (true);
create policy "bookings_auth_select" on bookings for select using (auth.role() = 'authenticated');
create policy "bookings_auth_update" on bookings for update using (auth.role() = 'authenticated');
create policy "bookings_auth_delete" on bookings for delete using (auth.role() = 'authenticated');

-- ---- bridal_inquiries: public insert, authenticated read/update/delete ----
create policy "bridal_public_insert" on bridal_inquiries for insert with check (true);
create policy "bridal_auth_select" on bridal_inquiries for select using (auth.role() = 'authenticated');
create policy "bridal_auth_update" on bridal_inquiries for update using (auth.role() = 'authenticated');
create policy "bridal_auth_delete" on bridal_inquiries for delete using (auth.role() = 'authenticated');

-- ---- class_registrations: public insert, authenticated read/manage ----
create policy "class_reg_public_insert" on class_registrations for insert with check (true);
create policy "class_reg_auth_select" on class_registrations for select using (auth.role() = 'authenticated');
create policy "class_reg_auth_update" on class_registrations for update using (auth.role() = 'authenticated');
create policy "class_reg_auth_delete" on class_registrations for delete using (auth.role() = 'authenticated');

-- ============================================================
-- STORAGE BUCKETS
-- Run this separately if you haven't created them yet:
-- insert into storage.buckets (id, name, public) values ('zelle-screenshots', 'zelle-screenshots', true);
-- insert into storage.buckets (id, name, public) values ('reference-photos', 'reference-photos', true);
-- ============================================================
