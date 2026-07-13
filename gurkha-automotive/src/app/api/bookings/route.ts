import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bookingRequestSchema } from "@/lib/validation";
import { computeEndTime } from "@/lib/availability";
import { sendBookingReceivedEmails } from "@/lib/email";
import { timeToMinutes, todayIsoDate } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Invalid booking details." },
      { status: 400 }
    );
  }

  const input = parsed.data;

  if (input.booking_date < todayIsoDate()) {
    return NextResponse.json({ error: "Please choose a date that isn't in the past." }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", input.service_id)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError) {
    console.error(serviceError);
    return NextResponse.json({ error: "Could not look up that service." }, { status: 500 });
  }
  if (!service) {
    return NextResponse.json({ error: "That service is not available." }, { status: 400 });
  }

  const bookingDate = new Date(input.booking_date + "T00:00:00");
  const dayOfWeek = bookingDate.getDay();

  const { data: hours, error: hoursError } = await supabase
    .from("business_hours")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  if (hoursError) {
    console.error(hoursError);
    return NextResponse.json({ error: "Could not check opening hours." }, { status: 500 });
  }
  if (!hours || hours.is_closed || !hours.open_time || !hours.close_time) {
    return NextResponse.json({ error: "We're closed on that day." }, { status: 400 });
  }

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("blocked_date", input.booking_date)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json({ error: "We're closed on that date." }, { status: 400 });
  }

  const startTime = input.start_time.length === 5 ? `${input.start_time}:00` : input.start_time;
  const endTime = computeEndTime(startTime, service.duration_minutes);

  const openMinutes = timeToMinutes(hours.open_time);
  const closeMinutes = timeToMinutes(hours.close_time);
  const requestedStart = timeToMinutes(startTime);
  const requestedEnd = timeToMinutes(endTime);

  if (requestedStart < openMinutes || requestedEnd > closeMinutes) {
    return NextResponse.json(
      { error: "That time falls outside our opening hours for that day." },
      { status: 400 }
    );
  }

  // Re-check for a conflicting booking right before inserting, to close
  // the race window between the customer loading available slots and
  // submitting the form.
  const { data: sameDayBookings, error: conflictError } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("booking_date", input.booking_date)
    .neq("status", "cancelled");

  if (conflictError) {
    console.error(conflictError);
    return NextResponse.json({ error: "Could not verify availability." }, { status: 500 });
  }

  const hasConflict = (sameDayBookings ?? []).some((existing: { start_time: string; end_time: string }) => {
    const existingStart = timeToMinutes(existing.start_time);
    const existingEnd = timeToMinutes(existing.end_time);
    return requestedStart < existingEnd && requestedEnd > existingStart;
  });

  if (hasConflict) {
    return NextResponse.json(
      { error: "That time slot was just taken. Please choose another time." },
      { status: 409 }
    );
  }

  const { data: booking, error: insertError } = await supabase
    .from("bookings")
    .insert({
      service_id: input.service_id,
      customer_name: input.customer_name,
      customer_email: input.customer_email,
      customer_phone: input.customer_phone,
      vehicle_rego: input.vehicle_rego.toUpperCase(),
      vehicle_make: input.vehicle_make,
      vehicle_model: input.vehicle_model,
      notes: input.notes || null,
      booking_date: input.booking_date,
      start_time: startTime,
      end_time: endTime,
      status: "pending",
    })
    .select("*")
    .single();

  if (insertError || !booking) {
    console.error(insertError);
    return NextResponse.json({ error: "Could not save your booking. Please try again." }, { status: 500 });
  }

  try {
    await sendBookingReceivedEmails({ ...booking, service });
  } catch (emailError) {
    // The booking is already saved — a failed email should not fail the request.
    console.error("Booking email failed:", emailError);
  }

  return NextResponse.json({ booking }, { status: 201 });
}
