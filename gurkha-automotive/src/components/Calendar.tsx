"use client";

import { useState } from "react";
import { toIsoDate } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface CalendarProps {
  selectedDate: string | null;
  onSelectDate: (isoDate: string) => void;
  isDayDisabled?: (isoDate: string, dayOfWeek: number) => boolean;
}

export default function Calendar({ selectedDate, onSelectDate, isDayDisabled }: CalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();

  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(maxBookingDate.getDate() + 60); // bookings up to 60 days ahead

  const cells: (Date | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1)),
  ];

  const canGoPrev =
    new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1) >=
    new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="card-panel p-4 sm:p-5">
      <div className="flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => canGoPrev && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          disabled={!canGoPrev}
          className="grid h-8 w-8 place-items-center rounded-sm border border-cream-300 text-steel-600 hover:border-amber-500 hover:text-amber-600 disabled:opacity-30"
          aria-label="Previous month"
        >
          ‹
        </button>
        <span className="font-display text-sm font-semibold uppercase tracking-wide text-asphalt-800">
          {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="grid h-8 w-8 place-items-center rounded-sm border border-cream-300 text-steel-600 hover:border-amber-500 hover:text-amber-600"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className="py-1 text-[11px] font-bold uppercase tracking-wide text-steel-400">
            {d}
          </span>
        ))}

        {cells.map((date, idx) => {
          if (!date) return <span key={`empty-${idx}`} />;

          const iso = toIsoDate(date);
          const dayOfWeek = date.getDay();
          const isPast = date < today;
          const isTooFar = date > maxBookingDate;
          const disabledByRule = isDayDisabled ? isDayDisabled(iso, dayOfWeek) : false;
          const disabled = isPast || isTooFar || disabledByRule;
          const isSelected = selectedDate === iso;
          const isToday = toIsoDate(today) === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(iso)}
              className={[
                "aspect-square rounded-sm text-sm font-semibold transition-colors",
                disabled
                  ? "cursor-not-allowed text-steel-400/40"
                  : "text-asphalt-800 hover:bg-amber-100",
                isSelected ? "!bg-amber-500 text-asphalt-900" : "",
                isToday && !isSelected ? "ring-1 ring-inset ring-amber-500/60" : "",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
