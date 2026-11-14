/**
 * Types for the booking assistant's conversation engine.
 *
 * The engine (flow.ts) is a pure reducer: (state, event) → (state,
 * bot messages, effects). It never fetches anything itself — effects
 * such as "load available days" or "submit the booking" are carried out
 * by the React hook, which feeds the results back in as events. That
 * keeps the whole conversation deterministic and unit-testable, and
 * means it runs entirely in the browser at zero cost.
 */

/** Every answer the assistant collects, in the order it asks for them. */
export const FIELD_ORDER = [
  "service",
  "problem",
  "make",
  "model",
  "year",
  "rego",
  "date",
  "time",
  "name",
  "phone",
  "email",
  "comments",
] as const;

export type FieldKey = (typeof FIELD_ORDER)[number];

export type Step = FieldKey | "summary" | "submitting" | "done";

export interface AssistantService {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
}

export interface AvailableDayOption {
  date: string;
  slotCount: number;
}

export interface BookingDraft {
  serviceId?: string;
  problem?: string;
  make?: string;
  model?: string;
  /** null = customer said they're not sure. */
  year?: number | null;
  rego?: string;
  date?: string;
  /** "HH:MM" */
  time?: string;
  name?: string;
  phone?: string;
  email?: string;
  /** "" = nothing to add. */
  comments?: string;
}

export type PendingQuestion =
  | { kind: "emailSuggestion"; suggestion: string; original: string }
  | { kind: "serviceChoice"; serviceIds: string[] }
  | { kind: "confirmReset" };

export interface AssistantState {
  version: 1;
  step: Step;
  draft: BookingDraft;
  /** True while changing one answer from the summary — return there afterwards. */
  editing: boolean;
  /** Steps visited, for "back". */
  history: Step[];
  /** Idempotency key for this booking attempt; retries reuse it. */
  requestId: string;
  pending: PendingQuestion | null;
  days: { serviceId: string; list: AvailableDayOption[] } | null;
  slots: { serviceId: string; date: string; times: string[] } | null;
  /** Free text the customer gave when choosing a service, offered as the problem description. */
  problemHint: string | null;
  submitted: SubmittedBooking | null;
}

export interface SubmittedBooking {
  reference: string;
  status: string;
  booking_date: string;
  start_time: string;
  service_name: string | null;
}

export type SubmitFailureKind =
  | "slot_taken"
  | "invalid"
  | "rate_limited"
  | "too_many_active"
  | "network"
  | "server";

export interface SubmitFailure {
  kind: SubmitFailureKind;
  message: string;
  field?: FieldKey;
}

/** Structured guess from an optional AI provider. Always re-validated by the engine. */
export interface Interpretation {
  serviceId?: string;
  date?: string;
  time?: string;
}

export type InterpretableStep = "service" | "date" | "time";

export type AssistantEvent =
  | { type: "start" }
  | { type: "text"; text: string }
  | { type: "choose"; value: string }
  | { type: "back" }
  | { type: "reset" }
  | { type: "confirmReset" }
  | { type: "cancelReset" }
  | { type: "edit"; field: FieldKey }
  | { type: "editMenu" }
  | { type: "showSummary" }
  | { type: "changeDate" }
  | { type: "submit" }
  | { type: "retryAvailability" }
  | { type: "daysLoaded"; serviceId: string; days: AvailableDayOption[] }
  | { type: "slotsLoaded"; serviceId: string; date: string; times: string[] }
  | { type: "availabilityFailed" }
  | { type: "submitSucceeded"; booking: SubmittedBooking }
  | { type: "submitFailed"; failure: SubmitFailure }
  | { type: "interpreted"; step: InterpretableStep; text: string; result: Interpretation | null };

export interface BookingPayload {
  service_id: string;
  booking_date: string;
  start_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  vehicle_rego: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | null;
  problem_description: string;
  notes: string;
  client_request_id: string;
  source: "assistant";
}

export type Effect =
  | { type: "loadDays"; serviceId: string }
  | { type: "loadSlots"; serviceId: string; date: string }
  | { type: "submit"; payload: BookingPayload }
  | { type: "interpret"; step: InterpretableStep; text: string };

export interface QuickReply {
  label: string;
  event: AssistantEvent;
  variant?: "primary" | "default";
}

export interface SummaryRow {
  field: FieldKey;
  label: string;
  value: string;
}

export interface BotMessage {
  text: string;
  tone?: "default" | "error" | "success";
  summary?: SummaryRow[];
  quickReplies?: QuickReply[];
}

export interface AssistantContext {
  services: AssistantService[];
  /** Today in the workshop's timezone, YYYY-MM-DD. */
  today: string;
  currentYear: number;
  /** An external AI provider is configured server-side. */
  aiEnabled: boolean;
  businessPhone: string;
  maxDaysAhead: number;
  createId: () => string;
}

export interface StepResult {
  state: AssistantState;
  messages: BotMessage[];
  effects: Effect[];
}
