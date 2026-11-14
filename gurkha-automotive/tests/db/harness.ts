import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

/**
 * Runs the real migration files from supabase/migrations against an
 * in-process Postgres (PGlite), with just enough of Supabase stubbed
 * in to make them behave as they would there:
 *   - the anon / authenticated / service_role roles,
 *   - auth.users, auth.uid() and auth.jwt() (driven by the same
 *     request.jwt.* settings PostgREST sets),
 *   - Supabase's default grants on the public schema.
 *
 * Nothing here talks to a real Supabase project.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));

export const MIGRATION_FILES = [
  "0001_init.sql",
  "0002_rls.sql",
  "0003_seed.sql",
  "0004_services_display_order.sql",
  "0005_site_content.sql",
  "0006_booking_status_rejected.sql",
  "0007_ai_booking_assistant.sql",
] as const;

export type MigrationFile = (typeof MIGRATION_FILES)[number];

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;

  create schema auth;
  create table auth.users (id uuid primary key, email text);

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
  $$;

  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;

  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

export function readMigration(file: MigrationFile): string {
  const sql = readFileSync(MIGRATIONS_DIR + file, "utf8");
  // PGlite has no pgcrypto build. 0001 only enables it for
  // gen_random_uuid(), which is built into Postgres 13+.
  return sql.replace(/create extension if not exists "pgcrypto";/i, "");
}

export async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  return db;
}

export async function applyMigrations(db: PGlite, files: readonly MigrationFile[]): Promise<void> {
  // Each file runs separately, as it would when pasted into the
  // Supabase SQL editor one at a time.
  for (const file of files) {
    await db.exec(readMigration(file));
  }
}

export async function migratedDatabase(): Promise<PGlite> {
  const db = await createDatabase();
  await applyMigrations(db, MIGRATION_FILES);
  return db;
}

type Role = "anon" | "authenticated" | "service_role";

/** Run `fn` as a given Postgres role and (optionally) Supabase user, like a PostgREST request. */
export async function asRole<T>(
  db: PGlite,
  role: Role,
  user: { id: string; email?: string } | null,
  fn: () => Promise<T>
): Promise<T> {
  const claims = JSON.stringify(user ? { sub: user.id, email: user.email, role } : { role });
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user?.id ?? ""]);
  await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
    await db.query("select set_config('request.jwt.claims', '', false)");
  }
}

export async function firstServiceId(db: PGlite): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    "select id from public.services order by name limit 1"
  );
  return rows[0].id;
}

let bookingCounter = 0;

/** Insert a booking as the superuser (i.e. bypassing RLS, like the service role does). */
export async function insertBooking(
  db: PGlite,
  values: {
    serviceId: string;
    date?: string;
    start: string;
    end: string;
    status?: string;
    clientRequestId?: string;
  }
): Promise<{ id: string; reference: string }> {
  bookingCounter += 1;
  const { rows } = await db.query<{ id: string; reference: string }>(
    `insert into public.bookings
       (service_id, customer_name, customer_email, customer_phone, vehicle_rego,
        vehicle_make, vehicle_model, booking_date, start_time, end_time, status, client_request_id)
     values ($1, 'Test Customer', $2, '0412345678', 'ABC123', 'Toyota', 'Corolla', $3, $4, $5, $6::booking_status, $7)
     returning id, reference`,
    [
      values.serviceId,
      `customer${bookingCounter}@example.com`,
      values.date ?? "2030-03-04",
      values.start,
      values.end,
      values.status ?? "pending",
      values.clientRequestId ?? null,
    ]
  );
  return rows[0];
}

/** Insert a booking before migration 0007 exists (no reference column yet). */
export async function insertLegacyBooking(
  db: PGlite,
  serviceId: string,
  start: string,
  end: string,
  status = "pending"
): Promise<void> {
  await db.query(
    `insert into public.bookings
       (service_id, customer_name, customer_email, customer_phone, vehicle_rego,
        vehicle_make, vehicle_model, booking_date, start_time, end_time, status)
     values ($1, 'Legacy Customer', 'legacy@example.com', '0412345678', 'OLD123', 'Mazda', '3', '2030-03-04', $2, $3, $4::booking_status)`,
    [serviceId, start, end, status]
  );
}

export function pgErrorCode(error: unknown): string | undefined {
  return (error as { code?: string } | null)?.code;
}
