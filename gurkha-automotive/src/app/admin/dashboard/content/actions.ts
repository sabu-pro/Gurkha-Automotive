"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CONTENT_SECTIONS } from "@/lib/content-defaults";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

// Every public page that renders editable copy.
const CONTENT_PATHS = ["/", "/services", "/about", "/contact", "/admin/dashboard/content"];

function revalidateContentPages() {
  for (const path of CONTENT_PATHS) revalidatePath(path);
}

/**
 * Same pattern as the services actions: middleware gates the route,
 * but a Server Action is its own POST endpoint, so it re-checks the
 * session itself. The anon-key cookie client is used throughout, which
 * leaves Postgres RLS as the real backstop — anon has no write policy
 * on site_content at all.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return supabase;
}

/** Guards against a caller inventing keys that aren't real content fields. */
function isKnownField(section: string, field: string): boolean {
  return CONTENT_SECTIONS.some(
    (s) => s.section === section && s.fields.some((f) => f.field === field)
  );
}

const MAX_VALUE_LENGTH = 5000;

/**
 * Saves one section's fields. A field submitted blank is deleted rather
 * than stored as "", so the page falls back to the code default — this
 * is what makes it impossible to empty a section from the admin UI.
 */
export async function saveSection(section: string, formData: FormData): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  const definition = CONTENT_SECTIONS.find((s) => s.section === section);
  if (!definition) return { ok: false, error: "Unknown page section." };

  const toUpsert: { section: string; field: string; value: string }[] = [];
  const toClear: string[] = [];

  for (const field of definition.fields) {
    const raw = formData.get(field.field);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (value.length > MAX_VALUE_LENGTH) {
      return {
        ok: false,
        error: `“${field.label}” is too long (${value.length} characters, maximum ${MAX_VALUE_LENGTH}).`,
      };
    }

    // Storing the default verbatim would be a pointless row, and would
    // also freeze that wording if the default is ever updated in code.
    if (value === "" || value === field.default) {
      toClear.push(field.field);
    } else {
      toUpsert.push({ section, field: field.field, value });
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("site_content")
      .upsert(toUpsert, { onConflict: "section,field" });
    if (error) return { ok: false, error: error.message };
  }

  if (toClear.length > 0) {
    const { error } = await supabase
      .from("site_content")
      .delete()
      .eq("section", section)
      .in("field", toClear);
    if (error) return { ok: false, error: error.message };
  }

  revalidateContentPages();
  return { ok: true, message: `${definition.title} saved.` };
}

/** Removes the override for one field, restoring the built-in wording. */
export async function resetField(section: string, field: string): Promise<ActionResult> {
  const supabase = await requireAdmin();
  if (!supabase) return { ok: false, error: "You must be signed in to do that." };

  if (!isKnownField(section, field)) return { ok: false, error: "Unknown content field." };

  const { error } = await supabase
    .from("site_content")
    .delete()
    .eq("section", section)
    .eq("field", field);

  if (error) return { ok: false, error: error.message };

  revalidateContentPages();
  return { ok: true, message: "Reset to the original wording." };
}
