import { describe, expect, it } from "vitest";
import { checkRequestedSlot, generateAvailableSlots, listAvailableDays, type CheckSlotArgs } from "@/lib/availability";
import { businessNow } from "@/lib/time";
import { bookingRequestSchema, bookingUpdateSchema } from "@/lib/validation";
import { formatAuPhone, isValidAuPhone } from "@/lib/phone";
import type { BusinessHours } from "@/lib/types";

const weekday: BusinessHours = { id: 2, day_of_week: 1, open_time: "09:00:00", close_time: "17:00:00", is_closed: false };
const sunday: BusinessHours = { id: 1, day_of_week: 0, open_time: null, close_time: null, is_closed: true };

describe("businessNow (Melbourne time, whatever the server's clock)", () => {
  it("rolls over to the next day in Melbourne while it's still the previous day in UTC", () => {
    // 23:30 UTC on Mon 16 Nov = 10:30 AEDT on Tue 17 Nov.
    const now = businessNow(new Date("2026-11-16T23:30:00Z"));
    expect(now.isoDate).toBe("2026-11-17");
    expect(now.minutes).toBe(10 * 60 + 30);
  });

  it("handles winter (AEST, UTC+10)", () => {
    const now = businessNow(new Date("2026-07-01T00:15:00Z"));
    expect(now.isoDate).toBe("2026-07-01");
    expect(now.minutes).toBe(10 * 60 + 15);
  });
});

describe("generateAvailableSlots", () => {
  it("offers 30-minute starts that fit the job inside opening hours and around other bookings", () => {
    const slots = generateAvailableSlots({
      hoursForDay: weekday,
      serviceDurationMinutes: 60,
      existingBookings: [{ start_time: "10:00:00", end_time: "11:00:00" }],
      isToday: false,
      nowMinutes: 0,
    });
    expect(slots).toContain("09:00");
    expect(slots).not.toContain("09:30"); // would overlap 10:00
    expect(slots).not.toContain("10:30");
    expect(slots).toContain("11:00");
    expect(slots.at(-1)).toBe("16:00"); // 16:00–17:00 is the last that fits
  });

  it("hides times that have already passed today", () => {
    const slots = generateAvailableSlots({ hoursForDay: weekday, serviceDurationMinutes: 30, existingBookings: [], isToday: true, nowMinutes: 14 * 60 });
    expect(slots[0]).toBe("14:30");
  });
});

describe("checkRequestedSlot", () => {
  const base: CheckSlotArgs = {
    date: "2026-11-17",
    startTime: "10:00",
    durationMinutes: 60,
    hoursForDay: weekday,
    isBlocked: false,
    existingBookings: [],
    today: "2026-11-16",
    nowMinutes: 9 * 60,
    requireSlotGrid: true,
  };

  it("accepts a free, valid slot and computes the end time", () => {
    expect(checkRequestedSlot(base)).toEqual({ ok: true, startTime: "10:00:00", endTime: "11:00:00" });
  });

  it.each([
    [{ date: "2026-11-15" }, "past"],
    [{ date: "2026-02-30" }, "invalid_date"],
    [{ date: "2027-03-01" }, "too_far"],
    [{ isBlocked: true }, "blocked"],
    [{ hoursForDay: sunday }, "closed"],
    [{ startTime: "16:30" }, "outside_hours"],
    [{ startTime: "08:30" }, "outside_hours"],
    [{ startTime: "10:15" }, "not_a_slot"],
    [{ existingBookings: [{ start_time: "10:30:00", end_time: "11:30:00" }] }, "taken"],
    [{ date: "2026-11-16", startTime: "09:00" }, "past"], // earlier today
  ] as [Partial<CheckSlotArgs>, string][])("%j → %s", (overrides, reason) => {
    const result = checkRequestedSlot({ ...base, ...overrides });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.reason).toBe(reason);
  });

  it("lets staff choose an off-grid time", () => {
    expect(checkRequestedSlot({ ...base, startTime: "10:15", requireSlotGrid: false }).ok).toBe(true);
  });
});

describe("listAvailableDays", () => {
  it("skips closed weekdays, blocked dates and fully-booked days", () => {
    const hours = new Map<number, BusinessHours>([
      [0, sunday],
      ...[1, 2, 3, 4, 5, 6].map((d): [number, BusinessHours] => [d, { ...weekday, id: d + 1, day_of_week: d }]),
    ]);
    const days = listAvailableDays({
      fromDate: "2026-11-20", // Friday
      durationMinutes: 480, // a full 9–5 day
      hoursByDayOfWeek: hours,
      blockedDates: new Set(["2026-11-24"]),
      bookingsByDate: new Map([["2026-11-23", [{ start_time: "12:00:00", end_time: "13:00:00" }]]]),
      today: "2026-11-16",
      nowMinutes: 0,
      limit: 3,
    });
    // Fri 20 ✓, Sat 21 (closes 17:00 here) ✓, Sun 22 closed, Mon 23 booked, Tue 24 blocked, Wed 25 ✓
    expect(days.map((d) => d.date)).toEqual(["2026-11-20", "2026-11-21", "2026-11-25"]);
  });
});

describe("phone numbers", () => {
  it("accepts real AU formats and normalises them", () => {
    expect(isValidAuPhone("0412 345 678")).toBe(true);
    expect(isValidAuPhone("+61 412 345 678")).toBe(true);
    expect(isValidAuPhone("(03) 9123-4567")).toBe(true);
    expect(formatAuPhone("+61412345678")).toBe("0412 345 678");
    expect(formatAuPhone("0391234567")).toBe("03 9123 4567");
  });

  it("rejects wrong lengths and fake numbers", () => {
    expect(isValidAuPhone("1234567890")).toBe(false);
    expect(isValidAuPhone("041234567")).toBe(false);
    expect(isValidAuPhone("0512345678")).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  const valid = {
    service_id: "00000000-0000-4000-8000-000000000001",
    booking_date: "2026-11-17",
    start_time: "09:30",
    customer_name: "Sam Taylor",
    customer_email: "Sam@Example.com",
    customer_phone: "0412 345 678",
    vehicle_rego: "abc 123",
    vehicle_make: "Toyota",
    vehicle_model: "Corolla",
  };

  it("accepts the existing booking form's payload (no new fields) and tidies values", () => {
    const parsed = bookingRequestSchema.parse(valid);
    expect(parsed.customer_email).toBe("sam@example.com");
    expect(parsed.vehicle_rego).toBe("ABC 123");
  });

  it.each([
    ["customer_name", { customer_name: "" }],
    ["customer_name", { customer_name: undefined }],
    ["customer_email", { customer_email: "not-an-email" }],
    ["customer_phone", { customer_phone: "12345" }],
    ["vehicle_rego", { vehicle_rego: "AB<1>" }],
    ["vehicle_year", { vehicle_year: 2099 }],
    ["vehicle_year", { vehicle_year: 1900 }],
    ["booking_date", { booking_date: "17/11/2026" }],
    ["start_time", { start_time: "25:00" }],
    ["customer_name", { customer_name: "Sam\u0000Taylor" }],
    ["vehicle_make", { vehicle_make: "Toyota\r\nBcc: victim@example.com" }],
  ])("rejects a bad %s", (field, overrides) => {
    const result = bookingRequestSchema.safeParse({ ...valid, ...overrides });
    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0].path[0]).toBe(field);
  });

  it("keeps line breaks in the problem description", () => {
    const parsed = bookingRequestSchema.parse({ ...valid, problem_description: "Squeals\nwhen cold" });
    expect(parsed.problem_description).toBe("Squeals\nwhen cold");
  });
});

describe("bookingUpdateSchema", () => {
  it("needs both a date and a time to reschedule", () => {
    expect(bookingUpdateSchema.safeParse({ booking_date: "2026-11-18" }).success).toBe(false);
    expect(bookingUpdateSchema.safeParse({ booking_date: "2026-11-18", start_time: "10:00" }).success).toBe(true);
  });

  it("accepts the new rejected status and refuses unknown fields", () => {
    expect(bookingUpdateSchema.safeParse({ status: "rejected" }).success).toBe(true);
    expect(bookingUpdateSchema.safeParse({ status: "approved" }).success).toBe(false);
    expect(bookingUpdateSchema.safeParse({ status: "confirmed", customer_email: "x@y.z" }).success).toBe(false);
  });
});
