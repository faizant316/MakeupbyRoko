-- 0018: Evaluate auth.role() once per query instead of once per row.
--
-- Every policy written in schema.sql calls auth.role() bare. Postgres treats
-- that as a per-row expression, so a select over 600 clients calls it 600
-- times; wrapping it in a scalar subquery makes the planner hoist it into an
-- InitPlan and run it once. This is the whole of Supabase's `auth_rls_initplan`
-- advisor warning, and it accounted for 22 of the 24 it was raising.
--
-- The semantics do not change: (select auth.role()) returns exactly what
-- auth.role() returns, and the site reads through the service role anyway,
-- which bypasses RLS entirely. This is cost, not behaviour.
--
-- ALTER POLICY rather than drop-and-recreate on purpose. Each statement swaps
-- the expression in place, so there is never an instant where a live table sits
-- unprotected between a DROP and a CREATE.

-- ---- services ----
alter policy "services_auth_insert" on services with check ((select auth.role()) = 'authenticated');
alter policy "services_auth_update" on services using ((select auth.role()) = 'authenticated');
alter policy "services_auth_delete" on services using ((select auth.role()) = 'authenticated');

-- ---- reviews ----
alter policy "reviews_public_read" on reviews
  using (status = 'approved' or (select auth.role()) = 'authenticated');
alter policy "reviews_auth_update" on reviews using ((select auth.role()) = 'authenticated');
alter policy "reviews_auth_delete" on reviews using ((select auth.role()) = 'authenticated');

-- ---- day_capacities ----
alter policy "day_capacities_auth_insert" on day_capacities with check ((select auth.role()) = 'authenticated');
alter policy "day_capacities_auth_update" on day_capacities using ((select auth.role()) = 'authenticated');
alter policy "day_capacities_auth_delete" on day_capacities using ((select auth.role()) = 'authenticated');

-- ---- blocked_dates ----
alter policy "blocked_dates_auth_insert" on blocked_dates with check ((select auth.role()) = 'authenticated');
alter policy "blocked_dates_auth_delete" on blocked_dates using ((select auth.role()) = 'authenticated');

-- ---- app_settings ----
alter policy "app_settings_auth_upsert" on app_settings with check ((select auth.role()) = 'authenticated');
alter policy "app_settings_auth_update" on app_settings using ((select auth.role()) = 'authenticated');

-- ---- bookings ----
alter policy "bookings_auth_select" on bookings using ((select auth.role()) = 'authenticated');
alter policy "bookings_auth_update" on bookings using ((select auth.role()) = 'authenticated');
alter policy "bookings_auth_delete" on bookings using ((select auth.role()) = 'authenticated');

-- ---- bridal_inquiries ----
alter policy "bridal_auth_select" on bridal_inquiries using ((select auth.role()) = 'authenticated');
alter policy "bridal_auth_update" on bridal_inquiries using ((select auth.role()) = 'authenticated');
alter policy "bridal_auth_delete" on bridal_inquiries using ((select auth.role()) = 'authenticated');

-- ---- class_registrations ----
alter policy "class_reg_auth_select" on class_registrations using ((select auth.role()) = 'authenticated');
alter policy "class_reg_auth_update" on class_registrations using ((select auth.role()) = 'authenticated');
alter policy "class_reg_auth_delete" on class_registrations using ((select auth.role()) = 'authenticated');
