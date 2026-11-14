import { matchServices, parseDate, parseTime } from "@/lib/assistant/parse";
import type { AssistantProvider } from "@/lib/assistant/providers/types";

/**
 * The default provider: the same free, offline rules the browser uses.
 * Never calls out, never costs anything.
 */
export const ruleBasedProvider: AssistantProvider = {
  id: "rule-based",
  usesExternalApi: false,
  async interpret({ step, text, today, services }) {
    if (step === "service") {
      const matches = matchServices(
        text,
        services.map((s) => ({ ...s, duration_minutes: 0 }))
      );
      return matches.length === 1 ? { serviceId: matches[0].id } : null;
    }
    if (step === "date") {
      const date = parseDate(text, today);
      return date ? { date } : null;
    }
    const time = parseTime(text);
    return time?.kind === "exact" ? { time: time.time } : null;
  },
};
