import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveService } from "@/lib/booking-repository";
import { getAvailableDays } from "@/lib/booking-scheduling";

export const runtime = "nodejs";

const querySchema = z.object({
  service_id: z.string().uuid(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(14).default(6),
});

/**
 * The next few dates that still have a free slot for a service, used by
 * the booking assistant to offer one-tap date choices. Returns dates and
 * a slot count only — never booking details.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    service_id: searchParams.get("service_id") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid service_id is required." }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const service = await getActiveService(db, parsed.data.service_id);
    if (!service) {
      return NextResponse.json({ error: "Unknown service." }, { status: 400 });
    }

    const days = await getAvailableDays(db, service.duration_minutes, {
      fromDate: parsed.data.from,
      limit: parsed.data.limit,
    });

    return NextResponse.json(
      { days: days.map((day) => ({ date: day.date, slotCount: day.slots.length })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Could not load available dates." }, { status: 500 });
  }
}
