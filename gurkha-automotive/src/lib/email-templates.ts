import { BUSINESS } from "@/lib/constants";
import { formatDateDisplay, formatTimeDisplay } from "@/lib/utils";
import type { Booking, Service } from "@/lib/types";

type BookingWithService = Booking & { service?: Service };

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

function detailsTable(booking: BookingWithService): string {
  const rows: [string, string][] = [
    ["Service", booking.service?.name ?? "—"],
    ["Date", formatDateDisplay(booking.booking_date)],
    ["Time", formatTimeDisplay(booking.start_time)],
    ["Vehicle", `${booking.vehicle_make} ${booking.vehicle_model} (${booking.vehicle_rego})`],
    ["Name", booking.customer_name],
    ["Phone", booking.customer_phone],
    ["Email", booking.customer_email],
  ];
  if (booking.notes) rows.push(["Notes", booking.notes]);

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

export function customerBookingReceivedEmail(booking: BookingWithService): {
  subject: string;
  html: string;
} {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;">Thanks, ${booking.customer_name.split(" ")[0]}. We've got your booking request.</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      We've received your request and it's currently <strong>pending confirmation</strong>.
      Our team will review it and send you a confirmation email shortly. If your requested time
      isn't available, we'll call you on ${booking.customer_phone} to arrange another slot.
    </p>
    ${detailsTable(booking)}
    <p style="font-size:13px;line-height:1.6;color:#5A6B7A;margin-top:20px;">
      Need to change anything? Call us on ${BUSINESS.phone}.
    </p>
  `;
  return {
    subject: `We've received your booking request — ${BUSINESS.name}`,
    html: layout(body, "Your booking request has been received and is pending confirmation."),
  };
}

export function garageNewBookingEmail(booking: BookingWithService): {
  subject: string;
  html: string;
} {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;">New booking request</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      A new booking has come in and is waiting for review in the admin dashboard.
    </p>
    ${detailsTable(booking)}
  `;
  return {
    subject: `New booking: ${booking.customer_name} — ${formatDateDisplay(booking.booking_date)}`,
    html: layout(body, "A new booking request needs your review."),
  };
}

export function customerBookingConfirmedEmail(booking: BookingWithService): {
  subject: string;
  html: string;
} {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;color:#25774A;">Booking confirmed ✓</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Good news, ${booking.customer_name.split(" ")[0]} — your appointment is confirmed. We look
      forward to seeing you and your ${booking.vehicle_make} ${booking.vehicle_model}.
    </p>
    ${detailsTable(booking)}
    <p style="font-size:13px;line-height:1.6;color:#5A6B7A;margin-top:20px;">
      Running late or need to reschedule? Call us on ${BUSINESS.phone}.
    </p>
  `;
  return {
    subject: `Booking confirmed — ${formatDateDisplay(booking.booking_date)} — ${BUSINESS.name}`,
    html: layout(body, "Your appointment has been confirmed."),
  };
}

export function customerBookingCancelledEmail(booking: BookingWithService): {
  subject: string;
  html: string;
} {
  const body = `
    <h1 style="font-size:20px;margin:0 0 8px;color:#A93030;">Booking cancelled</h1>
    <p style="font-size:14px;line-height:1.6;color:#3A3F45;margin:0;">
      Hi ${booking.customer_name.split(" ")[0]}, your appointment below has been cancelled.
      If this wasn't expected, or you'd like to rebook, please call us on ${BUSINESS.phone}.
    </p>
    ${detailsTable(booking)}
  `;
  return {
    subject: `Booking cancelled — ${formatDateDisplay(booking.booking_date)} — ${BUSINESS.name}`,
    html: layout(body, "Your appointment has been cancelled."),
  };
}
