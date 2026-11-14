import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// ---- mocks: no real database, DNS or email in these tests ----
const inserted: Record<string, unknown>[] = [];
let insertResult: { data: unknown; error: unknown } = { data: null, error: null };
const fakeDb = {
  from: vi.fn(() => ({
    insert: vi.fn((row: Record<string, unknown>) => {
      inserted.push(row);
      return { select: () => ({ single: async () => insertResult }) };
    }),
  })),
};
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => fakeDb }));

const repo = {
  getActiveService: vi.fn(),
  findBookingByRequestId: vi.fn(),
  countUpcomingActiveForContact: vi.fn(),
  recordBookingEvent: vi.fn(),
};
vi.mock("@/lib/booking-repository", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking-repository")>()),
  ...repo,
}));

const checkSlot = vi.fn();
vi.mock("@/lib/booking-scheduling", () => ({ checkSlot: (...args: unknown[]) => checkSlot(...args) }));

const sendBookingReceivedEmails = vi.fn();
vi.mock("@/lib/email", () => ({ sendBookingReceivedEmails: (...args: unknown[]) => sendBookingReceivedEmails(...args) }));

const domainAcceptsMail = vi.fn();
vi.mock("@/lib/validation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/validation")>()),
  domainAcceptsMail: (...args: unknown[]) => domainAcceptsMail(...args),
}));

const { POST } = await import("@/app/api/bookings/route");

const SERVICE = { id: "00000000-0000-4000-8000-000000000003", name: "Brake Inspection & Repair", duration_minutes: 60, is_active: true };
const REQUEST_ID = "33333333-3333-4333-8333-333333333333";

const validBody = {
  service_id: SERVICE.id,
  booking_date: "2030-03-05",
  start_time: "09:30",
  customer_name: "Sam Taylor",
  customer_email: "Sam@Example.com",
  customer_phone: "0412345678",
  vehicle_rego: "abc123",
  vehicle_make: "Toyota",
  vehicle_model: "Corolla",
  vehicle_year: 2018,
  problem_description: "Squeals when braking",
  notes: "",
  client_request_id: REQUEST_ID,
  source: "assistant",
};

function savedRow(row: Record<string, unknown>) {
  return { id: "b1", reference: "GA-7K3QX9", created_at: "", updated_at: "", ...row };
}

function post(body: unknown) {
  return POST(
    new NextRequest("http://localhost/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  inserted.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  repo.getActiveService.mockResolvedValue(SERVICE);
  repo.findBookingByRequestId.mockResolvedValue(null);
  repo.countUpcomingActiveForContact.mockResolvedValue(0);
  checkSlot.mockResolvedValue({ ok: true, startTime: "09:30:00", endTime: "10:30:00" });
  domainAcceptsMail.mockResolvedValue(true);
  sendBookingReceivedEmails.mockResolvedValue({ customer: { sent: true }, garage: { sent: true } });
  insertResult = { data: null, error: null };
  fakeDb.from.mockClear();
});

describe("POST /api/bookings", () => {
  it("saves a valid request as Pending and returns only the customer-facing fields", async () => {
    insertResult = { data: null, error: null };
    fakeDb.from.mockImplementationOnce(() => ({
      insert: vi.fn((row: Record<string, unknown>) => {
        inserted.push(row);
        return { select: () => ({ single: async () => ({ data: savedRow(row), error: null }) }) };
      }),
    }));

    const res = await post(validBody);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.booking).toEqual({
      reference: "GA-7K3QX9",
      status: "pending",
      booking_date: "2030-03-05",
      start_time: "09:30:00",
      end_time: "10:30:00",
      service_name: SERVICE.name,
    });
    expect(json.booking.customer_email).toBeUndefined();

    expect(inserted[0]).toMatchObject({
      status: "pending",
      source: "assistant",
      customer_email: "sam@example.com",
      customer_phone: "0412 345 678",
      vehicle_rego: "ABC123",
      vehicle_year: 2018,
      client_request_id: REQUEST_ID,
      start_time: "09:30:00",
      end_time: "10:30:00",
    });
    expect(checkSlot).toHaveBeenCalledWith(fakeDb, expect.objectContaining({ requireSlotGrid: true, durationMinutes: 60 }));
    expect(sendBookingReceivedEmails).toHaveBeenCalledTimes(1);
    expect(repo.recordBookingEvent).toHaveBeenCalledWith(fakeDb, expect.objectContaining({ event_type: "email_sent" }));
  });

  it.each([
    ["missing name", { customer_name: "" }, "customer_name"],
    ["invalid email", { customer_email: "sam@" }, "customer_email"],
    ["invalid phone", { customer_phone: "555-1234" }, "customer_phone"],
    ["invalid date", { booking_date: "next tuesday" }, "booking_date"],
  ])("rejects %s with a 400 that names the field", async (_label, overrides, field) => {
    const res = await post({ ...validBody, ...overrides });
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe(field);
    expect(inserted).toHaveLength(0);
  });

  it("rejects a malformed body", async () => {
    expect((await post("{not json")).status).toBe(400);
  });

  it("rejects bots that fill the honeypot field", async () => {
    const res = await post({ ...validBody, website: "http://spam.example" });
    expect(res.status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it("rejects an email domain that can't receive mail", async () => {
    domainAcceptsMail.mockResolvedValue(false);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("customer_email");
  });

  it("rejects a service that isn't offered", async () => {
    repo.getActiveService.mockResolvedValue(null);
    const res = await post(validBody);
    expect(res.status).toBe(400);
    expect((await res.json()).field).toBe("service_id");
  });

  it("rejects invalid or unavailable dates using the server's own availability check", async () => {
    checkSlot.mockResolvedValue({ ok: false, reason: "closed", message: "We're closed on that day." });
    let res = await post(validBody);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "We're closed on that day.", field: "booking_date" });

    checkSlot.mockResolvedValue({ ok: false, reason: "taken", message: "That time slot was just taken. Please choose another time." });
    res = await post(validBody);
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("slot_taken");
    expect(inserted).toHaveLength(0);
  });

  it("turns the database's double-booking constraint into a friendly 409 (simultaneous requests)", async () => {
    insertResult = { data: null, error: { code: "23P01", message: "conflicting key value violates exclusion constraint" } };
    const res = await post(validBody);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "slot_taken", field: "start_time" });
    expect(sendBookingReceivedEmails).not.toHaveBeenCalled();
  });

  it("returns the original booking for a duplicate submission instead of creating another", async () => {
    repo.findBookingByRequestId.mockResolvedValue({
      ...savedRow(validBody),
      status: "pending",
      start_time: "09:30:00",
      end_time: "10:30:00",
      service: SERVICE,
    });
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ duplicate: true, booking: { reference: "GA-7K3QX9" } });
    expect(inserted).toHaveLength(0);
    expect(sendBookingReceivedEmails).not.toHaveBeenCalled();
  });

  it("resolves two copies of the same submission racing each other", async () => {
    insertResult = { data: null, error: { code: "23505", message: "duplicate key" } };
    repo.findBookingByRequestId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ ...savedRow(validBody), status: "pending", start_time: "09:30:00", end_time: "10:30:00", service: SERVICE });
    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect((await res.json()).duplicate).toBe(true);
  });

  it("keeps the booking when the emails fail, and records the failure", async () => {
    fakeDb.from.mockImplementationOnce(() => ({
      insert: vi.fn((row: Record<string, unknown>) => ({
        select: () => ({ single: async () => ({ data: savedRow(row), error: null }) }),
      })),
    }));
    sendBookingReceivedEmails.mockResolvedValue({
      customer: { sent: false, error: "Resend is down" },
      garage: { sent: false, error: "Resend is down" },
    });
    const res = await post(validBody);
    expect(res.status).toBe(201);
    expect((await res.json()).acknowledgementEmailSent).toBe(false);
    expect(repo.recordBookingEvent).toHaveBeenCalledWith(
      fakeDb,
      expect.objectContaining({ event_type: "email_failed", detail: expect.stringContaining("Resend is down") })
    );
  });

  it("limits how many open requests one customer can hold", async () => {
    repo.countUpcomingActiveForContact.mockResolvedValue(3);
    const res = await post(validBody);
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("too_many_active");
    expect(inserted).toHaveLength(0);
  });

  it("returns a generic 500 (no internals) when the database fails", async () => {
    const { RepositoryError } = await import("@/lib/booking-repository");
    repo.getActiveService.mockRejectedValue(new RepositoryError("Could not look up that service."));
    const res = await post(validBody);
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/something went wrong/i);
  });
});
