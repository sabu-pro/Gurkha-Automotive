import { getResendClient } from "@/lib/resend";
import {
  customerBookingCancelledEmail,
  customerBookingConfirmedEmail,
  customerBookingReceivedEmail,
  customerBookingRejectedEmail,
  customerBookingRescheduledEmail,
  garageNewBookingEmail,
  type BookingWithService,
  type EmailContent,
} from "@/lib/email-templates";

/**
 * Outcome of one email. Every send function here resolves — it never
 * throws — so a Resend outage, a missing API key or a bad address can
 * never undo a booking that has already been saved. Callers record the
 * outcome in the booking's history and show staff a warning.
 *
 * Note Resend reports most failures by *returning* `{ error }` rather
 * than throwing, so both paths are handled.
 */
export interface EmailResult {
  sent: boolean;
  error?: string;
}

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Gurkha Automotive <onboarding@resend.dev>";
}

/**
 * The garage's notification inbox(es). GARAGE_NOTIFICATION_EMAIL holds a
 * single address, or several separated by commas. Throws if none are set.
 */
export function garageInboxes(): string[] {
  const addresses = (process.env.GARAGE_NOTIFICATION_EMAIL ?? "")
    .split(",")
    .map((address) => address.trim())
    .filter((address) => address.length > 0);

  if (addresses.length === 0) {
    throw new Error("GARAGE_NOTIFICATION_EMAIL is not set.");
  }
  return addresses;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Unknown email error";
}

async function deliver(to: string | string[] | (() => string[]), content: EmailContent, label: string): Promise<EmailResult> {
  try {
    const recipients = typeof to === "function" ? to() : to;
    const { error } = await getResendClient().emails.send({
      from: fromAddress(),
      to: recipients,
      subject: content.subject,
      html: content.html,
    });
    if (error) {
      console.error(`Failed to send ${label} email:`, error);
      return { sent: false, error: describeError(error) };
    }
    return { sent: true };
  } catch (error) {
    console.error(`Failed to send ${label} email:`, error);
    return { sent: false, error: describeError(error) };
  }
}

/** "Booking request received" to the customer and "new booking" to the garage, in parallel. */
export async function sendBookingReceivedEmails(
  booking: BookingWithService
): Promise<{ customer: EmailResult; garage: EmailResult }> {
  const [customer, garage] = await Promise.all([
    deliver(booking.customer_email, customerBookingReceivedEmail(booking), "booking-received"),
    deliver(garageInboxes, garageNewBookingEmail(booking), "garage new-booking"),
  ]);
  return { customer, garage };
}

export function sendBookingConfirmedEmail(booking: BookingWithService): Promise<EmailResult> {
  return deliver(booking.customer_email, customerBookingConfirmedEmail(booking), "booking-confirmed");
}

export function sendBookingRejectedEmail(booking: BookingWithService): Promise<EmailResult> {
  return deliver(booking.customer_email, customerBookingRejectedEmail(booking), "booking-rejected");
}

export function sendBookingCancelledEmail(booking: BookingWithService): Promise<EmailResult> {
  return deliver(booking.customer_email, customerBookingCancelledEmail(booking), "booking-cancelled");
}

export function sendBookingRescheduledEmail(
  booking: BookingWithService,
  previous: { booking_date: string; start_time: string }
): Promise<EmailResult> {
  return deliver(booking.customer_email, customerBookingRescheduledEmail(booking, previous), "booking-rescheduled");
}
