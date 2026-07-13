import { getResendClient } from "@/lib/resend";
import {
  customerBookingCancelledEmail,
  customerBookingConfirmedEmail,
  customerBookingReceivedEmail,
  garageNewBookingEmail,
} from "@/lib/email-templates";
import type { Booking, Service } from "@/lib/types";

type BookingWithService = Booking & { service?: Service };

function fromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? "Gurkha Automotive <onboarding@resend.dev>";
}

function garageInbox(): string {
  const address = process.env.GARAGE_NOTIFICATION_EMAIL;
  if (!address) {
    throw new Error("GARAGE_NOTIFICATION_EMAIL is not set.");
  }
  return address;
}

/**
 * Sends both the "booking received" email to the customer and the
 * "new booking" notification email to the garage. Failures are logged
 * but never thrown — a flaky email provider should never block a
 * booking from being saved.
 */
export async function sendBookingReceivedEmails(booking: BookingWithService): Promise<void> {
  const resend = getResendClient();
  const customerEmail = customerBookingReceivedEmail(booking);
  const garageEmail = garageNewBookingEmail(booking);

  const results = await Promise.allSettled([
    resend.emails.send({
      from: fromAddress(),
      to: booking.customer_email,
      subject: customerEmail.subject,
      html: customerEmail.html,
    }),
    resend.emails.send({
      from: fromAddress(),
      to: garageInbox(),
      subject: garageEmail.subject,
      html: garageEmail.html,
    }),
  ]);

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send booking-received email:", result.reason);
    }
  }
}

export async function sendBookingConfirmedEmail(booking: BookingWithService): Promise<void> {
  const resend = getResendClient();
  const email = customerBookingConfirmedEmail(booking);
  try {
    await resend.emails.send({
      from: fromAddress(),
      to: booking.customer_email,
      subject: email.subject,
      html: email.html,
    });
  } catch (error) {
    console.error("Failed to send booking-confirmed email:", error);
  }
}

export async function sendBookingCancelledEmail(booking: BookingWithService): Promise<void> {
  const resend = getResendClient();
  const email = customerBookingCancelledEmail(booking);
  try {
    await resend.emails.send({
      from: fromAddress(),
      to: booking.customer_email,
      subject: email.subject,
      html: email.html,
    });
  } catch (error) {
    console.error("Failed to send booking-cancelled email:", error);
  }
}
