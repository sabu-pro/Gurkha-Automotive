import { ACTIVE_BOOKING_STATUSES } from "@/lib/availability";
import type { Booking, BookingEventType, BusinessHours, Service } from "@/lib/types";

/**
 * Thin, server-only data access for bookings. Every query here goes
 * through the Supabase client's query builder, which sends values as
 * bound parameters — no SQL is ever assembled from user input.
 *
 * Functions take the client as an argument so a route can choose the
 * service-role client (public booking API) or the signed-in admin's
 * RLS-bound client (dashboard actions).
 */

// The generated Database type is wired through `as any` in
// src/lib/supabase/*, so the client is untyped here too.
export type DbClient = any;

export class RepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "RepositoryError";
  }
}

function fail(what: string, error: unknown): never {
  console.error(`Database error while ${what}:`, error);
  throw new RepositoryError(`Could not ${what}.`, error);
}

export type BusyRange = Pick<Booking, "id" | "booking_date" | "start_time" | "end_time">;

export async function getActiveService(db: DbClient, serviceId: string): Promise<Service | null> {
  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) fail("look up that service", error);
  return (data as Service | null) ?? null;
}

export async function listActiveServices(db: DbClient): Promise<Pick<Service, "id" | "name" | "description" | "duration_minutes">[]> {
  const { data, error } = await db
    .from("services")
    .select("id, name, description, duration_minutes")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) fail("load services", error);
  return data ?? [];
}

export async function getBusinessHours(db: DbClient): Promise<BusinessHours[]> {
  const { data, error } = await db.from("business_hours").select("*");
  if (error) fail("check opening hours", error);
  return data ?? [];
}

export async function getBlockedDatesBetween(db: DbClient, from: string, to: string): Promise<string[]> {
  const { data, error } = await db
    .from("blocked_dates")
    .select("blocked_date")
    .gte("blocked_date", from)
    .lte("blocked_date", to);
  if (error) fail("check closed dates", error);
  return ((data ?? []) as { blocked_date: string }[]).map((row) => row.blocked_date);
}

/** Bookings that hold a slot (pending/confirmed/completed) within a date range. */
export async function getActiveBookingsBetween(db: DbClient, from: string, to: string): Promise<BusyRange[]> {
  const { data, error } = await db
    .from("bookings")
    .select("id, booking_date, start_time, end_time")
    .gte("booking_date", from)
    .lte("booking_date", to)
    .in("status", ACTIVE_BOOKING_STATUSES);
  if (error) fail("check availability", error);
  return data ?? [];
}

export async function findBookingByRequestId(db: DbClient, clientRequestId: string): Promise<(Booking & { service: Service | null }) | null> {
  const { data, error } = await db
    .from("bookings")
    .select("*, service:services(*)")
    .eq("client_request_id", clientRequestId)
    .maybeSingle();
  if (error) fail("check for a duplicate submission", error);
  return data ?? null;
}

/**
 * Upcoming bookings still holding a slot for this email or phone — a
 * cheap spam/abuse brake so one person (or script) can't fill the
 * calendar with requests.
 */
export async function countUpcomingActiveForContact(
  db: DbClient,
  contact: { email: string; phone: string },
  today: string
): Promise<number> {
  // Two parameterised queries rather than one `.or("...")` filter
  // string, so user input is never spliced into PostgREST syntax.
  const upcomingFor = async (column: "customer_email" | "customer_phone", value: string) => {
    const { data, error } = await db
      .from("bookings")
      .select("id")
      .eq(column, value)
      .gte("booking_date", today)
      .in("status", ["pending", "confirmed"])
      .limit(20);
    if (error) fail("check existing bookings", error);
    return ((data ?? []) as { id: string }[]).map((row) => row.id);
  };

  const [byEmail, byPhone] = await Promise.all([
    upcomingFor("customer_email", contact.email),
    upcomingFor("customer_phone", contact.phone),
  ]);
  return new Set([...byEmail, ...byPhone]).size;
}

export interface BookingEventInput {
  booking_id: string;
  event_type: BookingEventType;
  detail?: string | null;
  actor_id?: string | null;
  actor_email?: string | null;
}

/**
 * Append to the booking's history (service-role client only — there is
 * no write policy for anyone else). Never throws: losing a history line
 * must never fail the request that triggered it.
 */
export async function recordBookingEvent(db: DbClient, event: BookingEventInput): Promise<void> {
  try {
    const { error } = await db.from("booking_events").insert({
      ...event,
      detail: event.detail ? event.detail.slice(0, 500) : null,
    });
    if (error) console.error("Could not record booking event:", error);
  } catch (error) {
    console.error("Could not record booking event:", error);
  }
}
