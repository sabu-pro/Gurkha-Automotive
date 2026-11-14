import { formatAuPhone, isValidAuPhone } from "@/lib/phone";
import { suggestEmailCorrection } from "@/lib/email-suggest";
import { formatDateDisplay, formatTimeDisplay } from "@/lib/utils";
import { daysBetweenIsoDates, isValidIsoDate } from "@/lib/time";
import {
  cleanEmail,
  cleanName,
  cleanRego,
  cleanVehicleText,
  detectEditIntent,
  detectGlobalIntent,
  isUnsure,
  matchServices,
  parseDate,
  parseTime,
  parseYear,
  parseYesNo,
  tidyMake,
} from "@/lib/assistant/parse";
import {
  FIELD_ORDER,
  type AssistantContext,
  type AssistantEvent,
  type AssistantState,
  type BookingDraft,
  type BookingPayload,
  type BotMessage,
  type Effect,
  type FieldKey,
  type QuickReply,
  type Step,
  type StepResult,
  type SummaryRow,
} from "@/lib/assistant/types";

// =================================================================
// Booking assistant conversation engine (deterministic, rule-based).
//
// IMPORTANT WORDING RULE: the assistant only ever collects a booking
// *request*. Nothing here may tell a customer an appointment is
// "confirmed" — only staff can confirm, from the admin dashboard.
// =================================================================

const MAX_TEXT_LENGTH = 1000;
const REQUIRED_FIELDS: FieldKey[] = ["service", "problem", "make", "model", "rego", "date", "time", "name", "phone", "email"];
const POPULAR_MAKES = ["Toyota", "Mazda", "Hyundai", "Ford", "Kia", "Mitsubishi", "Nissan", "Holden"];

// Special quick-reply values.
const KEEP = "__keep__";
const UNSURE = "__unsure__";
const NONE = "__none__";
const ROUTINE = "__routine__";
const USE_HINT = "__hint__";
const OTHER_DATE = "__other_date__";
const USE_SUGGESTION = "__suggested__";
const KEEP_ORIGINAL = "__original__";

const FIELD_LABELS: Record<FieldKey, string> = {
  service: "Service",
  problem: "Problem",
  make: "Make",
  model: "Model",
  year: "Year",
  rego: "Registration",
  date: "Date",
  time: "Time",
  name: "Name",
  phone: "Mobile",
  email: "Email",
  comments: "Comments",
};

export function createInitialState(requestId: string): AssistantState {
  return {
    version: 1,
    step: "service",
    draft: {},
    editing: false,
    history: [],
    requestId,
    pending: null,
    days: null,
    slots: null,
    problemHint: null,
    submitted: null,
  };
}

// -----------------------------------------------------------------
// Display helpers
// -----------------------------------------------------------------
export function shortDateLabel(iso: string, today: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const diff = daysBetweenIsoDates(today, iso);
  if (diff === 0) return `Today · ${label}`;
  if (diff === 1) return `Tomorrow · ${label}`;
  return label;
}

function serviceName(ctx: AssistantContext, id: string | undefined): string {
  return ctx.services.find((s) => s.id === id)?.name ?? "—";
}

function fieldDisplay(field: FieldKey, draft: BookingDraft, ctx: AssistantContext): string | null {
  switch (field) {
    case "service":
      return draft.serviceId ? serviceName(ctx, draft.serviceId) : null;
    case "year":
      return draft.year === undefined ? null : draft.year === null ? "Not sure" : String(draft.year);
    case "date":
      return draft.date ? formatDateDisplay(draft.date) : null;
    case "time":
      return draft.time ? formatTimeDisplay(draft.time) : null;
    case "comments":
      return draft.comments === undefined ? null : draft.comments || "None";
    default: {
      const value = draft[field];
      return value ? String(value) : null;
    }
  }
}

export function summaryRows(draft: BookingDraft, ctx: AssistantContext): SummaryRow[] {
  return FIELD_ORDER.map((field) => ({
    field,
    label: FIELD_LABELS[field],
    value: fieldDisplay(field, draft, ctx) ?? "—",
  }));
}

export function missingFields(draft: BookingDraft): FieldKey[] {
  return REQUIRED_FIELDS.filter((field) => {
    if (field === "service") return !draft.serviceId;
    return !draft[field];
  });
}

/** 0–100, for the progress bar. */
export function progressPercent(state: AssistantState): number {
  if (state.step === "done") return 100;
  if (state.step === "summary" || state.step === "submitting") return 95;
  const index = FIELD_ORDER.indexOf(state.step);
  return Math.round((Math.max(index, 0) / FIELD_ORDER.length) * 90);
}

export function buildPayload(state: AssistantState): BookingPayload {
  const d = state.draft;
  return {
    service_id: d.serviceId ?? "",
    booking_date: d.date ?? "",
    start_time: d.time ?? "",
    customer_name: d.name ?? "",
    customer_email: d.email ?? "",
    customer_phone: d.phone ?? "",
    vehicle_rego: d.rego ?? "",
    vehicle_make: d.make ?? "",
    vehicle_model: d.model ?? "",
    vehicle_year: d.year ?? null,
    problem_description: d.problem ?? "",
    notes: d.comments ?? "",
    client_request_id: state.requestId,
    source: "assistant",
  };
}

// -----------------------------------------------------------------
// Result helpers
// -----------------------------------------------------------------
function result(state: AssistantState, messages: BotMessage[] = [], effects: Effect[] = []): StepResult {
  return { state, messages, effects };
}

function say(text: string, extra: Omit<BotMessage, "text"> = {}): BotMessage {
  return { text, ...extra };
}

function sayError(text: string, extra: Omit<BotMessage, "text"> = {}): BotMessage {
  return { text, tone: "error", ...extra };
}

/** Attach quick replies to the last message (only the latest message's buttons are shown). */
function withReplies(messages: BotMessage[], replies: QuickReply[]): BotMessage[] {
  if (messages.length === 0 || replies.length === 0) return messages;
  const last = messages[messages.length - 1];
  return [...messages.slice(0, -1), { ...last, quickReplies: [...(last.quickReplies ?? []), ...replies] }];
}

function keepReply(field: FieldKey, state: AssistantState, ctx: AssistantContext): QuickReply[] {
  const current = fieldDisplay(field, state.draft, ctx);
  if (current === null) return [];
  const short = current.length > 28 ? `${current.slice(0, 27)}…` : current;
  return [{ label: `Keep “${short}”`, event: { type: "choose", value: KEEP } }];
}

// -----------------------------------------------------------------
// Prompts
// -----------------------------------------------------------------
function dayReplies(state: AssistantState, ctx: AssistantContext, exclude?: string): QuickReply[] {
  const days = (state.days?.list ?? []).filter((d) => d.date !== exclude);
  return [
    ...days.map((d) => ({ label: shortDateLabel(d.date, ctx.today), event: { type: "choose", value: d.date } as AssistantEvent })),
    { label: "A different date", event: { type: "choose", value: OTHER_DATE } },
  ];
}

function timeReplies(times: string[]): QuickReply[] {
  return [
    ...times.map((t) => ({ label: formatTimeDisplay(t), event: { type: "choose", value: t } as AssistantEvent })),
    { label: "Choose another date", event: { type: "changeDate" } },
  ];
}

/** Ask the question for the current step (loading availability first where needed). */
function prompt(state: AssistantState, ctx: AssistantContext, lead: BotMessage[] = []): StepResult {
  const keep = keepReply(state.step as FieldKey, state, ctx);

  switch (state.step) {
    case "service": {
      const replies: QuickReply[] = [
        ...ctx.services.map((s) => ({ label: s.name, event: { type: "choose", value: s.id } as AssistantEvent })),
        { label: "Not sure", event: { type: "choose", value: UNSURE } },
      ];
      return result(state, withReplies([...lead, say("What can we help with? Choose a service, or describe the problem in your own words.")], [...keep, ...replies]));
    }
    case "problem": {
      if (state.problemHint && !state.draft.problem) {
        return result(
          state,
          withReplies(
            [...lead, say(`You mentioned: “${state.problemHint}”. Is there anything you'd like to add about the problem?`)],
            [{ label: "That's everything", event: { type: "choose", value: USE_HINT }, variant: "primary" }]
          )
        );
      }
      return result(
        state,
        withReplies(
          [...lead, say("Please describe the problem, or what you'd like done. For example: “squeaking when I brake” or “due for its 60,000 km service”.")],
          [...keep, { label: "Just a routine service", event: { type: "choose", value: ROUTINE } }]
        )
      );
    }
    case "make":
      return result(
        state,
        withReplies(
          [...lead, say("Thanks. What's the make of your vehicle?")],
          [...keep, ...POPULAR_MAKES.map((make) => ({ label: make, event: { type: "choose", value: make } as AssistantEvent }))]
        )
      );
    case "model":
      return result(state, withReplies([...lead, say(`And the model of your ${state.draft.make ?? "vehicle"}? (e.g. Corolla, CX-5, Ranger)`)], keep));
    case "year":
      return result(
        state,
        withReplies([...lead, say("What year was it made?")], [...keep, { label: "Not sure", event: { type: "choose", value: UNSURE } }])
      );
    case "rego":
      return result(state, withReplies([...lead, say("What's the registration number (number plate)?")], keep));
    case "date": {
      const serviceId = state.draft.serviceId!;
      if (!state.days || state.days.serviceId !== serviceId) {
        return result(state, lead, [{ type: "loadDays", serviceId }]);
      }
      if (state.days.list.length === 0) {
        return result(state, [
          ...lead,
          sayError(`Sorry — there are no free times online in the next ${ctx.maxDaysAhead} days for this service. Please call us on ${ctx.businessPhone} and we'll find a time.`),
        ]);
      }
      return result(
        state,
        withReplies(
          [...lead, say("When would you like to bring it in? Here are our next available days — or type a date, like “next Tuesday” or “28/11”.")],
          [...keep, ...dayReplies(state, ctx)]
        )
      );
    }
    case "time": {
      const serviceId = state.draft.serviceId!;
      const date = state.draft.date!;
      if (!state.slots || state.slots.serviceId !== serviceId || state.slots.date !== date) {
        return result(state, lead, [{ type: "loadSlots", serviceId, date }]);
      }
      return result(
        state,
        withReplies(
          [...lead, say(`These times are free on ${formatDateDisplay(date)}. Which suits you?`)],
          [...keep.filter(() => Boolean(state.draft.time && state.slots?.times.includes(state.draft.time))), ...timeReplies(state.slots.times)]
        )
      );
    }
    case "name":
      return result(state, withReplies([...lead, say("Nearly there — just your contact details. What's your full name?")], keep));
    case "phone":
      return result(state, withReplies([...lead, say("What's the best mobile number to reach you on?")], keep));
    case "email":
      return result(state, withReplies([...lead, say("And your email address? We'll send the details of your booking request there.")], keep));
    case "comments":
      return result(
        state,
        withReplies(
          [...lead, say("Anything else we should know before you arrive? For example, whether you'll wait or drop the car off.")],
          [...keep, { label: "No, that's everything", event: { type: "choose", value: NONE } }]
        )
      );
    case "summary":
      return result(state, [
        ...lead,
        say("Here's your booking request. Please check everything is correct.", { summary: summaryRows(state.draft, ctx) }),
        say("When you submit, this goes to our team as a request. It isn't confirmed until our team emails you to confirm.", {
          quickReplies: [
            { label: "Submit booking request", event: { type: "submit" }, variant: "primary" },
            { label: "Change something", event: { type: "editMenu" } },
            { label: "Start over", event: { type: "reset" } },
          ],
        }),
      ]);
    case "submitting":
      return result(state, lead);
    case "done":
      return result(
        state,
        withReplies(
          [...lead, say(`Your booking request ${state.submitted?.reference ?? ""} is with our team. Is there anything else?`.replace("  ", " "))],
          [{ label: "Book another vehicle", event: { type: "confirmReset" } }]
        )
      );
  }
}

function goTo(state: AssistantState, step: Step, ctx: AssistantContext, lead: BotMessage[] = []): StepResult {
  const history = state.step !== step ? [...state.history, state.step].slice(-40) : state.history;
  return prompt({ ...state, step, history, pending: null }, ctx, lead);
}

/** After a field is answered: next question, or back to the summary when editing. */
function afterAnswer(state: AssistantState, field: FieldKey, ctx: AssistantContext, lead: BotMessage[] = []): StepResult {
  if (state.editing) {
    // Times depend on the date and the service's duration, so changing
    // either sends the customer to pick a time again.
    if ((field === "service" || field === "date") && state.draft.date) {
      const note = field === "service" ? [say("Available times depend on the service, so please choose a time again.")] : [];
      return goTo(state, "time", ctx, [...lead, ...note]);
    }
    if (field === "service" && !state.draft.date) return goTo(state, "date", ctx, lead);
    if (missingFields(state.draft).length > 0) {
      return goTo(state, missingFields(state.draft)[0], ctx, lead);
    }
    // Jumped ahead with "change …" before reaching the last question.
    if (state.draft.comments === undefined && field !== "comments") return goTo(state, "comments", ctx, lead);
    return goTo({ ...state, editing: false }, "summary", ctx, lead);
  }

  const next = FIELD_ORDER[FIELD_ORDER.indexOf(field) + 1];
  return goTo(state, next ?? "summary", ctx, lead);
}

function setDraft(state: AssistantState, patch: Partial<BookingDraft>): AssistantState {
  const draft = { ...state.draft, ...patch };
  let { days, slots } = state;
  if ("serviceId" in patch && patch.serviceId !== state.draft.serviceId) {
    // A different service has a different duration: earlier availability no longer applies.
    delete draft.time;
    days = null;
    slots = null;
  }
  if ("date" in patch && patch.date !== state.draft.date) {
    delete draft.time;
  }
  return { ...state, draft, days, slots, pending: null };
}

// -----------------------------------------------------------------
// Answer handling, per step
// -----------------------------------------------------------------
interface Answer {
  text?: string;
  value?: string;
}

function answer(state: AssistantState, input: Answer, ctx: AssistantContext, allowAi = true): StepResult {
  const step = state.step;
  const text = input.text?.trim() ?? "";

  if (input.value === KEEP && step !== "summary" && step !== "submitting" && step !== "done") {
    return afterAnswer(state, step, ctx);
  }

  switch (step) {
    case "service":
      return answerService(state, input, ctx, allowAi);

    case "problem": {
      if (input.value === USE_HINT && state.problemHint) {
        return afterAnswer(setDraft(state, { problem: state.problemHint }), "problem", ctx);
      }
      if (input.value === ROUTINE) {
        return afterAnswer(setDraft(state, { problem: "Routine service — no specific problems reported." }), "problem", ctx);
      }
      if (text.length < 3) return prompt(state, ctx, [sayError("Could you tell me a little more about the problem?")]);
      const problem = state.problemHint && !state.draft.problem && text !== state.problemHint ? `${state.problemHint}\n${text}` : text;
      return afterAnswer(setDraft(state, { problem: problem.slice(0, MAX_TEXT_LENGTH) }), "problem", ctx);
    }

    case "make": {
      const make = cleanVehicleText(input.value ?? text);
      if (!make) return prompt(state, ctx, [sayError("Please enter the make, for example Toyota or Ford.")]);
      return afterAnswer(setDraft(state, { make: tidyMake(make) }), "make", ctx);
    }

    case "model": {
      const model = cleanVehicleText(text);
      if (!model) return prompt(state, ctx, [sayError("Please enter the model, for example Corolla.")]);
      return afterAnswer(setDraft(state, { model }), "model", ctx);
    }

    case "year": {
      if (input.value === UNSURE || isUnsure(text)) return afterAnswer(setDraft(state, { year: null }), "year", ctx);
      const year = parseYear(text, ctx.currentYear);
      if (year === "out_of_range") {
        return prompt(state, ctx, [sayError(`Please check the year — it should be between 1950 and ${ctx.currentYear + 1}.`)]);
      }
      if (year === null) return prompt(state, ctx, [sayError("Please enter the year as four digits, like 2018 — or tap “Not sure”.")]);
      return afterAnswer(setDraft(state, { year }), "year", ctx);
    }

    case "rego": {
      const rego = cleanRego(text);
      if (!rego) {
        return prompt(state, ctx, [
          sayError("That doesn't look like a registration number. It should be 2–10 letters and numbers, like ABC123 or 1AB2CD."),
        ]);
      }
      return afterAnswer(setDraft(state, { rego }), "rego", ctx);
    }

    case "date":
      return answerDate(state, input, ctx, allowAi);

    case "time":
      return answerTime(state, input, ctx, allowAi);

    case "name": {
      const name = cleanName(text);
      if (!name) return prompt(state, ctx, [sayError("Please enter your name using letters only, e.g. Sam Taylor.")]);
      return afterAnswer(setDraft(state, { name }), "name", ctx);
    }

    case "phone": {
      if (!isValidAuPhone(text)) {
        return prompt(state, ctx, [
          sayError("That doesn't look like an Australian phone number. Please enter it like 0412 345 678."),
        ]);
      }
      return afterAnswer(setDraft(state, { phone: formatAuPhone(text) }), "phone", ctx);
    }

    case "email":
      return answerEmail(state, input, ctx);

    case "comments": {
      if (input.value === NONE || /^(no|nope|nothing|none|no thanks|that's all|thats all|that's everything)\.?$/i.test(text)) {
        return afterAnswer(setDraft(state, { comments: "" }), "comments", ctx);
      }
      return afterAnswer(setDraft(state, { comments: text.slice(0, MAX_TEXT_LENGTH) }), "comments", ctx);
    }

    case "summary": {
      const yes = parseYesNo(text);
      if (yes === true) return submit(state, ctx);
      if (yes === false) return editMenu(state);
      return result(state, [
        say("Tap “Submit booking request” to send it, or tell me what to change — for example “change email”.", {
          quickReplies: [
            { label: "Submit booking request", event: { type: "submit" }, variant: "primary" },
            { label: "Change something", event: { type: "editMenu" } },
          ],
        }),
      ]);
    }

    case "submitting":
      return result(state);

    case "done":
      return prompt(state, ctx);
  }
}

function answerService(state: AssistantState, input: Answer, ctx: AssistantContext, allowAi: boolean): StepResult {
  if (input.value === UNSURE) {
    const diagnostic = ctx.services.find((s) => /diagnos/i.test(s.name));
    const hint = diagnostic
      ? `No problem. If there's a warning light, noise or something that doesn't feel right, “${diagnostic.name}” is a good place to start. Otherwise pick the closest option — you can describe the problem next and our team will review it.`
      : "No problem — pick the closest option. You can describe the problem next and our team will review it.";
    return prompt(state, ctx, [say(hint)]);
  }

  const chosen = input.value ? ctx.services.find((s) => s.id === input.value) : undefined;
  if (chosen) {
    return afterAnswer(setDraft(state, { serviceId: chosen.id }), "service", ctx, [say(`Great — ${chosen.name}.`)]);
  }

  const text = input.text?.trim() ?? "";
  const pool =
    state.pending?.kind === "serviceChoice"
      ? ctx.services.filter((s) => (state.pending as { serviceIds: string[] }).serviceIds.includes(s.id))
      : ctx.services;
  let matches = matchServices(text, pool);
  if (matches.length === 0 && pool !== ctx.services) matches = matchServices(text, ctx.services);

  if (matches.length === 1) {
    const service = matches[0];
    // A descriptive message ("my brakes squeal when I stop") doubles as
    // the problem description — offer it instead of asking again.
    const descriptive = text.split(/\s+/).length >= 3 && text.toLowerCase() !== service.name.toLowerCase();
    const next = setDraft({ ...state, problemHint: descriptive ? text.slice(0, MAX_TEXT_LENGTH) : state.problemHint }, { serviceId: service.id });
    return afterAnswer(next, "service", ctx, [say(`That sounds like ${service.name}.`)]);
  }

  if (matches.length > 1) {
    return result(
      {
        ...state,
        pending: { kind: "serviceChoice", serviceIds: matches.map((s) => s.id) },
        problemHint: text.split(/\s+/).length >= 3 ? text.slice(0, MAX_TEXT_LENGTH) : state.problemHint,
      },
      [
        say("A couple of our services could fit. Which sounds closest?", {
          quickReplies: [
            ...matches.map((s) => ({ label: s.name, event: { type: "choose", value: s.id } as AssistantEvent })),
            { label: "See all services", event: { type: "choose", value: UNSURE } },
          ],
        }),
      ]
    );
  }

  if (allowAi && ctx.aiEnabled && text) {
    return result(state, [], [{ type: "interpret", step: "service", text }]);
  }

  return prompt(state, ctx, [sayError("Sorry, I couldn't match that to one of our services. Please choose the closest option below.")]);
}

function answerDate(state: AssistantState, input: Answer, ctx: AssistantContext, allowAi: boolean): StepResult {
  if (input.value === OTHER_DATE) {
    return result(state, [say("Sure — type the date you'd like, for example “Friday”, “next Tuesday” or “28/11”.")]);
  }

  const text = input.text?.trim() ?? "";
  const iso = input.value && isValidIsoDate(input.value) ? input.value : parseDate(text, ctx.today);

  if (!iso) {
    if (allowAi && ctx.aiEnabled && text) return result(state, [], [{ type: "interpret", step: "date", text }]);
    return prompt(state, ctx, [sayError("Sorry, I didn't catch that date. Try something like “tomorrow”, “Friday” or “28/11”.")]);
  }
  if (iso < ctx.today) {
    return prompt(state, ctx, [sayError(`${formatDateDisplay(iso)} has already passed. Please choose a future date.`)]);
  }
  if (daysBetweenIsoDates(ctx.today, iso) > ctx.maxDaysAhead) {
    return prompt(state, ctx, [
      sayError(`We take online bookings up to ${ctx.maxDaysAhead} days ahead. For ${formatDateDisplay(iso)}, please choose an earlier date or call us on ${ctx.businessPhone}.`),
    ]);
  }

  // Whether the day actually has free times is checked against the
  // server next — never assumed from what the browser has seen.
  return afterAnswer(setDraft(state, { date: iso }), "date", ctx);
}

function answerTime(state: AssistantState, input: Answer, ctx: AssistantContext, allowAi: boolean): StepResult {
  const times = state.slots?.times ?? [];
  const date = state.draft.date!;

  if (input.value && times.includes(input.value)) {
    return afterAnswer(setDraft(state, { time: input.value }), "time", ctx);
  }

  const text = input.text?.trim() ?? "";
  const intent = parseTime(text);

  if (intent?.kind === "earliest" && times.length > 0) return afterAnswer(setDraft(state, { time: times[0] }), "time", ctx);
  if (intent?.kind === "latest" && times.length > 0) return afterAnswer(setDraft(state, { time: times[times.length - 1] }), "time", ctx);

  if (intent?.kind === "exact") {
    if (times.includes(intent.time)) return afterAnswer(setDraft(state, { time: intent.time }), "time", ctx);
    const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const target = toMinutes(intent.time);
    const closest = [...times].sort((a, b) => Math.abs(toMinutes(a) - target) - Math.abs(toMinutes(b) - target)).slice(0, 4).sort();
    if (closest.length === 0) return prompt(state, ctx);
    return result(state, [
      sayError(`${formatTimeDisplay(intent.time)} isn't available on ${formatDateDisplay(date)}. The closest free times are:`, {
        quickReplies: timeReplies(closest),
      }),
    ]);
  }

  if (intent?.kind === "period") {
    const filtered = times.filter((t) => (intent.period === "morning" ? t < "12:00" : t >= "12:00"));
    if (filtered.length === 0) {
      return result(state, [sayError(`There are no ${intent.period} times left on ${formatDateDisplay(date)}. These are free:`, { quickReplies: timeReplies(times) })]);
    }
    return result(state, [say(`Free ${intent.period} times on ${formatDateDisplay(date)}:`, { quickReplies: timeReplies(filtered) })]);
  }

  if (allowAi && ctx.aiEnabled && text) return result(state, [], [{ type: "interpret", step: "time", text }]);
  return result(state, [say("Please pick one of these times, or type one like “10:30am”.", { quickReplies: timeReplies(times) })]);
}

function answerEmail(state: AssistantState, input: Answer, ctx: AssistantContext): StepResult {
  const pending = state.pending?.kind === "emailSuggestion" ? state.pending : null;
  const text = input.text?.trim() ?? "";

  if (pending) {
    const yes = input.value === USE_SUGGESTION ? true : input.value === KEEP_ORIGINAL ? false : parseYesNo(text);
    if (yes === true) return afterAnswer(setDraft(state, { email: pending.suggestion }), "email", ctx);
    if (yes === false) return afterAnswer(setDraft(state, { email: pending.original }), "email", ctx);
    // Anything else is treated as a fresh attempt at the address.
  }

  const email = cleanEmail(text);
  if (!email) {
    return prompt({ ...state, pending: null }, ctx, [
      sayError("That doesn't look like a complete email address — it should look like name@example.com."),
    ]);
  }

  const suggestion = suggestEmailCorrection(email);
  if (suggestion) {
    return result({ ...state, pending: { kind: "emailSuggestion", suggestion, original: email } }, [
      say(`Did you mean ${suggestion}?`, {
        quickReplies: [
          { label: `Yes, use ${suggestion}`, event: { type: "choose", value: USE_SUGGESTION }, variant: "primary" },
          { label: `No, keep ${email}`, event: { type: "choose", value: KEEP_ORIGINAL } },
        ],
      }),
    ]);
  }

  return afterAnswer(setDraft(state, { email }), "email", ctx);
}

// -----------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------
function editMenu(state: AssistantState): StepResult {
  return result(
    { ...state, step: "summary", pending: null },
    [
      say("What would you like to change?", {
        quickReplies: [
          ...FIELD_ORDER.map((field) => ({ label: FIELD_LABELS[field], event: { type: "edit", field } as AssistantEvent })),
          { label: "Nothing — show summary", event: { type: "showSummary" } },
        ],
      }),
    ]
  );
}

function submit(state: AssistantState, ctx: AssistantContext): StepResult {
  const missing = missingFields(state.draft);
  if (missing.length > 0) {
    return goTo({ ...state, editing: true }, missing[0], ctx, [sayError("I still need a couple of details first.")]);
  }
  const next: AssistantState = { ...state, step: "submitting", pending: null };
  return result(next, [], [{ type: "submit", payload: buildPayload(next) }]);
}

function start(state: AssistantState, ctx: AssistantContext): StepResult {
  const hasProgress = Object.keys(state.draft).length > 0 || state.step !== "service";
  if (state.step === "done") return prompt(state, ctx);
  if (hasProgress) {
    const resumed: AssistantState = state.step === "submitting" ? { ...state, step: "summary" } : state;
    return prompt(resumed, ctx, [say("Welcome back — let's pick up where you left off.")]);
  }
  return prompt(state, ctx, [
    say(
      "Hi! I'm the Gurkha Automotive booking assistant. I'll ask a few quick questions and send your booking request to our team, who will confirm it with you by email."
    ),
  ]);
}

function hardReset(ctx: AssistantContext): StepResult {
  return prompt(createInitialState(ctx.createId()), ctx, [say("No problem — let's start a new booking request.")]);
}

// -----------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------
export function reduce(state: AssistantState, event: AssistantEvent, ctx: AssistantContext): StepResult {
  // While a submission is in flight, only its outcome is accepted.
  if (state.step === "submitting" && event.type !== "submitSucceeded" && event.type !== "submitFailed") {
    return result(state);
  }

  switch (event.type) {
    case "start":
      return start(state, ctx);

    case "text": {
      const text = event.text.trim();
      if (!text) return result(state);
      if (text.length > MAX_TEXT_LENGTH) {
        return result(state, [sayError(`That's a bit long — please keep it under ${MAX_TEXT_LENGTH} characters.`)]);
      }

      if (state.pending?.kind === "confirmReset") {
        const yes = parseYesNo(text);
        if (yes === true) return hardReset(ctx);
        if (yes === false) return prompt({ ...state, pending: null }, ctx, [say("OK, let's keep going.")]);
      }

      const intent = detectGlobalIntent(text);
      if (intent === "reset") return reduce(state, { type: "reset" }, ctx);
      if (intent === "back") return reduce(state, { type: "back" }, ctx);
      if (intent === "help") {
        return prompt(state, ctx, [
          say(
            "I'll ask a few short questions about your vehicle and when you'd like to come in, then show you a summary to check before anything is sent. You can type “back” to go to the previous question, “change email” (or any detail) to fix something, or “start over” at any time."
          ),
        ]);
      }
      if (intent === "human") {
        return prompt(state, ctx, [
          say(`You can call our team on ${ctx.businessPhone} during opening hours. I'm also happy to keep going with your booking request here.`),
        ]);
      }

      if (state.step !== "done") {
        const freeText = state.step === "problem" || state.step === "comments";
        const field = detectEditIntent(text, { strict: freeText });
        if (field) return reduce(state, { type: "edit", field }, ctx);
      }

      return answer(state, { text }, ctx);
    }

    case "choose":
      return answer(state, { value: event.value }, ctx);

    case "back": {
      if (state.step === "done") return prompt(state, ctx);
      const previous = state.history[state.history.length - 1];
      if (!previous) return prompt(state, ctx, [say("This is the first question.")]);
      return prompt(
        { ...state, step: previous, history: state.history.slice(0, -1), pending: null, editing: false },
        ctx
      );
    }

    case "reset": {
      if (state.step === "done" || Object.keys(state.draft).length === 0) return hardReset(ctx);
      return result({ ...state, pending: { kind: "confirmReset" } }, [
        say("Start over? This clears the answers you've given so far.", {
          quickReplies: [
            { label: "Yes, start over", event: { type: "confirmReset" } },
            { label: "No, keep going", event: { type: "cancelReset" }, variant: "primary" },
          ],
        }),
      ]);
    }

    case "confirmReset":
      return hardReset(ctx);

    case "cancelReset":
      return prompt({ ...state, pending: null }, ctx, [say("OK, let's keep going.")]);

    case "edit": {
      if (state.step === "done") return prompt(state, ctx);
      if (event.field === "time" && !state.draft.date) return goTo({ ...state, editing: true }, "date", ctx);
      return goTo({ ...state, editing: true }, event.field, ctx);
    }

    case "editMenu":
      return editMenu(state);

    case "showSummary": {
      const missing = missingFields(state.draft);
      if (missing.length > 0) return goTo(state, missing[0], ctx);
      return goTo({ ...state, editing: false }, "summary", ctx);
    }

    case "changeDate": {
      const draft = { ...state.draft };
      delete draft.time;
      return goTo({ ...state, draft }, "date", ctx);
    }

    case "submit":
      if (state.step !== "summary") return prompt(state, ctx);
      return submit(state, ctx);

    case "retryAvailability":
      return prompt({ ...state, days: null, slots: null }, ctx);

    case "daysLoaded": {
      if (state.step !== "date" || event.serviceId !== state.draft.serviceId) return result(state);
      return prompt({ ...state, days: { serviceId: event.serviceId, list: event.days } }, ctx);
    }

    case "slotsLoaded": {
      if (state.step !== "time" || event.serviceId !== state.draft.serviceId || event.date !== state.draft.date) {
        return result(state);
      }
      const withSlots: AssistantState = { ...state, slots: { serviceId: event.serviceId, date: event.date, times: event.times } };
      if (event.times.length > 0) return prompt(withSlots, ctx);

      // No free times that day: back to choosing a date, without it.
      const draft = { ...withSlots.draft };
      delete draft.date;
      delete draft.time;
      const days = withSlots.days
        ? { ...withSlots.days, list: withSlots.days.list.filter((d) => d.date !== event.date) }
        : null;
      const history = withSlots.history[withSlots.history.length - 1] === "date" ? withSlots.history.slice(0, -1) : withSlots.history;
      return prompt({ ...withSlots, draft, days, history, step: "date" }, ctx, [
        sayError(`Sorry — there are no free times on ${formatDateDisplay(event.date)}. We may be closed or fully booked that day.`),
      ]);
    }

    case "availabilityFailed":
      return result(state, [
        sayError(`Sorry, I couldn't check our availability just now. Please try again, or call us on ${ctx.businessPhone}.`, {
          quickReplies: [{ label: "Try again", event: { type: "retryAvailability" }, variant: "primary" }],
        }),
      ]);

    case "submitSucceeded": {
      const firstName = state.draft.name?.split(" ")[0] ?? "";
      const done: AssistantState = { ...state, step: "done", submitted: event.booking, pending: null, editing: false };
      return result(done, [
        say(
          [
            `Thanks${firstName ? `, ${firstName}` : ""}! Your booking request has been sent.`,
            `Reference: ${event.booking.reference}`,
            "Status: Pending — this is a request, not a confirmed appointment yet.",
            `Our team will review it and email ${state.draft.email} once it's confirmed. If the time doesn't work for us, we'll contact you on ${state.draft.phone} to arrange another.`,
          ].join("\n"),
          {
            tone: "success",
            quickReplies: [{ label: "Book another vehicle", event: { type: "confirmReset" } }],
          }
        ),
      ]);
    }

    case "submitFailed": {
      const { failure } = event;
      const summaryState: AssistantState = { ...state, step: "summary" };

      if (failure.kind === "slot_taken") {
        const draft = { ...state.draft };
        delete draft.time;
        return prompt({ ...summaryState, draft, slots: null, editing: true, step: "time" }, ctx, [
          sayError("Sorry — someone has just booked that time. Here are the times still free:"),
        ]);
      }

      if (failure.kind === "invalid" && failure.field) {
        return goTo({ ...summaryState, editing: true }, failure.field, ctx, [sayError(failure.message)]);
      }

      if (failure.kind === "too_many_active" || failure.kind === "invalid") {
        return result(summaryState, [sayError(`${failure.message} You can also call us on ${ctx.businessPhone}.`)]);
      }

      // Network, server or rate-limit trouble: nothing is lost, and
      // retrying reuses the same request id, so it can't double-book.
      return result(summaryState, [
        sayError(
          failure.kind === "rate_limited"
            ? "We've had a lot of requests from your connection. Please wait a minute, then try again."
            : "Sorry, I couldn't send your request just now. Your answers are saved — please try again.",
          {
            quickReplies: [
              { label: "Try again", event: { type: "submit" }, variant: "primary" },
              { label: "Change something", event: { type: "editMenu" } },
            ],
          }
        ),
      ]);
    }

    case "interpreted": {
      if (event.step !== state.step) return result(state);
      const r = event.result;
      if (event.step === "service" && r?.serviceId && ctx.services.some((s) => s.id === r.serviceId)) {
        return answer(state, { value: r.serviceId }, ctx, false);
      }
      if (event.step === "date" && r?.date && isValidIsoDate(r.date)) {
        return answer(state, { value: r.date }, ctx, false);
      }
      if (event.step === "time" && r?.time && state.slots?.times.includes(r.time)) {
        return answer(state, { value: r.time }, ctx, false);
      }
      // Fall back to the rule-based answer (which explains the options).
      return answer(state, { text: event.text }, ctx, false);
    }
  }
}

/** Map an API error field name onto the question that asks for it. */
export function fieldFromServer(field: string | undefined): FieldKey | undefined {
  const map: Record<string, FieldKey> = {
    service_id: "service",
    booking_date: "date",
    start_time: "time",
    customer_name: "name",
    customer_email: "email",
    customer_phone: "phone",
    vehicle_rego: "rego",
    vehicle_make: "make",
    vehicle_model: "model",
    vehicle_year: "year",
    problem_description: "problem",
    notes: "comments",
  };
  return field ? map[field] : undefined;
}
