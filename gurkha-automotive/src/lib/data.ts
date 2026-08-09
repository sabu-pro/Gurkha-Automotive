import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

export async function getActiveServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load services:", error);
    return [];
  }
  return data ?? [];
}

/**
 * Every service, active or not — for the admin dashboard only.
 * RLS still applies: the "Admins can view all services" policy means
 * this returns inactive rows for a signed-in admin, and only active
 * ones for anyone else.
 */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load services:", error);
    return [];
  }
  return data ?? [];
}
