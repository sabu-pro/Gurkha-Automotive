import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, getAdminSession } from "@/lib/auth";
import { bookingUpdateSchema, firstIssue } from "@/lib/validation";
import { checkSlot } from "@/lib/booking-scheduling";
import { recordBookingEvent, RepositoryError } from "@/lib/booking-repository";
import {
  sendBookingCancelledEmail,
  sendBookingConfirmedEmail,
  sendBookingRejectedEmail,
  sendBookingRescheduledEmail,
  type EmailResult,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { normaliseTime } from "@/lib/time";
import type { Booking, Database, Service } from "@/lib/types";

export const runtime = "nodejs";

const PG_EXCLUSION_VIOLATION = "23P01";

type BookingRow = Booking & { service: Service | null };

/** What the dashboard is told about the customer email this change triggered. */
interface EmailOutcome {
  attempted: boolean;
  kind?: "confirmed" | "rejected" | "cancelled" | "rescheduled";
  sent?: boolean;
  error?: string;
}

const EMAIL_LABELS: Record<NonNullable<EmailOutcome["kind"]>, string> = {
  confirmed: "Confirmation email",
  rejected: "Rejection email",
  cancelled: "Cancellation email",
  rescheduled: "Reschedule email",
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session.reason);

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Unknown booking." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bookingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    return NextResponse.json({ error: issue.message, field: issue.field }, { status: 400 });
  }
  const input = parsed.data;
  const { supabase, user } = session;

  try {
    const { data: currentData, error: loadError } = await supabase
      .from("bookings")
      .select("*, service:services(*)")
      .eq("id", id)
      .maybeSingle();
    if (loadError) throw new RepositoryError("load booking", loadError);
    const current = currentData as BookingRow | null;
    if (!current) return NextResponse.json({ error: "Unknown booking." }, { status: 404 });

    const patch: Database["public"]["Tables"]["bookings"]["Update"] = {};

    if (input.admin_notes !== undefined && input.admin_notes !== (current.admin_notes ?? "")) {
      patch.admin_notes = input.admin_notes || null;
    }

    let rescheduled = false;
    if (input.booking_date && input.start_time) {
      const newStart = normaliseTime(input.start_time);
      if (input.booking_date !== current.booking_date || newStart !== current.start_time) {
        const slot = await checkSlot(supabase, {
          durationMinutes: current.service?.duration_minutes ?? 60,
          date: input.booking_date,
          startTime: newStart,
          requireSlotGrid: false, // staff may pick any minute within opening hours
          excludeBookingId: current.id,
        });
        if (!slot.ok) {
          return NextResponse.json({ error: slot.message }, { status: slot.reason === "taken" ? 409 : 400 });
        }
        patch.booking_date = input.booking_date;
        patch.start_time = slot.startTime;
        patch.end_time = slot.endTime;
        rescheduled = true;
      }
    }

    const statusChanged = input.status !== undefined && input.status !== current.status;
    if (statusChanged) patch.status = input.status;

    if (statusChanged || rescheduled) {
      // The message is per-change: clear any earlier one when none is given.
      patch.status_reason = input.customer_message ? input.customer_message : null;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nothing to change — the booking already looks like that." }, { status: 400 });
    }

    const { data: updatedData, error: updateError } = await supabase
      .from("bookings")
      .update(patch)
      .eq("id", id)
      .select("*, service:services(*)")
      .maybeSingle();

    if (updateError) {
      if (updateError.code === PG_EXCLUSION_VIOLATION) {
        return NextResponse.json(
          { error: "That time overlaps another active booking. Choose a different time, or move the other booking first." },
          { status: 409 }
        );
      }
      throw new RepositoryError("update booking", updateError);
    }
    const updated = updatedData as BookingRow | null;
    if (!updated) {
      // RLS filtered the row out: the session lost admin rights mid-request.
      return NextResponse.json({ error: "Your account does not have admin access." }, { status: 403 });
    }

    const email = await notifyCustomer({
      updated,
      previous: current,
      rescheduled,
      statusChanged,
      notify: input.notify_customer !== false,
    });

    if (email.attempted && email.kind) {
      await recordBookingEvent(createAdminClient(), {
        booking_id: updated.id,
        event_type: email.sent ? "email_sent" : "email_failed",
        detail: email.sent ? EMAIL_LABELS[email.kind] : `${EMAIL_LABELS[email.kind]}: ${email.error ?? "unknown error"}`,
        actor_id: user.id,
        actor_email: user.email ?? null,
      });
    }

    return NextResponse.json({ booking: updated, email });
  } catch (caught) {
    console.error("Admin booking update failed:", caught);
    return NextResponse.json({ error: "Could not update that booking. Please try again." }, { status: 500 });
  }
}

/**
 * At most one customer email per change. Confirmation emails are only
 * ever sent when the status has actually moved to confirmed.
 */
async function notifyCustomer({
  updated,
  previous,
  rescheduled,
  statusChanged,
  notify,
}: {
  updated: BookingRow;
  previous: BookingRow;
  rescheduled: boolean;
  statusChanged: boolean;
  notify: boolean;
}): Promise<EmailOutcome> {
  let kind: EmailOutcome["kind"];
  if (rescheduled && (updated.status === "pending" || updated.status === "confirmed")) kind = "rescheduled";
  else if (statusChanged && updated.status === "confirmed") kind = "confirmed";
  else if (statusChanged && updated.status === "rejected") kind = "rejected";
  else if (statusChanged && updated.status === "cancelled") kind = "cancelled";

  if (!kind || !notify) return { attempted: false, kind };

  let result: EmailResult;
  switch (kind) {
    case "rescheduled":
      result = await sendBookingRescheduledEmail(updated, previous);
      break;
    case "confirmed":
      result = await sendBookingConfirmedEmail(updated);
      break;
    case "rejected":
      result = await sendBookingRejectedEmail(updated);
      break;
    case "cancelled":
      result = await sendBookingCancelledEmail(updated);
      break;
  }
  return { attempted: true, kind, sent: result.sent, error: result.error };
}
