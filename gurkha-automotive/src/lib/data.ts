import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

export async function getActiveServices(): Promise<Service[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to load services:", error);
    return [];
  }
  return data ?? [];
}
