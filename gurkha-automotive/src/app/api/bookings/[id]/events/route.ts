import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { adminAuthErrorResponse, getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

/** Booking history for the admin dashboard. Admins only (checked here and by RLS). */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session.ok) return adminAuthErrorResponse(session.reason);

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Unknown booking." }, { status: 404 });
  }

  const { data, error } = await session.supabase
    .from("booking_events")
    .select("*")
    .eq("booking_id", id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(200);

  if (error) {
    console.error("Could not load booking history:", error);
    return NextResponse.json({ error: "Could not load the history for this booking." }, { status: 500 });
  }

  return NextResponse.json({ events: data ?? [] });
}
