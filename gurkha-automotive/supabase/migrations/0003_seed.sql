-- =============================================================
-- Gurkha Automotive — Seed data
-- =============================================================
-- Default services and standing weekly opening hours matching the
-- hours supplied by the business. Replace/extend the services list
-- from the admin dashboard once real pricing is confirmed.

insert into public.business_hours (day_of_week, open_time, close_time, is_closed)
values
  (0, null, null, true),        -- Sunday: closed
  (1, '09:00', '17:00', false), -- Monday
  (2, '09:00', '17:00', false), -- Tuesday
  (3, '09:00', '17:00', false), -- Wednesday
  (4, '09:00', '17:00', false), -- Thursday
  (5, '09:00', '17:00', false), -- Friday
  (6, '09:00', '15:00', false)  -- Saturday
on conflict (day_of_week) do update
set open_time = excluded.open_time,
    close_time = excluded.close_time,
    is_closed = excluded.is_closed;

insert into public.services (name, description, duration_minutes, price_from_cents, is_active)
values
  ('General Service', 'Full logbook-style service covering fluids, filters, brakes and safety checks.', 60, null, true),
  ('Vehicle Inspection', 'Comprehensive roadworthy / pre-purchase style inspection with a written summary.', 45, null, true),
  ('Brake Inspection & Repair', 'Brake pad, rotor and fluid inspection with repairs as needed.', 60, null, true),
  ('Tyre Fitting & Rotation', 'Tyre fitting, balancing and rotation.', 45, null, true),
  ('Battery Test & Replacement', 'Battery health check and replacement if required.', 30, null, true),
  ('Diagnostic Check', 'Computer diagnostic scan to identify warning lights and faults.', 45, null, true)
on conflict do nothing;

-- Pricing intentionally left as "Quote on inspection" (null) — set real
-- prices from the admin dashboard or directly in Supabase once confirmed.
