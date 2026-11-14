import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import {
  MIGRATION_FILES,
  applyMigrations,
  asRole,
  createDatabase,
  firstServiceId,
  insertBooking,
  insertLegacyBooking,
  migratedDatabase,
  pgErrorCode,
  readMigration,
} from "./harness";

const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "owner@gurkha.test" };
const NOT_ADMIN = { id: "22222222-2222-4222-8222-222222222222", email: "stranger@evil.test" };

async function expectPgError(promise: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught, `expected Postgres error ${code}`).toBeDefined();
  expect(pgErrorCode(caught)).toBe(code);
}

describe("migration 0007 on a database that already has data", () => {
  let db: PGlite;

  beforeEach(async () => {
    db = await createDatabase();
    // Existing production state: migrations 0001–0005, an existing admin
    // account and some bookings that predate the new columns.
    await applyMigrations(db, MIGRATION_FILES.slice(0, 5));
    await db.query("insert into auth.users (id, email) values ($1, $2)", [ADMIN.id, ADMIN.email]);
    const serviceId = await firstServiceId(db);
    await insertLegacyBooking(db, serviceId, "09:00", "10:00");
    await insertLegacyBooking(db, serviceId, "10:00", "11:00", "confirmed");
    await insertLegacyBooking(db, serviceId, "09:30", "10:30", "cancelled"); // overlaps, but cancelled
  });

  afterEach(async () => {
    await db.close();
  });

  it("applies cleanly and backfills a unique reference for every existing booking", async () => {
    await applyMigrations(db, ["0006_booking_status_rejected.sql", "0007_ai_booking_assistant.sql"]);

    const { rows } = await db.query<{ reference: string; source: string }>(
      "select reference, source from public.bookings"
    );
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.reference).toMatch(/^GA-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      expect(row.source).toBe("web_form");
    }
    expect(new Set(rows.map((r) => r.reference)).size).toBe(3);
  });

  it("keeps existing admin accounts working by copying them into admin_users", async () => {
    await applyMigrations(db, ["0006_booking_status_rejected.sql", "0007_ai_booking_assistant.sql"]);

    const { rows } = await db.query<{ user_id: string }>("select user_id from public.admin_users");
    expect(rows.map((r) => r.user_id)).toEqual([ADMIN.id]);

    const visible = await asRole(db, "authenticated", ADMIN, () =>
      db.query("select id from public.bookings")
    );
    expect(visible.rows).toHaveLength(3);
  });

  it("is safe to run twice", async () => {
    await applyMigrations(db, ["0006_booking_status_rejected.sql", "0007_ai_booking_assistant.sql"]);
    await applyMigrations(db, ["0006_booking_status_rejected.sql", "0007_ai_booking_assistant.sql"]);
    const { rows } = await db.query("select id from public.bookings");
    expect(rows).toHaveLength(3);
  });

  it("refuses to run, without changing anything, if active bookings already overlap", async () => {
    const serviceId = await firstServiceId(db);
    await insertLegacyBooking(db, serviceId, "09:15", "09:45"); // overlaps the 09:00 pending booking
    await applyMigrations(db, ["0006_booking_status_rejected.sql"]);

    await expect(db.exec(readMigration("0007_ai_booking_assistant.sql"))).rejects.toThrow(
      /overlapping active bookings/
    );

    const { rows } = await db.query<{ column_name: string }>(
      "select column_name from information_schema.columns where table_name = 'bookings' and column_name = 'reference'"
    );
    expect(rows).toHaveLength(0);
  });
});

describe("double-booking protection", () => {
  let db: PGlite;
  let serviceId: string;

  beforeEach(async () => {
    db = await migratedDatabase();
    serviceId = await firstServiceId(db);
    await insertBooking(db, { serviceId, start: "10:00", end: "11:00" });
  });

  afterEach(async () => {
    await db.close();
  });

  it("rejects an overlapping active booking at the database level", async () => {
    await expectPgError(insertBooking(db, { serviceId, start: "10:30", end: "11:15" }), "23P01");
    await expectPgError(insertBooking(db, { serviceId, start: "09:30", end: "10:15" }), "23P01");
    await expectPgError(insertBooking(db, { serviceId, start: "10:00", end: "11:00", status: "confirmed" }), "23P01");
  });

  it("allows back-to-back bookings and the same time on another day", async () => {
    await insertBooking(db, { serviceId, start: "11:00", end: "12:00" });
    await insertBooking(db, { serviceId, start: "09:00", end: "10:00" });
    await insertBooking(db, { serviceId, date: "2030-03-05", start: "10:00", end: "11:00" });
  });

  it("lets cancelled and rejected bookings release their slot", async () => {
    await insertBooking(db, { serviceId, start: "10:00", end: "11:00", status: "cancelled" });
    await insertBooking(db, { serviceId, start: "10:00", end: "11:00", status: "rejected" });
  });

  it("blocks re-activating a rejected booking into a slot someone else now holds", async () => {
    const rejected = await insertBooking(db, { serviceId, start: "10:00", end: "11:00", status: "rejected" });
    await expectPgError(
      db.query("update public.bookings set status = 'pending' where id = $1", [rejected.id]),
      "23P01"
    );
  });

  it("blocks rescheduling into an occupied slot", async () => {
    const other = await insertBooking(db, { serviceId, start: "14:00", end: "15:00" });
    await expectPgError(
      db.query("update public.bookings set start_time = '10:30', end_time = '11:30' where id = $1", [other.id]),
      "23P01"
    );
  });

  it("stops the old check-then-insert race: two requests that both passed the availability check", async () => {
    // Both requests read the day's bookings before either inserts, so
    // the application-level check sees a free 13:00 slot for both.
    const { rows: seenByFirst } = await db.query(
      "select 1 from public.bookings where booking_date = '2030-03-04' and start_time < '14:00' and end_time > '13:00'"
    );
    const { rows: seenBySecond } = await db.query(
      "select 1 from public.bookings where booking_date = '2030-03-04' and start_time < '14:00' and end_time > '13:00'"
    );
    expect(seenByFirst).toHaveLength(0);
    expect(seenBySecond).toHaveLength(0);

    await insertBooking(db, { serviceId, start: "13:00", end: "14:00" });
    await expectPgError(insertBooking(db, { serviceId, start: "13:00", end: "14:00" }), "23P01");
  });

  it("treats a repeated client_request_id as a duplicate submission", async () => {
    const requestId = "33333333-3333-4333-8333-333333333333";
    await insertBooking(db, { serviceId, start: "15:00", end: "16:00", clientRequestId: requestId });
    await expectPgError(
      insertBooking(db, { serviceId, date: "2030-03-06", start: "15:00", end: "16:00", clientRequestId: requestId }),
      "23505"
    );
  });
});

describe("row level security", () => {
  let db: PGlite;
  let bookingId: string;

  beforeEach(async () => {
    db = await createDatabase();
    await db.query("insert into auth.users (id, email) values ($1, $2)", [ADMIN.id, ADMIN.email]);
    await applyMigrations(db, MIGRATION_FILES);
    // A sign-up that happens after the migration is NOT an admin.
    await db.query("insert into auth.users (id, email) values ($1, $2)", [NOT_ADMIN.id, NOT_ADMIN.email]);
    const serviceId = await firstServiceId(db);
    bookingId = (await insertBooking(db, { serviceId, start: "10:00", end: "11:00" })).id;
  });

  afterEach(async () => {
    await db.close();
  });

  it("gives anonymous visitors no access to bookings, history or the admin list", async () => {
    await asRole(db, "anon", null, async () => {
      expect((await db.query("select * from public.bookings")).rows).toHaveLength(0);
      expect((await db.query("select * from public.booking_events")).rows).toHaveLength(0);
      expect((await db.query("select * from public.admin_users")).rows).toHaveLength(0);
      const { rows } = await db.query<{ is_admin: boolean }>("select public.is_admin() as is_admin");
      expect(rows[0].is_admin).toBe(false);
    });
  });

  it("does not let anonymous visitors insert bookings directly", async () => {
    const serviceId = await firstServiceId(db);
    await asRole(db, "anon", null, async () => {
      await expectPgError(
        db.query(
          `insert into public.bookings (service_id, customer_name, customer_email, customer_phone, vehicle_rego,
             vehicle_make, vehicle_model, booking_date, start_time, end_time)
           values ($1, 'Bot', 'bot@example.com', '0412345678', 'BOT1', 'X', 'Y', '2030-03-04', '12:00', '13:00')`,
          [serviceId]
        ),
        "42501"
      );
    });
  });

  it("still lets anyone read active services and opening hours", async () => {
    await asRole(db, "anon", null, async () => {
      expect((await db.query("select * from public.services")).rows.length).toBeGreaterThan(0);
      expect((await db.query("select * from public.business_hours")).rows).toHaveLength(7);
    });
  });

  it("treats a signed-in user who is not in admin_users like the public", async () => {
    await asRole(db, "authenticated", NOT_ADMIN, async () => {
      expect((await db.query("select * from public.bookings")).rows).toHaveLength(0);
      expect((await db.query("select * from public.booking_events")).rows).toHaveLength(0);

      const updated = await db.query(
        "update public.bookings set status = 'confirmed' where id = $1 returning id",
        [bookingId]
      );
      expect(updated.rows).toHaveLength(0);

      await expectPgError(
        db.query("insert into public.admin_users (user_id) values ($1)", [NOT_ADMIN.id]),
        "42501"
      );
      // RLS hides every row from the UPDATE, so it silently matches none.
      const servicesUpdated = await db.query("update public.services set name = 'Hacked' returning id");
      expect(servicesUpdated.rows).toHaveLength(0);
    });

    const { rows: hacked } = await db.query("select 1 from public.services where name = 'Hacked'");
    expect(hacked).toHaveLength(0);

    const { rows } = await db.query<{ status: string }>("select status from public.bookings where id = $1", [bookingId]);
    expect(rows[0].status).toBe("pending");
  });

  it("lets an admin read and update bookings, and records who did it", async () => {
    await asRole(db, "authenticated", ADMIN, async () => {
      expect((await db.query("select * from public.bookings")).rows).toHaveLength(1);
      await db.query(
        "update public.bookings set status = 'confirmed', status_reason = null where id = $1",
        [bookingId]
      );
      await db.query(
        "update public.bookings set booking_date = '2030-03-05', status_reason = 'Moved at your request' where id = $1",
        [bookingId]
      );
      await db.query("update public.bookings set admin_notes = 'Parts ordered' where id = $1", [bookingId]);
    });

    const { rows } = await db.query<{
      event_type: string;
      from_status: string | null;
      to_status: string | null;
      to_date: string | Date | null;
      detail: string | null;
      actor_id: string | null;
      actor_email: string | null;
    }>("select * from public.booking_events where booking_id = $1 order by id", [bookingId]);

    expect(rows.map((r) => r.event_type)).toEqual(["created", "status_changed", "rescheduled", "notes_updated"]);
    expect(rows[0].actor_id).toBeNull(); // created by the service role / public API
    expect(rows[1]).toMatchObject({ from_status: "pending", to_status: "confirmed", actor_id: ADMIN.id, actor_email: ADMIN.email });
    expect(rows[2].detail).toBe("Moved at your request");
  });

  it("lets an admin read the history", async () => {
    const { rows } = await asRole(db, "authenticated", ADMIN, () =>
      db.query("select * from public.booking_events")
    );
    expect(rows).toHaveLength(1);
  });
});
