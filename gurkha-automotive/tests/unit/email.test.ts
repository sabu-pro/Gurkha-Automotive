import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Booking } from "@/lib/types";

const send = vi.fn();
const getResendClient = vi.fn(() => ({ emails: { send } }));
vi.mock("@/lib/resend", () => ({ getResendClient: () => getResendClient() }));

const { sendBookingConfirmedEmail, sendBookingReceivedEmails } = await import("@/lib/email");
const templates = await import("@/lib/email-templates");

const booking: Booking = {
  id: "b1",
  reference: "GA-7K3QX9",
  service_id: "s1",
  customer_name: "Sam <script>alert(1)</script> Taylor",
  customer_email: "sam@example.com",
  customer_phone: "0412 345 678",
  vehicle_rego: "ABC123",
  vehicle_make: "Toyota",
  vehicle_model: "Corolla",
  vehicle_year: 2018,
  problem_description: "Squeals <b>loudly</b>",
  notes: null,
  booking_date: "2026-11-17",
  start_time: "09:30:00",
  end_time: "10:30:00",
  status: "pending",
  status_reason: null,
  admin_notes: null,
  source: "assistant",
  client_request_id: null,
  created_at: "",
  updated_at: "",
};

beforeEach(() => {
  send.mockReset();
  getResendClient.mockClear();
  vi.stubEnv("GARAGE_NOTIFICATION_EMAIL", "garage@example.com, owner@example.com");
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("email delivery never throws", () => {
  it("reports success", async () => {
    send.mockResolvedValue({ data: { id: "e1" }, error: null });
    await expect(sendBookingConfirmedEmail(booking)).resolves.toEqual({ sent: true });
  });

  it("reports a failure Resend returns (rather than throws)", async () => {
    send.mockResolvedValue({ data: null, error: { message: "Domain not verified", name: "validation_error" } });
    await expect(sendBookingConfirmedEmail(booking)).resolves.toEqual({ sent: false, error: "Domain not verified" });
  });

  it("reports a thrown network error", async () => {
    send.mockRejectedValue(new Error("ECONNRESET"));
    await expect(sendBookingConfirmedEmail(booking)).resolves.toEqual({ sent: false, error: "ECONNRESET" });
  });

  it("reports a missing API key", async () => {
    getResendClient.mockImplementationOnce(() => {
      throw new Error("RESEND_API_KEY is not set.");
    });
    await expect(sendBookingConfirmedEmail(booking)).resolves.toMatchObject({ sent: false });
  });

  it("still emails the customer when the garage inbox isn't configured", async () => {
    vi.stubEnv("GARAGE_NOTIFICATION_EMAIL", "");
    send.mockResolvedValue({ data: { id: "e1" }, error: null });
    const result = await sendBookingReceivedEmails(booking);
    expect(result.customer).toEqual({ sent: true });
    expect(result.garage).toMatchObject({ sent: false, error: "GARAGE_NOTIFICATION_EMAIL is not set." });
  });

  it("sends the garage notification to every configured inbox", async () => {
    send.mockResolvedValue({ data: { id: "e1" }, error: null });
    await sendBookingReceivedEmails(booking);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: ["garage@example.com", "owner@example.com"] }));
  });
});

describe("email content", () => {
  it("acknowledgement includes the reference and says pending, not confirmed", () => {
    const { subject, html } = templates.customerBookingReceivedEmail(booking);
    expect(subject).toContain("GA-7K3QX9");
    expect(html).toContain("GA-7K3QX9");
    expect(html).toMatch(/pending/i);
    expect(html).toContain("not a confirmed appointment");
    expect(html).toContain("2018 Toyota Corolla");
  });

  it("escapes customer-supplied text", () => {
    const { html } = templates.garageNewBookingEmail(booking);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<b>loudly</b>");
  });

  it("reschedule email shows old and new times and the staff message", () => {
    const { html } = templates.customerBookingRescheduledEmail(
      { ...booking, status: "confirmed", booking_date: "2026-11-18", start_time: "13:00:00", status_reason: "Moved to fit parts delivery" },
      { booking_date: "2026-11-17", start_time: "09:30:00" }
    );
    expect(html).toContain("has a new time");
    expect(html).toMatch(/9:30\s?am/i);
    expect(html).toMatch(/1:00\s?pm/i);
    expect(html).toContain("Moved to fit parts delivery");
  });

  it("rejection email includes the reason", () => {
    const { html } = templates.customerBookingRejectedEmail({ ...booking, status: "rejected", status_reason: "We don't service EVs" });
    expect(html).toContain("We don't service EVs".replace("'", "&#39;"));
  });
});
