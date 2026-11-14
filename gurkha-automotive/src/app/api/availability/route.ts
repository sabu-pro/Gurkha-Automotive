import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveService } from "@/lib/booking-repository";
import { getSlotsForDate } from "@/lib/booking-scheduling";
import { isValidIsoDate } from "@/lib/time";

export const runtime = "nodejs";

/** Free start times for one service on one date. Returns times only — never booking details. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service_id") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!z.string().uuid().safeParse(serviceId).success || !isValidIsoDate(date)) {
    return NextResponse.json({ error: "service_id and date are required." }, { status: 400 });
  }

  try {
    const db = createAdminClient();
    const service = await getActiveService(db, serviceId);
    if (!service) {
      return NextResponse.json({ error: "Unknown service." }, { status: 400 });
    }

    const slots = await getSlotsForDate(db, service.duration_minutes, date);
    return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Could not load available times." }, { status: 500 });
  }
}
