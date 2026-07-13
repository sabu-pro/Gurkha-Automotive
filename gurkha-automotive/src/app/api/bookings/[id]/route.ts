import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { bookingUpdateSchema } from "@/lib/validation";
import { sendBookingCancelledEmail, sendBookingConfirmedEmail } from "@/lib/email";
import type { Booking, Database, Service } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { params } = context;
  const { id } = await params;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bookingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid update." }, { status: 400 });
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updatePayload = parsed.data as Database["public"]["Tables"]["bookings"]["Update"];

  const { data: updated, error } = await supabase
    .from("bookings")
    .update(updatePayload)
    .eq("id", id)
    .select("*, service:services(*)")
    .single();

  if (error || !updated) {
    console.error(error);
    return NextResponse.json({ error: "Could not update that booking." }, { status: 500 });
  }

  if (parsed.data.status === "confirmed") {
    try {
      await sendBookingConfirmedEmail(updated);
    } catch (e) {
      console.error("Failed to send confirmation email:", e);
    }
  } else if (parsed.data.status === "cancelled") {
    try {
      await sendBookingCancelledEmail(updated);
    } catch (e) {
      console.error("Failed to send cancellation email:", e);
    }
  }

  return NextResponse.json({ booking: updated });
}
