"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { serviceSchema } from "@/lib/validation";
import type { Service } from "@/lib/types";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Pages that render services and therefore need refreshing after a change.
const SERVICE_PATHS = ["/", "/services", "/book", "/admin/dashboard/services"];

function revalidateServicePages() {
  for (const path of SERVICE_PATHS) revalidatePath(path);
}

/**
 * Every action re-checks the session server-side. The middleware in
 * src/middleware.ts already gates /admin/dashboard/*, but middleware is
 * a routing convenience, not an authorization boundary — a Server
 * Action is its own POST endpoint and must verify on its own.
 *
 * Note these all use the anon-key cookie client, never the service-role
 * client, so Postgres RLS is the final backstop: the anon role has no
 * insert/update/delete policy on public.services at all.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return supabase;
}

function parseServiceForm(formData: FormData) {
  return serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    duration_minutes: formData.get("duration_minutes"),
    price_from_cents: formData.get("price_from_cents"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
  });
}

export async function createService(formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  // Put new services at the end of the list.
  const { data: last } = await supabase
    .from("services")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = ((last as { display_order: number } | null)?.display_order ?? 0) + 10;

  const { error } = await supabase
    .from("services")
    .insert({ ...parsed.data, display_order: nextOrder });

  if (error) return { ok: false, error: error.message };

  revalidateServicePages();
  return { ok: true, message: `“${parsed.data.name}” added.` };
}

export async function updateService(id: string, formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const parsed = parseServiceForm(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { error } = await supabase.from("services").update(parsed.data).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateServicePages();
  return { ok: true, message: `“${parsed.data.name}” saved.` };
}

export async function setServiceActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const { error } = await supabase.from("services").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateServicePages();
  return { ok: true, message: isActive ? "Service shown on the site." : "Service hidden from the site." };
}

/**
 * Swap a service with its neighbour. Reordering by swapping the two
 * display_order values keeps every other row untouched, so two admins
 * editing at once can't cascade a renumber across the whole table.
 */
export async function moveService(id: string, direction: "up" | "down"): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const { data, error: listError } = await supabase
    .from("services")
    .select("id, display_order")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (listError) return { ok: false, error: listError.message };

  const rows = (data ?? []) as Pick<Service, "id" | "display_order">[];
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) return { ok: false, error: "That service no longer exists." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) return { ok: true }; // already at the end

  const current = rows[index];
  const neighbour = rows[swapWith];

  // Equal display_order values (e.g. two rows still at the default 0)
  // would make a straight swap a no-op, so fall back to explicit
  // positions derived from the current list order.
  const currentOrder =
    current.display_order === neighbour.display_order
      ? (index + 1) * 10
      : neighbour.display_order;
  const neighbourOrder =
    current.display_order === neighbour.display_order
      ? (swapWith + 1) * 10
      : current.display_order;

  const { error: e1 } = await supabase
    .from("services")
    .update({ display_order: currentOrder })
    .eq("id", current.id);
  if (e1) return { ok: false, error: e1.message };

  const { error: e2 } = await supabase
    .from("services")
    .update({ display_order: neighbourOrder })
    .eq("id", neighbour.id);
  if (e2) return { ok: false, error: e2.message };

  revalidateServicePages();
  return { ok: true };
}

/**
 * Permanent delete, allowed only when nothing references the service.
 * bookings.service_id is ON DELETE RESTRICT, so deleting a service that
 * has ever been booked would fail at the database level — we check
 * first so the admin gets a plain-English explanation instead of a
 * foreign-key error, and we point them at hiding it instead.
 */
export async function deleteService(id: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const { count, error: countError } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("service_id", id);

  if (countError) return { ok: false, error: countError.message };

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `This service has ${count} booking${count === 1 ? "" : "s"} against it, so it can't be deleted without losing that history. Use “Hide” instead — it disappears from the public site but the bookings stay intact.`,
    };
  }

  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };

  revalidateServicePages();
  return { ok: true, message: "Service deleted." };
}
