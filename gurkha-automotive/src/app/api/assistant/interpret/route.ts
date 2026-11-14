import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { listActiveServices } from "@/lib/booking-repository";
import { getAssistantProvider } from "@/lib/assistant/providers";
import { checkRateLimit } from "@/lib/rate-limit";
import { businessNow, isValidIsoDate } from "@/lib/time";
import type { Interpretation } from "@/lib/assistant/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  step: z.enum(["service", "date", "time"]),
  text: z.string().trim().min(1).max(500),
});

/**
 * Optional AI interpretation of a message the rule-based engine didn't
 * understand. Disabled (404) unless AI_PROVIDER names an external
 * provider, so with the default setup this costs nothing and the
 * browser never calls it.
 */
export async function POST(request: NextRequest) {
  const provider = getAssistantProvider();
  if (!provider.usesExternalApi) {
    return NextResponse.json({ error: "AI interpretation is not enabled." }, { status: 404 });
  }

  const { allowed } = await checkRateLimit(request, "assistant-interpret", 20, 60);
  if (!allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    // Services come from the database, never from the browser.
    const services = await listActiveServices(createAdminClient());
    const raw = await provider.interpret({
      step: parsed.data.step,
      text: parsed.data.text,
      today: businessNow().isoDate,
      services: services.map(({ id, name, description }) => ({ id, name, description })),
    });

    // Only pass through well-formed values; the engine re-validates too.
    const interpretation: Interpretation = {};
    if (raw?.serviceId && services.some((s) => s.id === raw.serviceId)) interpretation.serviceId = raw.serviceId;
    if (raw?.date && isValidIsoDate(raw.date)) interpretation.date = raw.date;
    if (raw?.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time)) interpretation.time = raw.time;

    return NextResponse.json({ interpretation: Object.keys(interpretation).length ? interpretation : null });
  } catch (error) {
    console.error(`AI provider "${provider.id}" failed:`, error);
    return NextResponse.json({ interpretation: null });
  }
}
