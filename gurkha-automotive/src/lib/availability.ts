import { addMinutesToTime, timeToMinutes } from "@/lib/utils";
import { addDaysToIsoDate, daysBetweenIsoDates, dayOfWeekForIsoDate, isValidIsoDate, minutesToTime, normaliseTime } from "@/lib/time";
import type { Booking, BookingStatus, BusinessHours } from "@/lib/types";

// =================================================================
// Scheduling rules — pure functions, no database access.
// These are the existing rules from the booking form and API, now in
// one place so the form, the chat assistant, admin rescheduling and the
// availability endpoints all agree:
//   * one vehicle at a time (bookings may not overlap),
//   * start times every 30 minutes from opening time,
//   * the whole job must fit inside that day's opening hours,
//   * closed weekdays and blocked dates have no slots,
//   * bookings up to 60 days ahead, never in the past.
// The database's exclusion constraint (migration 0007) is the final
// guarantee against overlaps; these checks give a friendly answer first.
// =================================================================

/** Statuses that occupy a slot. Rejected and cancelled bookings free it up. */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ["pending", "confirmed", "completed"];

export const SLOT_STEP_MINUTES = 30;
export const MAX_BOOKING_DAYS_AHEAD = 60;

type BusyRange = Pick<Booking, "start_time" | "end_time">;

interface GenerateSlotsArgs {
  hoursForDay: BusinessHours | null;
  serviceDurationMinutes: number;
  existingBookings: BusyRange[];
  isToday: boolean;
  nowMinutes: number;
}

/**
 * Generates the list of bookable start times (HH:MM) for a single day,
 * given the garage's opening hours, the selected service's duration,
 * and bookings that already occupy part of the day.
 */
export function generateAvailableSlots({
  hoursForDay,
  serviceDurationMinutes,
  existingBookings,
  isToday,
  nowMinutes,
}: GenerateSlotsArgs): string[] {
  if (!hoursForDay || hoursForDay.is_closed || !hoursForDay.open_time || !hoursForDay.close_time) {
    return [];
  }

  const openMinutes = timeToMinutes(hoursForDay.open_time);
  const closeMinutes = timeToMinutes(hoursForDay.close_time);

  const busyRanges = existingBookings.map((b) => ({
    start: timeToMinutes(b.start_time),
    end: timeToMinutes(b.end_time),
  }));

  const slots: string[] = [];

  for (let start = openMinutes; start + serviceDurationMinutes <= closeMinutes; start += SLOT_STEP_MINUTES) {
    const end = start + serviceDurationMinutes;

    if (isToday && start <= nowMinutes) continue;

    const overlaps = busyRanges.some((range) => start < range.end && end > range.start);
    if (overlaps) continue;

    slots.push(minutesToTime(start));
  }

  return slots;
}

export function computeEndTime(startTime: string, durationMinutes: number): string {
  return addMinutesToTime(normaliseTime(startTime), durationMinutes);
}

export type SlotRejection =
  | "invalid_date"
  | "past"
  | "too_far"
  | "closed"
  | "blocked"
  | "outside_hours"
  | "not_a_slot"
  | "taken";

export type SlotCheck =
  | { ok: true; startTime: string; endTime: string }
  | { ok: false; reason: SlotRejection; message: string };

export interface CheckSlotArgs {
  date: string;
  startTime: string;
  durationMinutes: number;
  hoursForDay: BusinessHours | null;
  isBlocked: boolean;
  /** Active bookings on that date (excluding the booking being moved, if any). */
  existingBookings: BusyRange[];
  today: string;
  nowMinutes: number;
  /** Customers must pick one of the offered 30-minute slots; staff may choose any minute. */
  requireSlotGrid: boolean;
  maxDaysAhead?: number;
}

export function checkRequestedSlot(args: CheckSlotArgs): SlotCheck {
  const { date, durationMinutes, hoursForDay, today, nowMinutes } = args;
  const maxDaysAhead = args.maxDaysAhead ?? MAX_BOOKING_DAYS_AHEAD;

  if (!isValidIsoDate(date)) {
    return { ok: false, reason: "invalid_date", message: "Please choose a valid date." };
  }
  if (date < today) {
    return { ok: false, reason: "past", message: "Please choose a date that isn't in the past." };
  }
  if (daysBetweenIsoDates(today, date) > maxDaysAhead) {
    return {
      ok: false,
      reason: "too_far",
      message: `We take bookings up to ${maxDaysAhead} days ahead. Please choose an earlier date.`,
    };
  }
  if (args.isBlocked) {
    return { ok: false, reason: "blocked", message: "We're closed on that date." };
  }
  if (!hoursForDay || hoursForDay.is_closed || !hoursForDay.open_time || !hoursForDay.close_time) {
    return { ok: false, reason: "closed", message: "We're closed on that day." };
  }

  const startTime = normaliseTime(args.startTime);
  const endTime = computeEndTime(startTime, durationMinutes);
  const start = timeToMinutes(startTime);
  const end = start + durationMinutes;
  const open = timeToMinutes(hoursForDay.open_time);
  const close = timeToMinutes(hoursForDay.close_time);

  if (start < open || end > close) {
    return { ok: false, reason: "outside_hours", message: "That time falls outside our opening hours for that day." };
  }
  if (date === today && start <= nowMinutes) {
    return { ok: false, reason: "past", message: "That time has already passed today. Please choose a later time." };
  }
  if (args.requireSlotGrid && (start - open) % SLOT_STEP_MINUTES !== 0) {
    return { ok: false, reason: "not_a_slot", message: "Please choose one of the available times." };
  }

  const overlaps = args.existingBookings.some(
    (b) => start < timeToMinutes(b.end_time) && end > timeToMinutes(b.start_time)
  );
  if (overlaps) {
    return { ok: false, reason: "taken", message: "That time slot was just taken. Please choose another time." };
  }

  return { ok: true, startTime, endTime };
}

export interface AvailableDay {
  date: string;
  slots: string[];
}

export interface ListAvailableDaysArgs {
  fromDate: string;
  durationMinutes: number;
  hoursByDayOfWeek: Map<number, BusinessHours>;
  blockedDates: Set<string>;
  bookingsByDate: Map<string, BusyRange[]>;
  today: string;
  nowMinutes: number;
  limit: number;
  maxDaysAhead?: number;
}

/** The next `limit` dates (from `fromDate`) that still have at least one free slot. */
export function listAvailableDays(args: ListAvailableDaysArgs): AvailableDay[] {
  const maxDaysAhead = args.maxDaysAhead ?? MAX_BOOKING_DAYS_AHEAD;
  const lastDate = addDaysToIsoDate(args.today, maxDaysAhead);
  const days: AvailableDay[] = [];

  for (let date = args.fromDate < args.today ? args.today : args.fromDate; date <= lastDate; date = addDaysToIsoDate(date, 1)) {
    if (days.length >= args.limit) break;
    if (args.blockedDates.has(date)) continue;

    const slots = generateAvailableSlots({
      hoursForDay: args.hoursByDayOfWeek.get(dayOfWeekForIsoDate(date)) ?? null,
      serviceDurationMinutes: args.durationMinutes,
      existingBookings: args.bookingsByDate.get(date) ?? [],
      isToday: date === args.today,
      nowMinutes: args.nowMinutes,
    });
    if (slots.length > 0) days.push({ date, slots });
  }

  return days;
}
