import { BUSINESS } from "@/lib/constants";
import { escapeHtml, formatDateDisplay, formatTimeDisplay, statusLabel } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

export type BookingWithService = Booking & { service?: Service | null };

export interface EmailContent {
  subject: string;
  html: string;
}

function layout(bodyHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${BUSINESS.name}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F6F4EF;font-family:Arial,Helvetica,sans-serif;color:#16181B;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F6F4EF;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #EDE9E0;">
            <tr>
              <td style="background-color:#16181B;padding:24px 32px;">
                <span style="color:#F2A71B;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">Gurkha Automotive</span>
                <div style="color:#ffffff;font-size:20px;font-weight:bold;margin-top:4px;">Sunshine North Workshop</div>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="background-color:#F6F4EF;padding:20px 32px;border-top:1px solid #EDE9E0;">
                <p style="margin:0;font-size:12px;color:#5A6B7A;line-height:1.6;">
                  ${BUSINESS.name}<br />
                  ${BUSINESS.fullAddress}<br />
                  ${BUSINESS.phone}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** First name for a greeting, escaped for safe interpolation into HTML. */
function greetingName(booking: BookingWithService): string {
  return escapeHtml(booking.customer_name.split(" ")[0]);
}

/** Multi-line customer/staff text, escaped, with line breaks kept. */
function paragraphText(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br />");
}

function vehicleLine(booking: BookingWithService): string {
  const year = booking.vehicle_year ? `${booking.vehicle_year} ` : "";
  return `${year}${escapeHtml(booking.vehicle_make)} ${escapeHtml(booking.vehicle_model)} (${escapeHtml(booking.vehicle_rego)})`;
}

function detailsTable(booking: BookingWithService): string {
  const rows: [string, string][] = [
    ["Reference", `<span style="font-family:monospace;letter-spacing:1px;">${escapeHtml(booking.reference)}</span>`],
    ["Status", escapeHtml(statusLabel(booking.status))],
    ["Service", escapeHtml(booking.service?.name ?? "—")],
    ["Date", formatDateDisplay(booking.booking_date)],
    ["Time", formatTimeDisplay(booking.start_time)],
    ["Vehicle", vehicleLine(booking)],
    ["Name", escapeHtml(booking.customer_name)],
    ["Phone", escapeHtml(booking.customer_phone)],
    ["Email", escapeHtml(booking.customer_email)],
  ];
  if (booking.problem_description) rows.push(["Problem", paragraphText(booking.problem_description)]);
  if (booking.notes) rows.push(["Comments", paragraphText(booking.notes)]);

  const rowsHtml = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 0;font-size:13px;color:#5A6B7A;width:120px;vertical-align:top;">${label}</td>
        <td style="padding:8px 0;font-size:14px;color:#16181B;font-weight:600;">${value}</td>
      </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:1px solid #EDE9E0;">${rowsHtml}</table>`;
}

function staffMessage(booking: BookingWithService): string {
  if (!booking.status_reason) return "";
  return `
    <div style="margin-top:16px;padding:12px 16px;background-color:#F6F4EF;border-left:3px solid #F2A71B;">
      <p style="margin:0 0 4px;font-size:12px;color:#5A6B7A;text-transform:uppercase;letter-spacing:1px;">Message from our team</p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#16181B;">${paragraphText(booking.status_reason)}</p>
    </div>`;
}

export function customerBookingReceivedEmail(booking: BookingWithService): EmailContent {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;">Thanks, ${greetingName(booking)}. We've got your booking request.</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Your request is <strong>pending</strong> — it is not a confirmed appointment yet.
      Our team will review it and email you once it's confirmed. If your requested time
      isn't available, we'll contact you on ${escapeHtml(booking.customer_phone)} to arrange another slot.
    </p>
    ${detailsTable(booking)}
    <p style="font-size:13px;line-height:1.6;color:#5A6B7A;margin-top:20px;">
      Please quote reference <strong>${escapeHtml(booking.reference)}</strong> if you contact us.
      Need to change anything? Call us on ${BUSINESS.phone}.
    </p>
  `;
  return {
    subject: `Booking request received (${booking.reference}) — ${BUSINESS.name}`,
    html: layout(body, "Your booking request has been received and is pending confirmation."),
  };
}

export function garageNewBookingEmail(booking: BookingWithService): EmailContent {
  const via = booking.source === "assistant" ? " via the booking assistant" : "";
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;">New booking request</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      A new booking request has come in${via} and is waiting for review in the admin dashboard.
      The customer has been told it is pending until you confirm it.
    </p>
    ${detailsTable(booking)}
  `;
  return {
    subject: `New booking request ${booking.reference}: ${booking.customer_name} — ${formatDateDisplay(booking.booking_date)}`,
    html: layout(body, "A new booking request needs your review."),
  };
}

export function customerBookingConfirmedEmail(booking: BookingWithService): EmailContent {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;color:#25774A;">Booking confirmed ✓</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Good news, ${greetingName(booking)} — your appointment is confirmed. We look
      forward to seeing you and your ${escapeHtml(booking.vehicle_make)} ${escapeHtml(booking.vehicle_model)}.
    </p>
    ${detailsTable(booking)}
    <p style="font-size:13px;line-height:1.6;color:#5A6B7A;margin-top:20px;">
      Running late or need to reschedule? Call us on ${BUSINESS.phone} and quote ${escapeHtml(booking.reference)}.
    </p>
  `;
  return {
    subject: `Booking confirmed (${booking.reference}) — ${formatDateDisplay(booking.booking_date)} — ${BUSINESS.name}`,
    html: layout(body, "Your appointment has been confirmed."),
  };
}

export function customerBookingRejectedEmail(booking: BookingWithService): EmailContent {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;color:#A93030;">We can't take this booking</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Hi ${greetingName(booking)}, unfortunately we're unable to accept the booking request below.
      Please call us on ${BUSINESS.phone} and we'll do our best to find another option for you.
    </p>
    ${staffMessage(booking)}
    ${detailsTable(booking)}
  `;
  return {
    subject: `About your booking request (${booking.reference}) — ${BUSINESS.name}`,
    html: layout(body, "We're unable to accept your booking request."),
  };
}

export function customerBookingRescheduledEmail(
  booking: BookingWithService,
  previous: { booking_date: string; start_time: string }
): EmailContent {
  const confirmed = booking.status === "confirmed";
  const heading = confirmed ? "Your appointment has a new time" : "Your booking request has a new time";
  const statusSentence = confirmed
    ? "Your appointment is <strong>confirmed</strong> for the new time below."
    : `Your request is still <strong>${escapeHtml(statusLabel(booking.status).toLowerCase())}</strong> — we'll email you again once it's confirmed.`;

  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;">${heading}</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Hi ${greetingName(booking)}, we've moved your booking from
      ${formatDateDisplay(previous.booking_date)} at ${formatTimeDisplay(previous.start_time)} to
      <strong>${formatDateDisplay(booking.booking_date)} at ${formatTimeDisplay(booking.start_time)}</strong>.
      ${statusSentence}
    </p>
    ${staffMessage(booking)}
    ${detailsTable(booking)}
    <p style="font-size:13px;line-height:1.6;color:#5A6B7A;margin-top:20px;">
      If the new time doesn't suit you, please call us on ${BUSINESS.phone} and quote ${escapeHtml(booking.reference)}.
    </p>
  `;
  return {
    subject: `New time for your booking (${booking.reference}) — ${formatDateDisplay(booking.booking_date)} — ${BUSINESS.name}`,
    html: layout(body, "Your booking has been moved to a new time."),
  };
}

export function customerBookingCancelledEmail(booking: BookingWithService): EmailContent {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;color:#A93030;">Booking cancelled</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Hi ${greetingName(booking)}, your appointment below has been cancelled.
      If this wasn't expected, or you'd like to rebook, please call us on ${BUSINESS.phone}.
    </p>
    ${staffMessage(booking)}
    ${detailsTable(booking)}
  `;
  return {
    subject: `Booking cancelled (${booking.reference}) — ${formatDateDisplay(booking.booking_date)} — ${BUSINESS.name}`,
    html: layout(body, "Your appointment has been cancelled."),
  };
}
