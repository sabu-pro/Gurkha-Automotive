"use client";

import { useMemo, useState } from "react";
import { formatDateDisplay, formatTimeDisplay, todayIsoDate } from "@/lib/utils";
import StatusBadge from "@/components/admin/StatusBadge";
import type { Booking, BookingStatus, Service } from "@/lib/types";

type BookingRow = Booking & { service: Service };

const FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BookingsDashboard({ initialBookings }: { initialBookings: BookingRow[] }) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [filter, setFilter] = useState("today");
  const today = todayIsoDate();

  const filtered = useMemo(() => {
    switch (filter) {
      case "today":
        return bookings.filter((b) => b.booking_date === today);
      case "upcoming":
        return bookings.filter((b) => b.booking_date > today && (b.status === "pending" || b.status === "confirmed"));
      case "pending":
      case "confirmed":
      case "completed":
      case "cancelled":
        return bookings.filter((b) => b.status === filter);
      default:
        return bookings;
    }
  }, [bookings, filter, today]);

  function updateLocalBooking(updated: BookingRow) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "rounded-sm border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
              filter === f.key
                ? "border-amber-500 bg-amber-500 text-asphalt-900"
                : "border-cream-300 bg-white text-steel-600 hover:border-steel-400",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-panel p-10 text-center text-sm text-steel-500">
          No bookings in this view.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <BookingCard key={booking.id} booking={booking} onUpdated={updateLocalBooking} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  onUpdated,
}: {
  booking: BookingRow;
  onUpdated: (b: BookingRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [notesDraft, setNotesDraft] = useState(booking.admin_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patchBooking(patch: { status?: BookingStatus; admin_notes?: string }, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not update booking.");
      onUpdated(result.booking);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update booking.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={booking.status} />
          <span className="font-display text-sm font-semibold uppercase text-asphalt-800">
            {booking.service?.name ?? "Unknown service"}
          </span>
          <span className="font-mono text-xs text-steel-500">
            {formatDateDisplay(booking.booking_date)} · {formatTimeDisplay(booking.start_time)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-asphalt-800">{booking.customer_name}</span>
          <span className="text-steel-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-cream-300 bg-cream-100 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Customer" value={booking.customer_name} />
            <Detail label="Phone" value={booking.customer_phone} />
            <Detail label="Email" value={booking.customer_email} />
            <Detail label="Vehicle" value={`${booking.vehicle_make} ${booking.vehicle_model}`} />
            <Detail label="Registration" value={booking.vehicle_rego} mono />
            <Detail label="Service" value={`${booking.service?.name} (~${booking.service?.duration_minutes} min)`} />
            <Detail label="Date" value={formatDateDisplay(booking.booking_date)} />
            <Detail label="Time" value={`${formatTimeDisplay(booking.start_time)} – ${formatTimeDisplay(booking.end_time)}`} />
          </div>

          {booking.notes && (
            <div className="mt-4">
              <p className="field-label">Customer notes</p>
              <p className="text-sm text-steel-600">{booking.notes}</p>
            </div>
          )}

          <div className="mt-4">
            <label htmlFor={`admin-notes-${booking.id}`} className="field-label">Admin notes</label>
            <textarea
              id={`admin-notes-${booking.id}`}
              rows={3}
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              className="field-input resize-none"
              placeholder="Internal notes, parts ordered, follow-ups…"
            />
            <button
              type="button"
              onClick={() => patchBooking({ admin_notes: notesDraft }, "notes")}
              disabled={busy === "notes"}
              className="btn-secondary mt-2 !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600"
            >
              {busy === "notes" ? "Saving…" : "Save Notes"}
            </button>
          </div>

          {error && <p className="mt-3 rounded-sm bg-rust/10 px-3 py-2 text-sm text-rust-600">{error}</p>}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-cream-300 pt-4">
            <button
              type="button"
              disabled={busy !== null || booking.status === "confirmed"}
              onClick={() => patchBooking({ status: "confirmed" }, "confirmed")}
              className="btn-dark"
            >
              {busy === "confirmed" ? "Confirming…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={busy !== null || booking.status === "completed"}
              onClick={() => patchBooking({ status: "completed" }, "completed")}
              className="btn-secondary !border-pit !text-pit-600 hover:!bg-pit hover:!text-white"
            >
              {busy === "completed" ? "Updating…" : "Mark Completed"}
            </button>
            <button
              type="button"
              disabled={busy !== null || booking.status === "cancelled"}
              onClick={() => patchBooking({ status: "cancelled" }, "cancelled")}
              className="btn-secondary !border-rust !text-rust-600 hover:!bg-rust hover:!text-white"
            >
              {busy === "cancelled" ? "Cancelling…" : "Cancel Booking"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-steel-400">{label}</p>
      <p className={`text-sm font-semibold text-asphalt-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
