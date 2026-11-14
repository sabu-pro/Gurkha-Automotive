import type { AssistantService, InterpretableStep, Interpretation } from "@/lib/assistant/types";

/**
 * Optional "understanding" layer for the booking assistant.
 *
 * The conversation itself is always the deterministic engine in
 * src/lib/assistant/flow.ts. A provider is only asked to turn a message
 * the rules couldn't understand (e.g. "sometime the week after next,
 * mornings are best") into a structured guess — a service id, a date or
 * a time. Whatever it returns is re-validated by the engine and checked
 * against live availability on the server, so a provider can never
 * create, confirm or reschedule a booking, and never sees any customer
 * contact details.
 *
 * Providers run server-side only (src/app/api/assistant/interpret), so
 * API keys never reach the browser.
 */
export interface InterpretRequest {
  step: InterpretableStep;
  /** The customer's message, max 500 characters. */
  text: string;
  /** Today in the workshop's timezone, YYYY-MM-DD. */
  today: string;
  /** Active services (public data only). */
  services: Pick<AssistantService, "id" | "name" | "description">[];
}

export interface AssistantProvider {
  /** Matches the AI_PROVIDER environment variable, e.g. "rule-based", "anthropic". */
  readonly id: string;
  /** True when calls leave the server (and may cost money). */
  readonly usesExternalApi: boolean;
  /** Return null when unsure — the engine then falls back to asking again. */
  interpret(request: InterpretRequest): Promise<Interpretation | null>;
}
