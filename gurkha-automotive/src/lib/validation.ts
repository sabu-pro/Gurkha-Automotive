import { z } from "zod";
import { resolveMx, resolve4 } from "node:dns/promises";
import { isValidAuPhone } from "@/lib/phone";
import { BOOKING_STATUSES } from "@/lib/types";
import { businessNow } from "@/lib/time";

// The phone rules live in a browser-safe module so the chat assistant
// and the booking form validate exactly as the server does.
export { isValidAuPhone } from "@/lib/phone";

// =================================================================
// Text hygiene
// =================================================================
// Values are only ever sent to Postgres as bound parameters (the
// Supabase client never builds SQL strings), and are HTML-escaped
// before going into emails. On top of that we reject invisible
// control characters, which have no business in a name or a rego and
// are a common ingredient in header-injection and spoofing tricks.
const NO_CONTROL_CHARS = /^[^\u0000-\u001F\u007F]*$/;
// Multi-line fields may keep tabs and line breaks.
const NO_CONTROL_CHARS_MULTILINE = /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/;
const CONTROL_CHAR_MESSAGE = "Please remove any unusual characters and try again.";

function singleLine(min: number, max: number, requiredMessage: string, tooLongMessage: string) {
  return z
    .string({ required_error: requiredMessage, invalid_type_error: requiredMessage })
    .trim()
    .min(min, requiredMessage)
    .max(max, tooLongMessage)
    .regex(NO_CONTROL_CHARS, CONTROL_CHAR_MESSAGE);
}

function optionalMultiLine(max: number, tooLongMessage: string) {
  return z
    .string()
    .trim()
    .max(max, tooLongMessage)
    .regex(NO_CONTROL_CHARS_MULTILINE, CONTROL_CHAR_MESSAGE)
    .optional()
    .or(z.literal(""));
}

const phoneSchema = z
  .string({ required_error: "Please enter your phone number." })
  .trim()
  .min(8, "Please enter a valid phone number.")
  .max(20)
  .refine(isValidAuPhone, {
    message: "Please enter a valid Australian phone number (e.g. 04XX XXX XXX).",
  });

export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20)
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || isValidAuPhone(value), {
    message: "Please enter a valid Australian phone number (e.g. 04XX XXX XXX).",
  });

// =================================================================
// Email domain check — MX-record DNS lookup, built into Node.js
// (`node:dns`), no external service, no API key, no per-call cost.
// This proves the domain can receive mail at all (catches typos like
// "gmial.com" or made-up domains) — it does not prove the specific
// mailbox exists. That level of proof needs a verification service
// (paid) or a confirmation email (adds a step), both left out here
// since the goal is zero added cost.
// =================================================================
export async function domainAcceptsMail(email: string, timeoutMs = 3000): Promise<boolean> {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;

  const withTimeout = <T>(promise: Promise<T>): Promise<T> =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        setTimeout(() => reject(new Error("dns-timeout")), timeoutMs);
      }),
    ]);

  try {
    const mxRecords = await withTimeout(resolveMx(domain));
    if (mxRecords.length > 0) return true;
  } catch (err) {
    if (err instanceof Error && err.message === "dns-timeout") {
      // DNS was slow/unreachable — don't block a real customer over that.
      return true;
    }
    // Otherwise fall through and try an A record before giving up.
  }

  try {
    const aRecords = await withTimeout(resolve4(domain));
    return aRecords.length > 0;
  } catch (err) {
    if (err instanceof Error && err.message === "dns-timeout") return true;
    return false; // genuine lookup failure — domain has no mail server
  }
}

export const VEHICLE_YEAR_MIN = 1950;

/** Latest manufacturing year we accept: next year's models go on sale early. */
export function maxVehicleYear(): number {
  return businessNow().year + 1;
}

const isoDateSchema = z
  .string({ required_error: "Please choose a date." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please choose a valid date." });

const timeSchema = z
  .string({ required_error: "Please choose a time." })
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, { message: "Please choose a valid time." });

export const bookingRequestSchema = z.object({
  service_id: z.string({ required_error: "Please choose a service." }).uuid({ message: "Please choose a service." }),
  booking_date: isoDateSchema,
  start_time: timeSchema,
  customer_name: singleLine(2, 120, "Please enter your full name.", "Please shorten your name to 120 characters."),
  customer_email: z
    .string({ required_error: "Please enter your email address." })
    .trim()
    .max(254, "That email address is too long.")
    .email("Please enter a valid email address.")
    .transform((value) => value.toLowerCase()),
  customer_phone: phoneSchema,
  vehicle_rego: singleLine(2, 10, "Please enter the vehicle registration.", "Registration numbers are 10 characters or fewer.")
    .regex(/^[A-Za-z0-9 -]+$/, "Registration can only contain letters, numbers, spaces and dashes.")
    .transform((value) => value.toUpperCase().replace(/\s+/g, " ")),
  vehicle_make: singleLine(1, 60, "Please enter the vehicle make.", "Vehicle make must be 60 characters or fewer."),
  vehicle_model: singleLine(1, 60, "Please enter the vehicle model.", "Vehicle model must be 60 characters or fewer."),
  vehicle_year: z
    .number({ invalid_type_error: "Please enter the year as four digits, e.g. 2018." })
    .int("Please enter the year as four digits, e.g. 2018.")
    .min(VEHICLE_YEAR_MIN, `Please enter a year from ${VEHICLE_YEAR_MIN} onwards.`)
    .refine((year) => year <= maxVehicleYear(), { message: "That year is in the future — please check it." })
    .nullable()
    .optional(),
  problem_description: optionalMultiLine(1000, "Please keep the problem description under 1000 characters."),
  notes: optionalMultiLine(1000, "Please keep your comments under 1000 characters."),
  // Generated by the browser once per booking attempt; a retry with the
  // same id returns the original booking instead of creating another.
  client_request_id: z.string().uuid().optional(),
  source: z.enum(["web_form", "assistant"]).optional(),
  // Honeypot. Real customers never see or fill this; bots that post
  // every field do. The route rejects any non-empty value.
  website: z.string().max(200).optional(),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingUpdateSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    admin_notes: z
      .string()
      .trim()
      .max(2000, "Admin notes must be 2000 characters or fewer.")
      .regex(NO_CONTROL_CHARS_MULTILINE, CONTROL_CHAR_MESSAGE)
      .optional(),
    // Reschedule: both or neither.
    booking_date: isoDateSchema.optional(),
    start_time: timeSchema.optional(),
    // Optional message shown to the customer in the rejection or
    // reschedule email (stored as status_reason).
    customer_message: z
      .string()
      .trim()
      .max(500, "The message to the customer must be 500 characters or fewer.")
      .regex(NO_CONTROL_CHARS_MULTILINE, CONTROL_CHAR_MESSAGE)
      .optional(),
    notify_customer: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Boolean(data.booking_date) === Boolean(data.start_time), {
    message: "Choose both a new date and a new time to reschedule.",
    path: ["start_time"],
  });

export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;

/** The field a Zod error points at, so the UI can jump straight to it. */
export function firstIssue(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0];
  const field = typeof issue?.path[0] === "string" ? issue.path[0] : undefined;
  return { message: issue?.message ?? "Please check your details.", field };
}

// =================================================================
// Services — admin-managed from the dashboard.
// Price is entered in dollars in the UI but stored as integer cents,
// so the schema accepts a dollar string and converts on the way in.
// =================================================================
const priceDollarsSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((value) => !value || /^\d+(\.\d{1,2})?$/.test(value), {
    message: "Enter a price like 120 or 120.50, or leave blank for “Quote on inspection”.",
  })
  .transform((value) => (value ? Math.round(Number(value) * 100) : null));

export const serviceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter a service name.")
    .max(120, "Service name must be 120 characters or fewer."),
  description: z
    .string()
    .trim()
    .max(500, "Description must be 500 characters or fewer.")
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? value : null)),
  duration_minutes: z.coerce
    .number()
    .int("Duration must be a whole number of minutes.")
    .min(5, "Duration must be at least 5 minutes.")
    .max(600, "Duration must be 600 minutes (10 hours) or fewer."),
  price_from_cents: priceDollarsSchema,
  is_active: z.coerce.boolean(),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
