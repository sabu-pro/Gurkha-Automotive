import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingRequestSchema, domainAcceptsMail, firstIssue } from "@/lib/validation";
import { checkSlot } from "@/lib/booking-scheduling";
import {
  countUpcomingActiveForContact,
  findBookingByRequestId,
  getActiveService,
  recordBookingEvent,
  RepositoryError,
} from "@/lib/booking-repository";
import { sendBookingReceivedEmails, type EmailResult } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatAuPhone } from "@/lib/phone";
import { todayIsoDate } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

export const runtime = "nodejs";

/** Upcoming pending/confirmed requests one email or phone may hold at once. */
const MAX_ACTIVE_REQUESTS_PER_CONTACT = 3;

/** Postgres SQLSTATEs surfaced by Supabase. */
const PG_EXCLUSION_VIOLATION = "23P01"; // bookings_no_overlap: the slot was taken
const PG_UNIQUE_VIOLATION = "23505"; // bookings_client_request_id_key: duplicate submission

/**
 * The only booking data returned to the browser: what the customer
 * needs to see on screen, nothing else. Never includes other customers'
 * data, admin notes or internal ids.
 */
function publicBooking(booking: Booking, service: Pick<Service, "name"> | null | undefined) {
  return {
    reference: booking.reference,
    status: booking.status,
    booking_date: booking.booking_date,
    start_time: booking.start_time,
    end_time: booking.end_time,
    service_name: service?.name ?? null,
  };
}

function error(message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

async function logEmailOutcome(
  db: ReturnType<typeof createAdminClient>,
  bookingId: string,
  label: string,
  result: EmailResult
) {
  await recordBookingEvent(db, {
    booking_id: bookingId,
    event_type: result.sent ? "email_sent" : "email_failed",
    detail: result.sent ? label : `${label}: ${result.error ?? "unknown error"}`,
  });
}

export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(request, "bookings", 5, 60);
  if (!allowed) {
    return error("Too many requests. Please wait a moment and try again.", 429, { code: "rate_limited" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("Invalid request body.", 400);
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    return error(issue.message, 400, { code: "invalid", field: issue.field });
  }

  const input = parsed.data;

  if (input.website) {
    // Honeypot filled in: almost certainly a bot posting every field.
    return error("We couldn't accept that request.", 400, { code: "rejected" });
  }

  try {
    const db = createAdminClient();

    // A retry of a request we already saved (double click, flaky
    // mobile connection, browser resubmit): hand back the original.
    if (input.client_request_id) {
      const existing = await findBookingByRequestId(db, input.client_request_id);
      if (existing) {
        return NextResponse.json({ booking: publicBooking(existing, existing.service), duplicate: true }, { status: 200 });
      }
    }

    const service = await getActiveService(db, input.service_id);
    if (!service) {
      return error("That service is not available.", 400, { code: "invalid", field: "service_id" });
    }

    const slot = await checkSlot(db, {
      durationMinutes: service.duration_minutes,
      date: input.booking_date,
      startTime: input.start_time,
      requireSlotGrid: true,
    });
    if (!slot.ok) {
      const field = slot.reason === "taken" || slot.reason === "not_a_slot" || slot.reason === "outside_hours" ? "start_time" : "booking_date";
      return error(slot.message, slot.reason === "taken" ? 409 : 400, {
        code: slot.reason === "taken" ? "slot_taken" : "invalid",
        field,
      });
    }

    if (!(await domainAcceptsMail(input.customer_email))) {
      return error("That email address doesn't look valid — please check for typos.", 400, {
        code: "invalid",
        field: "customer_email",
      });
    }

    const phone = formatAuPhone(input.customer_phone);
    const active = await countUpcomingActiveForContact(db, { email: input.customer_email, phone }, todayIsoDate());
    if (active >= MAX_ACTIVE_REQUESTS_PER_CONTACT) {
      return error(
        "You already have several upcoming booking requests with us. Please call us to arrange another.",
        429,
        { code: "too_many_active" }
      );
    }

    const { data: booking, error: insertError } = await db
      .from("bookings")
      .insert({
        service_id: service.id,
        customer_name: input.customer_name,
        customer_email: input.customer_email,
        customer_phone: phone,
        vehicle_rego: input.vehicle_rego,
        vehicle_make: input.vehicle_make,
        vehicle_model: input.vehicle_model,
        vehicle_year: input.vehicle_year ?? null,
        problem_description: input.problem_description || null,
        notes: input.notes || null,
        booking_date: input.booking_date,
        start_time: slot.startTime,
        end_time: slot.endTime,
        status: "pending",
        source: input.source ?? "web_form",
        client_request_id: input.client_request_id ?? null,
      })
      .select("*")
      .single();

    if (insertError || !booking) {
      // Another request took this slot between our check and the
      // insert. The database constraint caught it; tell the customer.
      if (insertError?.code === PG_EXCLUSION_VIOLATION) {
        return error("That time slot was just taken. Please choose another time.", 409, {
          code: "slot_taken",
          field: "start_time",
        });
      }
      // Two copies of the same submission raced each other: return the winner.
      if (insertError?.code === PG_UNIQUE_VIOLATION && input.client_request_id) {
        const existing = await findBookingByRequestId(db, input.client_request_id);
        if (existing) {
          return NextResponse.json({ booking: publicBooking(existing, existing.service), duplicate: true }, { status: 200 });
        }
      }
      console.error("Booking insert failed:", insertError);
      return error("Could not save your booking. Please try again.", 500, { code: "server" });
    }

    // The booking is saved. Email problems are recorded, never fatal.
    const saved = booking as Booking;
    const emails = await sendBookingReceivedEmails({ ...saved, service });
    await Promise.all([
      logEmailOutcome(db, saved.id, "Customer acknowledgement email", emails.customer),
      logEmailOutcome(db, saved.id, "Garage notification email", emails.garage),
    ]);

    return NextResponse.json(
      { booking: publicBooking(saved, service), acknowledgementEmailSent: emails.customer.sent },
      { status: 201 }
    );
  } catch (caught) {
    if (!(caught instanceof RepositoryError)) console.error("Booking request failed:", caught);
    return error("Something went wrong on our side. Please try again in a moment.", 500, { code: "server" });
  }
}
