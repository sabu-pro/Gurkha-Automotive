"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveSection,
  resetField,
  type ActionResult,
} from "@/app/admin/dashboard/content/actions";
import { CONTENT_SECTIONS, type ContentSection } from "@/lib/content-defaults";

export default function EditContent({ overrides }: { overrides: Record<string, string> }) {
  return (
    <div className="space-y-8">
      {CONTENT_SECTIONS.map((section) => (
        <SectionForm key={section.section} section={section} overrides={overrides} />
      ))}
    </div>
  );
}

function SectionForm({
  section,
  overrides,
}: {
  section: ContentSection;
  overrides: Record<string, string>;
}) {
  const router = useRouter();
  // Plain busy flag rather than useTransition — this project is on
  // React 18, where an async startTransition callback drops isPending
  // at the first await and would re-enable the button mid-save.
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<ActionResult>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        if (result.message) setNotice(result.message);
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-panel p-6">
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt-800">
          {section.title}
        </h2>
        <p className="mt-1 text-sm text-steel-500">{section.description}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-sm border border-rust-600/30 bg-rust-600/5 p-3 text-sm text-rust-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 rounded-sm border border-pit-600/30 bg-pit-600/5 p-3 text-sm text-pit-600">
          {notice}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          run(() => saveSection(section.section, formData));
        }}
        className="space-y-5"
      >
        {section.fields.map((field) => {
          const key = `${section.section}.${field.field}`;
          const stored = overrides[key];
          const isCustom = stored !== undefined;
          const inputId = `${section.section}-${field.field}`;

          return (
            <div key={field.field}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <label htmlFor={inputId} className="field-label !mb-0">
                  {field.label}
                </label>
                {isCustom && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => resetField(section.section, field.field))}
                    className="text-xs font-semibold text-steel-400 underline underline-offset-2 transition-colors hover:text-pit-600 disabled:opacity-50"
                  >
                    Reset to original
                  </button>
                )}
              </div>

              {field.type === "textarea" ? (
                <textarea
                  id={inputId}
                  name={field.field}
                  rows={field.default.length > 160 ? 5 : 3}
                  maxLength={5000}
                  defaultValue={stored ?? field.default}
                  className="field-input mt-1.5 resize-y"
                />
              ) : (
                <input
                  id={inputId}
                  name={field.field}
                  type="text"
                  maxLength={5000}
                  defaultValue={stored ?? field.default}
                  className="field-input mt-1.5"
                />
              )}

              {field.helper && <p className="mt-1 text-xs text-steel-400">{field.helper}</p>}
            </div>
          );
        })}

        <div className="flex items-center gap-3 border-t border-cream-300 pt-5">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? "Saving…" : `Save ${section.title}`}
          </button>
          <p className="text-xs text-steel-400">
            Clearing a box restores the original wording — a section can never go blank.
          </p>
        </div>
      </form>
    </section>
  );
}
