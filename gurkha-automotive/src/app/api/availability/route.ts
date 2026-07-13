import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAvailableSlots } from "@/lib/availability";
import { timeToMinutes, todayIsoDate } from "@/lib/utils";
import type { Service } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("service_id");
  const date = searchParams.get("date");

  if (!serviceId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "service_id and date are required." }, { status: 400 });
  }

  if (date < todayIsoDate()) {
    return NextResponse.json({ slots: [] });
  }

  const supabase = createAdminClient();

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("is_active", true)
    .maybeSingle();

  if (serviceError || !service) {
    return NextResponse.json({ error: "Unknown service." }, { status: 400 });
  }

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("blocked_date", date)
    .maybeSingle();

  if (blocked) {
    return NextResponse.json({ slots: [] });
  }

  const dayOfWeek = new Date(date + "T00:00:00").getDay();

  const { data: hours } = await supabase
    .from("business_hours")
    .select("*")
    .eq("day_of_week", dayOfWeek)
    .maybeSingle();

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("booking_date", date)
    .neq("status", "cancelled");

  const now = new Date();
  const isToday = date === todayIsoDate();
  const nowMinutes = timeToMinutes(
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  );

  const slots = generateAvailableSlots({
    hoursForDay: hours ?? null,
    serviceDurationMinutes: service.duration_minutes,
    existingBookings: existingBookings ?? [],
    isToday,
    nowMinutes,
  });

  return NextResponse.json({ slots });
}
