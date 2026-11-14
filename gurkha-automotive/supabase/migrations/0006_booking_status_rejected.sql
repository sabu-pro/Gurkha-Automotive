-- =============================================================
-- Gurkha Automotive — "rejected" booking status
-- =============================================================
-- Staff can now decline a booking request (e.g. the job isn't
-- something the workshop does, or the customer asked for a time that
-- can't be offered). That is different from "cancelled", which means
-- an accepted appointment was later called off.
--
-- This lives in its own migration on purpose: Postgres cannot USE a
-- new enum value inside the same transaction that adds it, and the
-- Supabase SQL editor runs a pasted script as one transaction. Run
-- this file, then run 0007_ai_booking_assistant.sql separately.
--
-- Non-destructive: adding an enum value never touches existing rows.

alter type public.booking_status add value if not exists 'rejected';
