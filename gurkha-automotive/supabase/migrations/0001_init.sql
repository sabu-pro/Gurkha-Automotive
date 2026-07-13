-- =============================================================
-- Gurkha Automotive — Initial schema
-- =============================================================
-- Run this in the Supabase SQL Editor, or via `supabase db push`
-- (see README.md for full instructions).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- booking_status enum
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
  end if;
end
$$;

-- ---------------------------------------------------------------
-- services
-- ---------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null default 45 check (duration_minutes > 0),
  price_from_cents integer check (price_from_cents is null or price_from_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.services is 'Services the garage offers, selectable when booking an appointment.';

-- ---------------------------------------------------------------
-- business_hours (one row per day of week, 0 = Sunday .. 6 = Saturday)
-- ---------------------------------------------------------------
create table if not exists public.business_hours (
  id serial primary key,
  day_of_week integer not null unique check (day_of_week between 0 and 6),
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  constraint business_hours_times_check check (
    is_closed = true or (open_time is not null and close_time is not null and open_time < close_time)
  )
);

comment on table public.business_hours is 'Standing weekly opening hours used to compute available booking slots.';

-- ---------------------------------------------------------------
-- blocked_dates (public holidays, staff leave, etc.)
-- ---------------------------------------------------------------
create table if not exists public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  blocked_date date not null unique,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.blocked_dates is 'Specific calendar dates the garage is closed, in addition to the standing weekly hours.';

-- ---------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,

  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text not null check (char_length(customer_phone) between 8 and 20),

  vehicle_rego text not null check (char_length(vehicle_rego) between 2 and 20),
  vehicle_make text not null check (char_length(vehicle_make) between 1 and 60),
  vehicle_model text not null check (char_length(vehicle_model) between 1 and 60),
  notes text check (notes is null or char_length(notes) <= 1000),

  booking_date date not null,
  start_time time not null,
  end_time time not null,

  status booking_status not null default 'pending',
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bookings_time_order_check check (start_time < end_time)
);

comment on table public.bookings is 'Customer appointment bookings.';

create index if not exists bookings_date_idx on public.bookings (booking_date);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_service_idx on public.bookings (service_id);

-- Prevent two active (non-cancelled) bookings from overlapping.
-- Enforced at the application layer for cross-row time-range overlap
-- (Postgres exclusion constraints on time ranges need the btree_gist
-- extension); this index supports the application-level check.
create index if not exists bookings_date_time_idx on public.bookings (booking_date, start_time, end_time)
  where status <> 'cancelled';

-- ---------------------------------------------------------------
-- updated_at trigger for bookings
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
  before update on public.bookings
  for each row
  execute function public.set_updated_at();
