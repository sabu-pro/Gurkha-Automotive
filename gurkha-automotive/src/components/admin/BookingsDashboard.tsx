"use client";

import { useMemo, useState } from "react";
import BookingCard, { type BookingRow } from "@/components/admin/BookingCard";
import { normaliseAuPhone } from "@/lib/phone";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Cancelled" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

function matchesFilter(booking: BookingRow, filter: FilterKey, today: string): boolean {
  switch (filter) {
    case "today":
      return booking.booking_date === today;
    case "upcoming":
      return booking.booking_date >= today && (booking.status === "pending" || booking.status === "confirmed");
    case "all":
      return true;
    default:
      return booking.status === filter;
  }
}

function matchesSearch(booking: BookingRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  const haystack = [
    booking.reference,
    booking.customer_name,
    booking.customer_email,
    booking.vehicle_rego,
    booking.vehicle_make,
    booking.vehicle_model,
    booking.service?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  if (haystack.includes(q)) return true;
  // Phone numbers: match on digits so "0412 345" finds "0412345678".
  return digits.length >= 3 && normaliseAuPhone(booking.customer_phone).includes(normaliseAuPhone(digits));
}

export default function BookingsDashboard({ initialBookings, today }: { initialBookings: BookingRow[]; today: string }) {
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [filter, setFilter] = useState<FilterKey>("today");
  const [query, setQuery] = useState("");
  const [onDate, setOnDate] = useState("");

  const counts = useMemo(() => {
    const result = {} as Record<FilterKey, number>;
    for (const f of FILTERS) result[f.key] = bookings.filter((b) => matchesFilter(b, f.key, today)).length;
    return result;
  }, [bookings, today]);

  const filtered = useMemo(() => {
    // Searching or picking a date looks across every booking, whatever the status chip says.
    const searching = query.trim() !== "" || onDate !== "";
    return bookings.filter(
      (b) =>
        (searching ? true : matchesFilter(b, filter, today)) &&
        matchesSearch(b, query) &&
        (!onDate || b.booking_date === onDate)
    );
  }, [bookings, filter, query, onDate, today]);

  function updateLocalBooking(updated: BookingRow) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  const searching = query.trim() !== "" || onDate !== "";

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="booking-search" className="field-label">
            Search
          </label>
          <input
            id="booking-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference, name, phone, email, rego, vehicle…"
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="booking-date-filter" className="field-label">
            On date
          </label>
          <div className="flex gap-2">
            <input
              id="booking-date-filter"
              type="date"
              value={onDate}
              onChange={(e) => setOnDate(e.target.value)}
              className="field-input sm:w-44"
            />
            {onDate && (
              <button type="button" onClick={() => setOnDate("")} className="text-xs font-bold uppercase text-steel-500 hover:text-asphalt-800">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={!searching && filter === f.key}
            disabled={searching}
            className={[
              "rounded-sm border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors disabled:opacity-40",
              !searching && filter === f.key
                ? "border-amber-500 bg-amber-500 text-asphalt-900"
                : "border-cream-300 bg-white text-steel-600 hover:border-steel-400",
            ].join(" ")}
          >
            {f.label} <span className="ml-1 font-mono opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {searching && (
        <p className="mb-3 text-xs text-steel-500">
          Showing {filtered.length} matching booking{filtered.length === 1 ? "" : "s"} across all statuses.
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="card-panel p-10 text-center text-sm text-steel-500">No bookings in this view.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking) => (
            <BookingCard key={booking.id} booking={booking} today={today} onUpdated={updateLocalBooking} />
          ))}
        </div>
      )}
    </div>
  );
}
