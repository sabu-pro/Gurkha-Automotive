import { addMinutesToTime, timeToMinutes } from "@/lib/utils";
import type { Booking, BusinessHours } from "@/lib/types";

interface GenerateSlotsArgs {
  hoursForDay: BusinessHours | null;
  serviceDurationMinutes: number;
  existingBookings: Pick<Booking, "start_time" | "end_time">[];
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
  const step = 30; // offer slots every 30 minutes

  const busyRanges = existingBookings.map((b) => ({
    start: timeToMinutes(b.start_time),
    end: timeToMinutes(b.end_time),
  }));

  const slots: string[] = [];

  for (let start = openMinutes; start + serviceDurationMinutes <= closeMinutes; start += step) {
    const end = start + serviceDurationMinutes;

    if (isToday && start <= nowMinutes) continue;

    const overlaps = busyRanges.some((range) => start < range.end && end > range.start);
    if (overlaps) continue;

    const hh = String(Math.floor(start / 60)).padStart(2, "0");
    const mm = String(start % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return slots;
}

export function computeEndTime(startTime: string, durationMinutes: number): string {
  return addMinutesToTime(startTime.length === 5 ? `${startTime}:00` : startTime, durationMinutes);
}
