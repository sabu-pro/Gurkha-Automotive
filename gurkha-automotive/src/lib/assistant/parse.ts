import { addDaysToIsoDate, dayOfWeekForIsoDate, isValidIsoDate, minutesToTime } from "@/lib/time";
import type { AssistantService, FieldKey } from "@/lib/assistant/types";

/**
 * Rule-based understanding of what customers type. Pure functions, no
 * network, no AI — deliberately forgiving about phrasing and strict
 * about what it accepts.
 */

export function normaliseText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s:/.'@+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}($|[^\\p{L}\\p{N}])`, "u").test(text);
}

// -----------------------------------------------------------------
// Services
// -----------------------------------------------------------------
// Services are admin-editable, so instead of hard-coding names we map
// everyday words to *kinds* of service and match those kinds against
// whatever service names exist in the database.
const SERVICE_FAMILIES: { name: RegExp; words: string[] }[] = [
  {
    name: /brake/i,
    words: ["brake", "brakes", "braking", "squeal", "squealing", "squeak", "squeaking", "grinding", "pedal", "pads", "rotor", "rotors", "stopping"],
  },
  {
    name: /tyre|tire|wheel/i,
    words: ["tyre", "tyres", "tire", "tires", "puncture", "flat tyre", "flat tire", "wheel", "wheels", "alignment", "balancing", "tread"],
  },
  {
    name: /battery/i,
    words: ["battery", "won't start", "wont start", "not starting", "doesn't start", "doesnt start", "jump start", "flat battery", "dead battery"],
  },
  {
    name: /diagnos/i,
    words: [
      "warning light", "engine light", "check engine", "dashboard light", "light on", "light is on", "diagnostic",
      "diagnose", "diagnosis", "fault", "error code", "scan", "noise", "rattle", "rattling", "shaking", "vibration",
      "smoke", "overheating", "leak", "leaking", "strange",
    ],
  },
  {
    name: /inspection|roadworthy|rwc/i,
    words: ["roadworthy", "rwc", "inspection", "inspect", "pre-purchase", "pre purchase", "prepurchase", "safety check", "certificate"],
  },
  {
    name: /service|logbook/i,
    words: ["service", "servicing", "logbook", "log book", "oil", "oil change", "filter", "filters", "tune", "tune up", "maintenance", "check up", "checkup"],
  },
];

/**
 * Services that best match a free-text description. Empty when nothing
 * matches; more than one when the description is genuinely ambiguous.
 */
export function matchServices(text: string, services: AssistantService[]): AssistantService[] {
  const t = normaliseText(text);
  if (!t) return [];

  // The customer typed (most of) a service name.
  const byName = services.filter((s) => hasPhrase(t, normaliseText(s.name)));
  if (byName.length > 0) return byName;

  const hitFamilies = SERVICE_FAMILIES.filter((family) => family.words.some((word) => hasPhrase(t, word)));
  if (hitFamilies.length === 0) return [];

  const scored = services.map((service) => {
    const matched = hitFamilies.filter((family) => family.name.test(service.name));
    return {
      service,
      score: matched.length,
      // Which of the customer's words this service answers.
      reason: matched.map((family) => SERVICE_FAMILIES.indexOf(family)).join(","),
      // How many kinds this service covers: fewer = more specific.
      breadth: SERVICE_FAMILIES.filter((family) => family.name.test(service.name)).length,
    };
  });

  const best = Math.max(...scored.map((s) => s.score));
  if (best === 0) return [];

  const top = scored.filter((s) => s.score === best);
  // Same reason, e.g. "roadworthy" matching both "Vehicle Inspection" and
  // "Brake Inspection & Repair": prefer the more specific service.
  // Different reasons ("brakes" vs "strange noise"): genuinely
  // ambiguous, so offer each of them.
  if (top.every((s) => s.reason === top[0].reason)) {
    const narrowest = Math.min(...top.map((s) => s.breadth));
    return top.filter((s) => s.breadth === narrowest).map((s) => s.service);
  }
  return top.map((s) => s.service);
}

// -----------------------------------------------------------------
// Dates (Australian day-first formats)
// -----------------------------------------------------------------
const WEEKDAYS: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

function isoFrom(year: number, month: number, day: number): string | null {
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return isValidIsoDate(iso) ? iso : null;
}

/** A date with no year means the next time that date comes around. */
function withInferredYear(month: number, day: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const thisYear = isoFrom(year, month, day);
  if (thisYear && thisYear >= today) return thisYear;
  return isoFrom(year + 1, month, day);
}

/** Parses "today", "tomorrow", "friday", "next tue", "28/11", "28 Nov", "November 28", "2026-11-28". */
export function parseDate(text: string, today: string): string | null {
  const t = normaliseText(text);
  if (!t) return null;

  const iso = t.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) return isoFrom(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  if (/\bday after tomorrow\b/.test(t)) return addDaysToIsoDate(today, 2);
  if (/\b(today|tonight)\b/.test(t)) return today;
  if (/\b(tomorrow|tmrw|tmr)\b/.test(t)) return addDaysToIsoDate(today, 1);

  const numeric = t.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2}|\d{4}))?\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    if (numeric[3]) {
      const year = numeric[3].length === 2 ? 2000 + Number(numeric[3]) : Number(numeric[3]);
      return isoFrom(year, month, day);
    }
    return withInferredYear(month, day, today);
  }

  const monthNames = Object.keys(MONTHS).join("|");
  const dayMonth = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthNames})\\b(?:\\s+(\\d{4}))?`));
  const monthDay = t.match(new RegExp(`\\b(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`));
  if (dayMonth || monthDay) {
    const day = Number(dayMonth ? dayMonth[1] : monthDay![2]);
    const month = MONTHS[dayMonth ? dayMonth[2] : monthDay![1]];
    const yearText = dayMonth ? dayMonth[3] : monthDay![3];
    return yearText ? isoFrom(Number(yearText), month, day) : withInferredYear(month, day, today);
  }

  const weekday = t.match(/\b(?:(next|this|coming)\s+)?(sun|sunday|mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/);
  if (weekday) {
    const target = WEEKDAYS[weekday[2]];
    const current = dayOfWeekForIsoDate(today);
    let ahead = (target - current + 7) % 7;
    // "Monday" said on a Monday means next week; "this Monday" means today.
    if (ahead === 0 && weekday[1] !== "this") ahead = 7;
    return addDaysToIsoDate(today, ahead);
  }

  return null;
}

// -----------------------------------------------------------------
// Times
// -----------------------------------------------------------------
export type TimeIntent =
  | { kind: "exact"; time: string }
  | { kind: "period"; period: "morning" | "afternoon" }
  | { kind: "earliest" }
  | { kind: "latest" };

/** Parses "10", "10am", "10:30", "2.30pm", "14:00", "midday", "morning", "earliest". */
export function parseTime(text: string): TimeIntent | null {
  const t = normaliseText(text);
  if (!t) return null;

  const clock = t.match(/(?:^|[^\d])(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.?|p\.m\.?)?(?![\d])/);
  if (clock) {
    let hour = Number(clock[1]);
    const minute = Number(clock[2] ?? 0);
    const suffix = clock[3]?.replace(/\./g, "");
    if (hour <= 23 && minute <= 59 && !(suffix && hour > 12)) {
      if (suffix === "pm" && hour < 12) hour += 12;
      if (suffix === "am" && hour === 12) hour = 0;
      // No am/pm: the workshop is only open in the day, so "3" means 3 pm.
      if (!suffix && hour >= 1 && hour <= 7) hour += 12;
      return { kind: "exact", time: minutesToTime(hour * 60 + minute) };
    }
  }

  if (/\b(earliest|first|asap|soonest|early as possible)\b/.test(t)) return { kind: "earliest" };
  if (/\b(latest|last)\b/.test(t)) return { kind: "latest" };
  if (/\b(noon|midday|lunchtime|lunch time)\b/.test(t)) return { kind: "exact", time: "12:00" };
  if (/\bmorning\b/.test(t)) return { kind: "period", period: "morning" };
  if (/\b(afternoon|arvo)\b/.test(t)) return { kind: "period", period: "afternoon" };
  return null;
}

// -----------------------------------------------------------------
// Intents
// -----------------------------------------------------------------
export type GlobalIntent = "reset" | "back" | "help" | "human";

export function detectGlobalIntent(text: string): GlobalIntent | null {
  const t = normaliseText(text);
  if (/^(start (over|again)|restart|reset|start from (the )?(beginning|scratch)|new booking|clear( all| everything)?)$/.test(t)) return "reset";
  if (/^(back|go back|previous|undo|previous question)$/.test(t)) return "back";
  if (/^(help|\?|what can you do|how does this work|options|menu)$/.test(t)) return "help";
  if (/\b(speak|talk|chat)\b.*\b(someone|person|human|staff|mechanic|real)\b/.test(t) || /^(human|agent|operator|call me|phone number)$/.test(t)) return "human";
  return null;
}

// Order matters: "number plate" must be read as rego before "number" as phone.
const FIELD_WORDS: [FieldKey, RegExp][] = [
  ["email", /\be-?mail\b/],
  ["rego", /\b(rego|registration|plate|number plate)\b/],
  ["phone", /\b(phone|mobile|number|contact)\b/],
  ["name", /\bname\b/],
  ["year", /\byear\b/],
  ["model", /\bmodel\b/],
  ["make", /\b(make|brand|manufacturer)\b/],
  ["service", /\bservice\b/],
  ["problem", /\b(problem|issue|description|symptom)s?\b/],
  ["date", /\b(date|day)\b/],
  ["time", /\b(time|slot)\b/],
  ["comments", /\b(comment|note)s?\b/],
  ["make", /\b(car|vehicle)\b/],
];

/**
 * "change my email", "wrong phone number", "fix the rego" → the field to
 * edit. Only short messages count, and on free-text answers only ones
 * that *start* with an edit verb, so a problem description such as
 * "the engine light comes on at the wrong time" is never misread.
 */
export function detectEditIntent(text: string, { strict }: { strict: boolean }): FieldKey | null {
  const t = normaliseText(text);
  if (t.split(" ").length > 8) return null;

  const startsWithVerb = /^(change|edit|fix|update|correct|amend)\b/.test(t);
  const saysWrong = /\b(wrong|mistake|typo|incorrect)\b/.test(t);
  if (!(startsWithVerb || (!strict && saysWrong))) return null;

  for (const [field, pattern] of FIELD_WORDS) {
    if (pattern.test(t)) return field;
  }
  return null;
}

export function parseYesNo(text: string): boolean | null {
  const t = normaliseText(text);
  if (/^(y|yes|yep|yeah|yup|correct|right|sure|ok|okay|that's right|thats right|confirm|submit|send|send it|looks good|all good|go ahead)\b/.test(t)) return true;
  if (/^(n|no|nope|nah|not quite|wrong)\b/.test(t)) return false;
  return null;
}

export function isUnsure(text: string): boolean {
  return /^(not sure|unsure|don't know|dont know|no idea|idk|dunno|skip|n\/a|na)$/.test(normaliseText(text));
}

// -----------------------------------------------------------------
// Field values
// -----------------------------------------------------------------
const NAME_PATTERN = /^[\p{L}][\p{L}\p{M}'’. -]*$/u;

export function cleanName(text: string): string | null {
  const name = text.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 120 || !NAME_PATTERN.test(name)) return null;
  return name;
}

const UPPERCASE_MAKES: Record<string, string> = {
  bmw: "BMW", mg: "MG", gmc: "GMC", ldv: "LDV", vw: "VW", hsv: "HSV", byd: "BYD", gwm: "GWM", fpv: "FPV",
};

/** "toyota" → "Toyota", "land rover" → "Land Rover", "bmw" → "BMW"; mixed case is left alone. */
export function tidyMake(text: string): string {
  const value = text.trim().replace(/\s+/g, " ");
  if (UPPERCASE_MAKES[value.toLowerCase()]) return UPPERCASE_MAKES[value.toLowerCase()];
  if (value !== value.toLowerCase()) return value;
  return value.replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function cleanVehicleText(text: string): string | null {
  const value = text.trim().replace(/\s+/g, " ");
  if (value.length < 1 || value.length > 60 || /[\u0000-\u001F\u007F<>]/.test(value)) return null;
  return value;
}

export function cleanRego(text: string): string | null {
  const value = text.trim().toUpperCase().replace(/\s+/g, " ");
  if (value.length < 2 || value.length > 10 || !/^[A-Z0-9 -]+$/.test(value)) return null;
  return value;
}

export function parseYear(text: string, currentYear: number): number | "out_of_range" | null {
  const match = text.trim().match(/^(\d{4})$/) ?? normaliseText(text).match(/\b(19\d{2}|20\d{2})\b/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1950 || year > currentYear + 1) return "out_of_range";
  return year;
}

// Deliberately simple: the server does the authoritative check, plus a
// DNS lookup that catches made-up domains.
const EMAIL_PATTERN = /^[^\s@<>()[\],;:"]+@[^\s@<>()[\],;:"]+\.[a-z]{2,}$/i;

export function cleanEmail(text: string): string | null {
  const value = text.trim().toLowerCase();
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return null;
  return value;
}
