-- =============================================================
-- Gurkha Automotive — Service ordering
-- =============================================================
-- Adds an explicit display_order so the garage can arrange services
-- from the admin dashboard instead of being stuck with alphabetical
-- order. Existing rows are backfilled in their current alphabetical
-- order so nothing visibly moves on the public site when this runs.
--
-- No RLS changes are needed: the policies in 0002_rls.sql are
-- table-wide ("for all to authenticated"), so they already cover
-- this new column.

alter table public.services
  add column if not exists display_order integer not null default 0;

comment on column public.services.display_order is
  'Sort position on the public site (ascending). Managed from the admin dashboard.';

-- Backfill: preserve the existing alphabetical ordering, spaced in
-- tens so a service can later be slotted between two others without
-- renumbering the whole table.
with ordered as (
  select id, row_number() over (order by name) * 10 as new_order
  from public.services
)
update public.services as s
set display_order = ordered.new_order
from ordered
where s.id = ordered.id
  and s.display_order = 0;

-- Supports the public query in src/lib/data.ts:
--   .eq("is_active", true).order("display_order").order("name")
create index if not exists services_active_order_idx
  on public.services (is_active, display_order);
