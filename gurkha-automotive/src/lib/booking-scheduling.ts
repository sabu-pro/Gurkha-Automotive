import {
  MAX_BOOKING_DAYS_AHEAD,
  checkRequestedSlot,
  generateAvailableSlots,
  listAvailableDays,
  type AvailableDay,
  type SlotCheck,
} from "@/lib/availability";
import {
  getActiveBookingsBetween,
  getBlockedDatesBetween,
  getBusinessHours,
  type BusyRange,
  type DbClient,
} from "@/lib/booking-repository";
import { addDaysToIsoDate, businessNow, dayOfWeekForIsoDate, isValidIsoDate } from "@/lib/time";

/**
 * Server-side availability, combining the pure rules in
 * src/lib/availability.ts with live data. Always computed on the
 * server from the database — never trusted from the browser.
 */

export async function getSlotsForDate(db: DbClient, durationMinutes: number, date: string): Promise<string[]> {
  const now = businessNow();
  if (!isValidIsoDate(date) || date < now.isoDate || date > addDaysToIsoDate(now.isoDate, MAX_BOOKING_DAYS_AHEAD)) {
    return [];
  }

  const [hours, blocked, bookings] = await Promise.all([
    getBusinessHours(db),
    getBlockedDatesBetween(db, date, date),
    getActiveBookingsBetween(db, date, date),
  ]);
  if (blocked.length > 0) return [];

  return generateAvailableSlots({
    hoursForDay: hours.find((h) => h.day_of_week === dayOfWeekForIsoDate(date)) ?? null,
    serviceDurationMinutes: durationMinutes,
    existingBookings: bookings,
    isToday: date === now.isoDate,
    nowMinutes: now.minutes,
  });
}

/** The next few open days for a service — three queries regardless of how many days are scanned. */
export async function getAvailableDays(
  db: DbClient,
  durationMinutes: number,
  { fromDate, limit }: { fromDate?: string; limit: number }
): Promise<AvailableDay[]> {
  const now = businessNow();
  const start = fromDate && isValidIsoDate(fromDate) && fromDate > now.isoDate ? fromDate : now.isoDate;
  const end = addDaysToIsoDate(now.isoDate, MAX_BOOKING_DAYS_AHEAD);
  if (start > end) return [];

  const [hours, blocked, bookings] = await Promise.all([
    getBusinessHours(db),
    getBlockedDatesBetween(db, start, end),
    getActiveBookingsBetween(db, start, end),
  ]);

  const bookingsByDate = new Map<string, BusyRange[]>();
  for (const booking of bookings) {
    const list = bookingsByDate.get(booking.booking_date) ?? [];
    list.push(booking);
    bookingsByDate.set(booking.booking_date, list);
  }

  return listAvailableDays({
    fromDate: start,
    durationMinutes,
    hoursByDayOfWeek: new Map(hours.map((h) => [h.day_of_week, h])),
    blockedDates: new Set(blocked),
    bookingsByDate,
    today: now.isoDate,
    nowMinutes: now.minutes,
    limit,
  });
}

/** Re-validate a requested slot against live data right before writing. */
export async function checkSlot(
  db: DbClient,
  args: {
    durationMinutes: number;
    date: string;
    startTime: string;
    requireSlotGrid: boolean;
    excludeBookingId?: string;
  }
): Promise<SlotCheck> {
  const now = businessNow();
  if (!isValidIsoDate(args.date)) {
    return { ok: false, reason: "invalid_date", message: "Please choose a valid date." };
  }

  const [hours, blocked, bookings] = await Promise.all([
    getBusinessHours(db),
    getBlockedDatesBetween(db, args.date, args.date),
    getActiveBookingsBetween(db, args.date, args.date),
  ]);

  return checkRequestedSlot({
    date: args.date,
    startTime: args.startTime,
    durationMinutes: args.durationMinutes,
    hoursForDay: hours.find((h) => h.day_of_week === dayOfWeekForIsoDate(args.date)) ?? null,
    isBlocked: blocked.length > 0,
    existingBookings: bookings.filter((b) => b.id !== args.excludeBookingId),
    today: now.isoDate,
    nowMinutes: now.minutes,
    requireSlotGrid: args.requireSlotGrid,
  });
}
