-- =============================================================
-- Gurkha Automotive — Row Level Security
-- =============================================================
-- Model:
--   * Anyone (anon) can read active services, business hours and
--     blocked dates — needed to render the public booking calendar.
--   * Bookings contain personal customer data, so anon gets NO
--     direct access at all. The public booking form submits through
--     the /api/bookings server route, which uses the service-role
--     key (which bypasses RLS) after validating and rate-limiting
--     the request server-side.
--   * "authenticated" = the garage's admin user(s). Every admin
--     account is trusted with full access to all tables. There is
--     no separate customer login, so authenticated == admin.

alter table public.services enable row level security;
alter table public.business_hours enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.bookings enable row level security;

-- ---------------------------------------------------------------
-- services
-- ---------------------------------------------------------------
drop policy if exists "Public can view active services" on public.services;
create policy "Public can view active services"
  on public.services
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Admins can view all services" on public.services;
create policy "Admins can view all services"
  on public.services
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
  on public.services
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------
-- business_hours
-- ---------------------------------------------------------------
drop policy if exists "Public can view business hours" on public.business_hours;
create policy "Public can view business hours"
  on public.business_hours
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage business hours" on public.business_hours;
create policy "Admins can manage business hours"
  on public.business_hours
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------
-- blocked_dates
-- ---------------------------------------------------------------
drop policy if exists "Public can view blocked dates" on public.blocked_dates;
create policy "Public can view blocked dates"
  on public.blocked_dates
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage blocked dates" on public.blocked_dates;
create policy "Admins can manage blocked dates"
  on public.blocked_dates
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------
-- bookings — no anon policies at all (default deny).
-- Public submissions go through the service-role API route.
-- ---------------------------------------------------------------
drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
  on public.bookings
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admins can delete bookings" on public.bookings;
create policy "Admins can delete bookings"
  on public.bookings
  for delete
  to authenticated
  using (true);

-- Note: there is intentionally no insert policy for anon/authenticated.
-- All inserts happen server-side via the service role key in
-- src/app/api/bookings/route.ts, which also performs slot-conflict
-- checks that RLS alone cannot express.
