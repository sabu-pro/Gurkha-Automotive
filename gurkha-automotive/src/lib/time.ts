/**
 * Date/time helpers pinned to the workshop's timezone.
 *
 * The server runs in UTC on Vercel, so `new Date().getHours()` there is
 * 10–11 hours behind Melbourne. Anything that decides "is this slot in
 * the past?" or "what is today?" must go through these helpers instead.
 *
 * ISO dates (YYYY-MM-DD) are calendar dates with no timezone; all
 * arithmetic on them is done in UTC so it can never drift by a day.
 */

export const BUSINESS_TIME_ZONE = "Australia/Melbourne";

const formatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export interface BusinessNow {
  /** Today's date in Melbourne, YYYY-MM-DD. */
  isoDate: string;
  /** Minutes since midnight in Melbourne. */
  minutes: number;
  year: number;
}

export function businessNow(at: Date = new Date()): BusinessNow {
  const parts = Object.fromEntries(formatter.formatToParts(at).map((p) => [p.type, p.value]));
  const hour = Number(parts.hour) % 24;
  return {
    isoDate: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + Number(parts.minute),
    year: Number(parts.year),
  };
}

function parseIso(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

export function isValidIsoDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = parseIso(iso);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDaysToIsoDate(iso: string, days: number): string {
  const [y, m, d] = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, matching business_hours.day_of_week. */
export function dayOfWeekForIsoDate(iso: string): number {
  const [y, m, d] = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetweenIsoDates(from: string, to: string): number {
  const [fy, fm, fd] = parseIso(from);
  const [ty, tm, td] = parseIso(to);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** "HH:MM" or "HH:MM:SS" → "HH:MM:SS". */
export function normaliseTime(time: string): string {
  return time.length === 5 ? `${time}:00` : time;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
