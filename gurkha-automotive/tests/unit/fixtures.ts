import type { AssistantContext, AssistantService } from "@/lib/assistant/types";

/** The six services seeded by supabase/migrations/0003_seed.sql. */
export const SERVICES: AssistantService[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "General Service", description: null, duration_minutes: 60 },
  { id: "00000000-0000-4000-8000-000000000002", name: "Vehicle Inspection", description: null, duration_minutes: 45 },
  { id: "00000000-0000-4000-8000-000000000003", name: "Brake Inspection & Repair", description: null, duration_minutes: 60 },
  { id: "00000000-0000-4000-8000-000000000004", name: "Tyre Change and Fitting", description: null, duration_minutes: 45 },
  { id: "00000000-0000-4000-8000-000000000005", name: "Battery Test & Replacement", description: null, duration_minutes: 30 },
  { id: "00000000-0000-4000-8000-000000000006", name: "Diagnostic Check", description: null, duration_minutes: 45 },
];

export const byName = (name: string) => SERVICES.find((s) => s.name === name)!;

/** Monday 16 November 2026. */
export const TODAY = "2026-11-16";

export function makeContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  let n = 0;
  return {
    services: SERVICES,
    today: TODAY,
    currentYear: 2026,
    aiEnabled: false,
    businessPhone: "0422 960 735",
    maxDaysAhead: 60,
    createId: () => `request-${++n}`,
    ...overrides,
  };
}
