import { createClient } from "@/lib/supabase/server";
import { getContentDefault } from "@/lib/content-defaults";
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
 * Admin-saved text overrides, keyed "section.field".
 *
 * Blank and whitespace-only values are dropped here rather than stored
 * as empty strings, so clearing a box in the admin form restores the
 * code default instead of blanking that part of the page.
 */
export async function getSiteContentMap(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("site_content").select("section, field, value");

  if (error) {
    // Never fatal: the caller falls back to the defaults in
    // src/lib/content-defaults.ts, so the page still renders in full.
    console.error("Failed to load site content, using defaults:", error);
    return {};
  }

  const overrides: Record<string, string> = {};
  for (const row of (data ?? []) as { section: string; field: string; value: string | null }[]) {
    if (typeof row.value === "string" && row.value.trim() !== "") {
      overrides[`${row.section}.${row.field}`] = row.value;
    }
  }
  return overrides;
}

export type ContentResolver = (key: string) => string;

/**
 * Returns a lookup for page copy: content("home.hero_heading").
 * Falls back to the code default when a field is missing or blank.
 */
export async function getSiteContent(): Promise<ContentResolver> {
  const overrides = await getSiteContentMap();
  return (key: string) => overrides[key] ?? getContentDefault(key);
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
