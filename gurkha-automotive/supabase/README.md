# Supabase

This folder contains the SQL migrations for the Gurkha Automotive database.
Run them **in order** against your Supabase project:

| File | Purpose |
| --- | --- |
| `migrations/0001_init.sql` | Creates the `booking_status` enum and the `services`, `business_hours`, `blocked_dates` and `bookings` tables, plus indexes and the `updated_at` trigger. |
| `migrations/0002_rls.sql` | Enables Row Level Security and defines policies (public read for services/hours/blocked dates, admin-only for bookings). |
| `migrations/0003_seed.sql` | Seeds the standing weekly opening hours and a starter list of services. |

See the root `README.md` for step-by-step instructions on running these
against a real Supabase project (SQL Editor or the Supabase CLI).
