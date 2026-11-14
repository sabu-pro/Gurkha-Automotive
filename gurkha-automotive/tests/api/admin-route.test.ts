import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Booking, Service } from "@/lib/types";

// ---- session: controlled per test ----
type Session =
  | { ok: true; supabase: unknown; user: { id: string; email: string } }
  | { ok: false; reason: "unauthenticated" | "forbidden" };
let session: Session;
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/auth")>()),
  getAdminSession: async () => session,
}));

const checkSlot = vi.fn();
vi.mock("@/lib/booking-scheduling", () => ({ checkSlot: (...args: unknown[]) => checkSlot(...args) }));

const recordBookingEvent = vi.fn();
vi.mock("@/lib/booking-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking-repository")>()),
  recordBookingEvent: (...args: unknown[]) => recordBookingEvent(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ service: "role" }) }));

const emails = {
  sendBookingConfirmedEmail: vi.fn(),
  sendBookingRejectedEmail: vi.fn(),
  sendBookingCancelledEmail: vi.fn(),
  sendBookingRescheduledEmail: vi.fn(),
};
vi.mock("@/lib/email", () => ({
  sendBookingConfirmedEmail: (...a: unknown[]) => emails.sendBookingConfirmedEmail(...a),
  sendBookingRejectedEmail: (...a: unknown[]) => emails.sendBookingRejectedEmail(...a),
  sendBookingCancelledEmail: (...a: unknown[]) => emails.sendBookingCancelledEmail(...a),
  sendBookingRescheduledEmail: (...a: unknown[]) => emails.sendBookingRescheduledEmail(...a),
}));

const { PATCH } = await import("@/app/api/bookings/[id]/route");
const { GET: GET_EVENTS } = await import("@/app/api/bookings/[id]/events/route");

const ID = "44444444-4444-4444-8444-444444444444";
const ADMIN = { id: "11111111-1111-4111-8111-111111111111", email: "owner@gurkha.test" };

const service: Service = {
  id: "s1", name: "General Service", description: null, duration_minutes: 60, price_from_cents: null,
  is_active: true, display_order: 10, created_at: "",
};

function booking(overrides: Partial<Booking> = {}): Booking & { service: Service } {
  return {
    id: ID, reference: "GA-7K3QX9", service_id: "s1", customer_name: "Sam Taylor", customer_email: "sam@example.com",
    customer_phone: "0412 345 678", vehicle_rego: "ABC123", vehicle_make: "Toyota", vehicle_model: "Corolla",
    vehicle_year: 2018, problem_description: null, notes: null, booking_date: "2030-03-05", start_time: "09:30:00",
    end_time: "10:30:00", status: "pending", status_reason: null, admin_notes: null, source: "assistant",
    client_request_id: null, created_at: "", updated_at: "", service, ...overrides,
  };
}

/** A Supabase-like client: one booking row, with updates applied in memory. */
function fakeSupabase(current: ReturnType<typeof booking>, updateError: unknown = null) {
  const updates: Record<string, unknown>[] = [];
  return {
    updates,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: current, error: null }) }) }),
      update: (patch: Record<string, unknown>) => {
        updates.push(patch);
        return {
          eq: () => ({
            select: () => ({
              maybeSingle: async () => (updateError ? { data: null, error: updateError } : { data: { ...current, ...patch }, error: null }),
            }),
          }),
        };
      },
    }),
  };
}

function patch(body: unknown, id = ID) {
  return PATCH(
    new NextRequest(`http://localhost/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const fn of Object.values(emails)) fn.mockResolvedValue({ sent: true });
  checkSlot.mockResolvedValue({ ok: true, startTime: "13:00:00", endTime: "14:00:00" });
});

function signInAsAdmin(current = booking(), updateError: unknown = null) {
  const supabase = fakeSupabase(current, updateError);
  session = { ok: true, supabase, user: ADMIN };
  return supabase;
}

describe("admin access", () => {
  it("rejects anonymous requests", async () => {
    session = { ok: false, reason: "unauthenticated" };
    const res = await patch({ status: "confirmed" });
    expect(res.status).toBe(401);
    expect(emails.sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("rejects signed-in users who aren't admins", async () => {
    session = { ok: false, reason: "forbidden" };
    expect((await patch({ status: "confirmed" })).status).toBe(403);
    const events = await GET_EVENTS(new NextRequest(`http://localhost/api/bookings/${ID}/events`), {
      params: Promise.resolve({ id: ID }),
    });
    expect(events.status).toBe(403);
  });

  it("rejects malformed ids and unknown fields", async () => {
    signInAsAdmin();
    expect((await patch({ status: "confirmed" }, "not-a-uuid")).status).toBe(404);
    expect((await patch({ status: "confirmed", customer_email: "attacker@example.com" })).status).toBe(400);
  });
});

describe("approve / reject / cancel", () => {
  it("approving a pending request confirms it and sends exactly one confirmation email", async () => {
    const supabase = signInAsAdmin();
    const res = await patch({ status: "confirmed" });
    expect(res.status).toBe(200);
    expect(supabase.updates).toEqual([{ status: "confirmed", status_reason: null }]);
    expect(emails.sendBookingConfirmedEmail).toHaveBeenCalledTimes(1);
    expect((await res.json()).email).toEqual({ attempted: true, kind: "confirmed", sent: true });
    expect(recordBookingEvent).toHaveBeenCalledWith(
      { service: "role" },
      expect.objectContaining({ event_type: "email_sent", actor_email: ADMIN.email })
    );
  });

  it("does not re-send a confirmation for an already-confirmed booking", async () => {
    signInAsAdmin(booking({ status: "confirmed" }));
    const res = await patch({ status: "confirmed" });
    expect(res.status).toBe(400);
    expect(emails.sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("rejecting stores the message for the customer and sends the rejection email", async () => {
    const supabase = signInAsAdmin();
    const res = await patch({ status: "rejected", customer_message: "We don't work on electric vehicles." });
    expect(res.status).toBe(200);
    expect(supabase.updates[0]).toEqual({ status: "rejected", status_reason: "We don't work on electric vehicles." });
    expect(emails.sendBookingRejectedEmail).toHaveBeenCalledTimes(1);
    expect(emails.sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("can change a status without emailing the customer", async () => {
    signInAsAdmin();
    const res = await patch({ status: "cancelled", notify_customer: false });
    expect((await res.json()).email).toEqual({ attempted: false, kind: "cancelled" });
    expect(emails.sendBookingCancelledEmail).not.toHaveBeenCalled();
  });

  it("marking completed sends no email", async () => {
    signInAsAdmin(booking({ status: "confirmed" }));
    const res = await patch({ status: "completed" });
    expect((await res.json()).email).toEqual({ attempted: false, kind: undefined });
  });

  it("reports an email failure without undoing the status change", async () => {
    signInAsAdmin();
    emails.sendBookingConfirmedEmail.mockResolvedValue({ sent: false, error: "Resend is down" });
    const res = await patch({ status: "confirmed" });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.booking.status).toBe("confirmed");
    expect(json.email).toEqual({ attempted: true, kind: "confirmed", sent: false, error: "Resend is down" });
    expect(recordBookingEvent).toHaveBeenCalledWith(
      { service: "role" },
      expect.objectContaining({ event_type: "email_failed", detail: expect.stringContaining("Resend is down") })
    );
  });
});

describe("reschedule", () => {
  it("checks the new slot (excluding this booking), moves it and sends one reschedule email", async () => {
    const supabase = signInAsAdmin();
    const res = await patch({ booking_date: "2030-03-06", start_time: "13:00", status: "confirmed", customer_message: "Moved for parts" });
    expect(res.status).toBe(200);
    expect(checkSlot).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ date: "2030-03-06", startTime: "13:00:00", excludeBookingId: ID, requireSlotGrid: false, durationMinutes: 60 })
    );
    expect(supabase.updates[0]).toEqual({
      booking_date: "2030-03-06",
      start_time: "13:00:00",
      end_time: "14:00:00",
      status: "confirmed",
      status_reason: "Moved for parts",
    });
    expect(emails.sendBookingRescheduledEmail).toHaveBeenCalledTimes(1);
    expect(emails.sendBookingRescheduledEmail.mock.calls[0][1]).toMatchObject({ booking_date: "2030-03-05", start_time: "09:30:00" });
    expect(emails.sendBookingConfirmedEmail).not.toHaveBeenCalled();
  });

  it("refuses a slot that's already taken", async () => {
    const supabase = signInAsAdmin();
    checkSlot.mockResolvedValue({ ok: false, reason: "taken", message: "That time slot was just taken." });
    const res = await patch({ booking_date: "2030-03-06", start_time: "13:00" });
    expect(res.status).toBe(409);
    expect(supabase.updates).toHaveLength(0);
  });

  it("refuses a closed day", async () => {
    signInAsAdmin();
    checkSlot.mockResolvedValue({ ok: false, reason: "closed", message: "We're closed on that day." });
    expect((await patch({ booking_date: "2030-03-10", start_time: "10:00" })).status).toBe(400);
  });

  it("surfaces the database constraint if another booking grabs the slot mid-request", async () => {
    signInAsAdmin(booking(), { code: "23P01", message: "exclusion" });
    const res = await patch({ booking_date: "2030-03-06", start_time: "13:00" });
    expect(res.status).toBe(409);
    expect(emails.sendBookingRescheduledEmail).not.toHaveBeenCalled();
  });

  it("needs both a date and a time", async () => {
    signInAsAdmin();
    expect((await patch({ booking_date: "2030-03-06" })).status).toBe(400);
  });
});
