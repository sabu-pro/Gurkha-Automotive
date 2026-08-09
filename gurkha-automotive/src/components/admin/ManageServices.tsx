"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createService,
  updateService,
  setServiceActive,
  moveService,
  deleteService,
  type ActionResult,
} from "@/app/admin/dashboard/services/actions";
import { formatCurrencyFromCents } from "@/lib/utils";
import type { Service } from "@/lib/types";

export default function ManageServices({ services }: { services: Service[] }) {
  const router = useRouter();
  // A plain busy flag rather than useTransition: this project is on
  // React 18, where an async callback passed to startTransition drops
  // isPending back to false at the first await — which would re-enable
  // the buttons mid-request and let a double-click fire twice.
  const [isPending, setIsPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    if (isPending) return;
    setIsPending(true);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (result.ok) {
        if (result.message) setNotice(result.message);
        onSuccess?.();
        router.refresh();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel-500">
          {services.length} service{services.length === 1 ? "" : "s"} · the order below is the
          order customers see.
        </p>
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="btn-primary"
        >
          {adding ? "Cancel" : "+ Add Service"}
        </button>
      </div>

      {error && (
        <div className="mb-5 rounded-sm border border-rust-600/30 bg-rust-600/5 p-4 text-sm text-rust-600">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-5 rounded-sm border border-pit-600/30 bg-pit-600/5 p-4 text-sm text-pit-600">
          {notice}
        </div>
      )}

      {adding && (
        <div className="card-panel mb-6 p-6">
          <h2 className="mb-4 font-display text-lg font-bold uppercase tracking-tight text-asphalt-800">
            New Service
          </h2>
          <ServiceForm
            busy={isPending}
            onCancel={() => setAdding(false)}
            onSubmit={(formData) => run(() => createService(formData), () => setAdding(false))}
          />
        </div>
      )}

      {services.length === 0 ? (
        <div className="card-panel p-10 text-center text-sm text-steel-500">
          No services yet. Add your first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service, index) => (
            <div key={service.id} className="card-panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${service.name} up`}
                    disabled={index === 0 || isPending}
                    onClick={() => run(() => moveService(service.id, "up"))}
                    className="rounded-sm border border-cream-300 px-2 py-0.5 text-xs text-steel-500 transition-colors hover:border-amber-500 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${service.name} down`}
                    disabled={index === services.length - 1 || isPending}
                    onClick={() => run(() => moveService(service.id, "down"))}
                    className="rounded-sm border border-cream-300 px-2 py-0.5 text-xs text-steel-500 transition-colors hover:border-amber-500 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold uppercase text-asphalt-800">
                      {service.name}
                    </span>
                    {!service.is_active && (
                      <span className="rounded-sm bg-steel-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-steel-500">
                        Hidden
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-steel-500">
                    {service.description ?? "No description"}
                  </p>
                  <p className="mt-1 font-mono text-xs text-steel-400">
                    ~{service.duration_minutes} min ·{" "}
                    {formatCurrencyFromCents(service.price_from_cents)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      setEditingId(editingId === service.id ? null : service.id);
                      setAdding(false);
                    }}
                    className="btn-secondary !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600"
                  >
                    {editingId === service.id ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => setServiceActive(service.id, !service.is_active))}
                    className="btn-secondary !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600"
                  >
                    {service.is_active ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Permanently delete “${service.name}”? This cannot be undone. If you only want it off the website, use Hide instead.`
                        )
                      )
                        return;
                      run(() => deleteService(service.id));
                    }}
                    className="btn-secondary !border-rust-600/40 !text-rust-600 hover:!border-rust-600 hover:!bg-rust-600/5"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingId === service.id && (
                <div className="border-t border-cream-300 bg-cream-100 p-5">
                  <ServiceForm
                    service={service}
                    busy={isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(formData) =>
                      run(() => updateService(service.id, formData), () => setEditingId(null))
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceForm({
  service,
  busy,
  onSubmit,
  onCancel,
}: {
  service?: Service;
  busy: boolean;
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
}) {
  // Stored as integer cents, but entered and shown in dollars.
  const priceDollars =
    service?.price_from_cents != null ? (service.price_from_cents / 100).toFixed(2) : "";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(new FormData(event.currentTarget));
      }}
      className="grid gap-4 sm:grid-cols-2"
      key={service?.id ?? "new"}
    >
      <div className="sm:col-span-2">
        <label htmlFor={`name-${service?.id ?? "new"}`} className="field-label">
          Service name
        </label>
        <input
          id={`name-${service?.id ?? "new"}`}
          name="name"
          type="text"
          required
          maxLength={120}
          defaultValue={service?.name ?? ""}
          className="field-input"
          placeholder="e.g. Air Conditioning Regas"
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`description-${service?.id ?? "new"}`} className="field-label">
          Description
        </label>
        <textarea
          id={`description-${service?.id ?? "new"}`}
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={service?.description ?? ""}
          className="field-input resize-none"
          placeholder="One or two lines describing the job, shown on the website."
        />
      </div>

      <div>
        <label htmlFor={`duration-${service?.id ?? "new"}`} className="field-label">
          Duration (minutes)
        </label>
        <input
          id={`duration-${service?.id ?? "new"}`}
          name="duration_minutes"
          type="number"
          required
          min={5}
          max={600}
          step={5}
          defaultValue={service?.duration_minutes ?? 45}
          className="field-input"
        />
        <p className="mt-1 text-xs text-steel-400">Used to work out booking slot length.</p>
      </div>

      <div>
        <label htmlFor={`price-${service?.id ?? "new"}`} className="field-label">
          Price from (AUD)
        </label>
        <input
          id={`price-${service?.id ?? "new"}`}
          name="price_from_cents"
          type="text"
          inputMode="decimal"
          defaultValue={priceDollars}
          className="field-input"
          placeholder="Leave blank for “Quote on inspection”"
        />
        <p className="mt-1 text-xs text-steel-400">
          Blank shows “Quote on inspection” on the website.
        </p>
      </div>

      <div className="sm:col-span-2">
        <label className="flex items-center gap-2 text-sm text-asphalt-800">
          <input
            name="is_active"
            type="checkbox"
            defaultChecked={service?.is_active ?? true}
            className="h-4 w-4 accent-amber-500"
          />
          Show this service on the public website
        </label>
      </div>

      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : service ? "Save Changes" : "Add Service"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="btn-secondary !border-steel-400/40 !text-asphalt-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
