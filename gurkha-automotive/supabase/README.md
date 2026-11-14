# Supabase

This folder contains the SQL migrations for the Gurkha Automotive database.
Run them **in order**, **one file at a time**, against your Supabase project:

| File | Purpose |
| --- | --- |
| `migrations/0001_init.sql` | Creates the `booking_status` enum and the `services`, `business_hours`, `blocked_dates` and `bookings` tables, plus indexes and the `updated_at` trigger. |
| `migrations/0002_rls.sql` | Enables Row Level Security and defines policies (public read for services/hours/blocked dates, admin-only for bookings). |
| `migrations/0003_seed.sql` | Seeds the standing weekly opening hours and a starter list of services. |
| `migrations/0004_services_display_order.sql` | Adds `services.display_order` for admin-controlled ordering. |
| `migrations/0005_site_content.sql` | Adds the admin-editable `site_content` table. |
| `migrations/0006_booking_status_rejected.sql` | Adds the `rejected` booking status. **Run on its own** — Postgres can't use a new enum value in the transaction that adds it. |
| `migrations/0007_ai_booking_assistant.sql` | Booking references, vehicle year / problem description / idempotency columns, a database constraint that makes double bookings impossible, `admin_users` + `is_admin()` (admin RLS now requires a listed admin), and the `booking_events` history table. Non-destructive and re-runnable. |

## Before running 0006/0007 on production

1. Take a backup (Supabase Dashboard → Database → Backups).
2. Ideally run both against a **separate development project** first.
3. Run `0006`, then `0007`, as separate executions.
4. `0007` aborts with a clear message if existing active bookings already
   overlap; the query to list them is at the bottom of the file.
5. `0007` copies every existing Auth user into `admin_users`, so nobody
   loses access. **Review that list afterwards** (query at the bottom of
   the file) and remove anyone who shouldn't be an admin. Consider turning
   off public sign-ups in Supabase → Authentication → Providers → Email.
6. Deploy the matching application code **after** the migrations: the new
   code checks `is_admin()` and fails closed (no admin access) without it.

## Automated checks

`npm test` runs every migration file in this folder against an in-process
Postgres (PGlite) with Supabase's roles and `auth` functions stubbed, and
checks the constraints, RLS policies and history trigger. It never connects
to a real Supabase project.
