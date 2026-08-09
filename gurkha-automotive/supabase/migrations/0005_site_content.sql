-- =============================================================
-- Gurkha Automotive — Editable page content
-- =============================================================
-- Holds admin-editable overrides for the wording on the public
-- pages, keyed by (section, field) — e.g. ('home', 'hero_heading').
--
-- Deliberately an OVERRIDE table, not a full copy of the site copy:
-- the canonical wording lives in src/lib/content-defaults.ts, and a
-- row here only exists once an admin has changed that field. A
-- missing row, a null, or a whitespace-only value all fall back to
-- the code default, so a section can never render blank.

create table if not exists public.site_content (
  id uuid primary key default gen_random_uuid(),
  section text not null check (char_length(section) between 1 and 60),
  field text not null check (char_length(field) between 1 and 60),
  value text,
  updated_at timestamptz not null default now(),
  constraint site_content_section_field_key unique (section, field)
);

comment on table public.site_content is
  'Admin-editable text overrides for the public site. Falls back to src/lib/content-defaults.ts when a field is absent or blank.';

create index if not exists site_content_section_idx on public.site_content (section);

-- Reuse the shared trigger function defined in 0001_init.sql.
drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Row Level Security — same model as public.services in 0002_rls.sql:
-- anyone may read the copy that renders on the public site, only a
-- signed-in admin may change it. There is intentionally NO insert,
-- update or delete policy for anon, so the anon key (which ships in
-- the browser bundle by design) cannot write here at all.
-- ---------------------------------------------------------------
alter table public.site_content enable row level security;

drop policy if exists "Public can view site content" on public.site_content;
create policy "Public can view site content"
  on public.site_content
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can manage site content" on public.site_content;
create policy "Admins can manage site content"
  on public.site_content
  for all
  to authenticated
  using (true)
  with check (true);
