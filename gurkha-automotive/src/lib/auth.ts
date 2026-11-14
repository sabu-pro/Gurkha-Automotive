import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DbClient } from "@/lib/booking-repository";

/**
 * Admin authorisation for Route Handlers, Server Actions and pages.
 *
 * Being signed in is not enough: the user must also be listed in
 * public.admin_users (checked by the is_admin() database function from
 * migration 0007). The same function guards every admin RLS policy, so
 * this is defence in depth — even if a check here were missed, Postgres
 * would still refuse the read or write.
 *
 * Fails closed: if is_admin() can't be called (e.g. the migration has
 * not been applied yet) the user is treated as not an admin.
 */
export type AdminSession =
  | { ok: true; supabase: DbClient; user: { id: string; email?: string | null } }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export async function getAdminSession(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "unauthenticated" };

  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("is_admin() check failed — has migration 0007 been applied?", error);
    return { ok: false, reason: "forbidden" };
  }
  if (isAdmin !== true) return { ok: false, reason: "forbidden" };

  return { ok: true, supabase, user: { id: user.id, email: user.email } };
}

export function adminAuthErrorResponse(reason: "unauthenticated" | "forbidden"): NextResponse {
  return reason === "unauthenticated"
    ? NextResponse.json({ error: "Please sign in." }, { status: 401 })
    : NextResponse.json({ error: "Your account does not have admin access." }, { status: 403 });
}
