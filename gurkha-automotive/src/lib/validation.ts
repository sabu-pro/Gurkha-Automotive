import { z } from "zod";
import { resolveMx, resolve4 } from "node:dns/promises";

// =================================================================
// Phone number check — Australian mobile/landline shape, no library,
// no API. Pure regex against real AU numbering patterns. This proves
// the number is *structurally* a real, currently-allocated AU number
// (rules out "1234567890" or a mistyped digit count) — it does not
// prove this particular customer owns it. That level of proof needs
// an SMS OTP step, which costs money per message, so it's
// intentionally left out here.
// =================================================================
export function isValidAuPhone(raw: string): boolean {
  const normalized = raw
    .trim()
    .replace(/[\s()-]/g, "")
    .replace(/^\+?61/, "0");

  // Mobile: 04XX XXX XXX (10 digits, starts 04)
  if (/^04\d{8}$/.test(normalized)) return true;
  // Landline: 0[2,3,7,8] XXXX XXXX (10 digits, valid AU area codes)
  if (/^0[2378]\d{8}$/.test(normalized)) return true;

  return false;
}

const phoneSchema = z
  .string()
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

export const bookingRequestSchema = z.object({
  service_id: z.string().uuid({ message: "Please choose a service." }),
  booking_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Please choose a valid date." }),
  start_time: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, { message: "Please choose a valid time." }),
  customer_name: z.string().trim().min(2, "Please enter your full name.").max(120),
  customer_email: z.string().trim().email("Please enter a valid email address."),
  customer_phone: phoneSchema,
  vehicle_rego: z.string().trim().min(2, "Please enter the vehicle registration.").max(20),
  vehicle_make: z.string().trim().min(1, "Please enter the vehicle make.").max(60),
  vehicle_model: z.string().trim().min(1, "Please enter the vehicle model.").max(60),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;

export const bookingUpdateSchema = z.object({
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]).optional(),
  admin_notes: z.string().trim().max(2000).optional(),
});

export type BookingUpdateInput = z.infer<typeof bookingUpdateSchema>;
