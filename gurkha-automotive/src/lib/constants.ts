export const BUSINESS = {
  name: "Gurkha Automotive",
  addressLine1: "23 Whitehill Ave",
  addressLine2: "Sunshine North VIC 3020",
  addressCountry: "Australia",
  fullAddress: "23 Whitehill Ave, Sunshine North VIC 3020, Australia",
  phone: "0422 960 735",
  phoneHref: "tel:+61422960735",
  // Placeholder — replace with the real business inbox once available.
  email: "info@gurkhaautomotive.com.au",
} as const;

export type DayHours = {
  day: string;
  open: string | null;
  close: string | null;
};

export const OPENING_HOURS: DayHours[] = [
  { day: "Monday", open: "09:00", close: "17:00" },
  { day: "Tuesday", open: "09:00", close: "17:00" },
  { day: "Wednesday", open: "09:00", close: "17:00" },
  { day: "Thursday", open: "09:00", close: "17:00" },
  { day: "Friday", open: "09:00", close: "17:00" },
  { day: "Saturday", open: "09:00", close: "15:00" },
  { day: "Sunday", open: null, close: null },
];

// 0 = Sunday ... 6 = Saturday, matching JS Date#getDay()
export const WEEKDAY_HOURS: Record<number, { open: string; close: string } | null> = {
  0: null,
  1: { open: "09:00", close: "17:00" },
  2: { open: "09:00", close: "17:00" },
  3: { open: "09:00", close: "17:00" },
  4: { open: "09:00", close: "17:00" },
  5: { open: "09:00", close: "17:00" },
  6: { open: "09:00", close: "15:00" },
};

export const BOOKING_SLOT_MINUTES = 45;
