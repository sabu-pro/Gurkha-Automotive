import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listActiveServices } from "@/lib/booking-repository";
import { isExternalAiEnabled } from "@/lib/assistant/providers";
import { MAX_BOOKING_DAYS_AHEAD } from "@/lib/availability";
import { businessNow } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the booking assistant needs to start, fetched only when a
 * visitor opens the chat (never on page load). Public data only.
 */
export async function GET() {
  try {
    const services = await listActiveServices(createAdminClient());
    const now = businessNow();
    return NextResponse.json(
      {
        services,
        today: now.isoDate,
        currentYear: now.year,
        maxDaysAhead: MAX_BOOKING_DAYS_AHEAD,
        aiEnabled: isExternalAiEnabled(),
      },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    return NextResponse.json({ error: "The booking assistant is unavailable right now." }, { status: 503 });
  }
}
