"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import Calendar from "@/components/Calendar";
import { formatDateDisplay, formatTimeDisplay } from "@/lib/utils";
import type { Service } from "@/lib/types";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

export default function BookingForm({ services }: { services: Service[] }) {
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service");

  const [serviceId, setServiceId] = useState<string>(
    preselectedService && services.some((s) => s.id === preselectedService)
      ? preselectedService
      : services[0]?.id ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [serviceId, services]
  );

  useEffect(() => {
    if (!selectedDate || !serviceId) {
      setSlots([]);
      return;
    }

    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    setSelectedTime(null);

    fetch(`/api/availability?service_id=${serviceId}&date=${selectedDate}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load available times.");
        return data.slots as string[];
      })
      .then((result) => {
        if (!cancelled) setSlots(result);
      })
      .catch((err) => {
        if (!cancelled) setSlotsError(err instanceof Error ? err.message : "Could not load available times.");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, serviceId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedDate || !selectedTime || !serviceId) return;

    setStatus("submitting");
    setSubmitError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      service_id: serviceId,
      booking_date: selectedDate,
      start_time: selectedTime,
      customer_name: String(data.get("customer_name") ?? ""),
      customer_email: String(data.get("customer_email") ?? ""),
      customer_phone: String(data.get("customer_phone") ?? ""),
      vehicle_rego: String(data.get("vehicle_rego") ?? ""),
      vehicle_make: String(data.get("vehicle_make") ?? ""),
      vehicle_model: String(data.get("vehicle_model") ?? ""),
      notes: String(data.get("notes") ?? ""),
    };

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Could not submit your booking.");
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Could not submit your booking.");
    }
  }

  if (services.length === 0) {
    return (
      <div className="card-panel p-8 text-center">
        <p className="text-steel-500">
          Online booking is temporarily unavailable. Please call us to book your appointment.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="card-panel border-l-4 !border-l-pit-600 p-8 text-center">
        <h2 className="font-display text-2xl font-semibold uppercase text-asphalt-800">
          Booking request sent
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-steel-500">
          Thanks — your appointment for <strong>{selectedService?.name}</strong> on{" "}
          <strong>{selectedDate && formatDateDisplay(selectedDate)}</strong> at{" "}
          <strong>{selectedTime && formatTimeDisplay(selectedTime)}</strong> is pending
          confirmation. We&apos;ve emailed you the details and will confirm shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Step 1: Service */}
      <div>
        <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
          1. Choose a service
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <label
              key={service.id}
              className={[
                "cursor-pointer rounded-sm border p-4 transition-colors",
                serviceId === service.id
                  ? "border-pit-500 bg-pit-500/10"
                  : "border-cream-300 bg-white hover:border-steel-400/50",
              ].join(" ")}
            >
              <input
                type="radio"
                name="service"
                value={service.id}
                checked={serviceId === service.id}
                onChange={() => {
                  setServiceId(service.id);
                  setSelectedDate(null);
                  setSelectedTime(null);
                }}
                className="sr-only"
              />
              <span className="block font-display text-sm font-semibold uppercase text-asphalt-800">
                {service.name}
              </span>
              <span className="mt-1 block font-mono text-xs text-steel-500">
                ~{service.duration_minutes} min
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Step 2: Date & time */}
      <div>
        <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
          2. Choose date &amp; time
        </h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-2">
          <Calendar
            selectedDate={selectedDate}
            onSelectDate={(iso) => setSelectedDate(iso)}
            isDayDisabled={(_, dayOfWeek) => dayOfWeek === 0}
          />

          <div className="card-panel p-5">
            {!selectedDate && (
              <p className="text-sm text-steel-500">Choose a date to see available times.</p>
            )}
            {selectedDate && slotsLoading && (
              <p className="text-sm text-steel-500">Loading available times…</p>
            )}
            {selectedDate && !slotsLoading && slotsError && (
              <p className="text-sm text-rust-600">{slotsError}</p>
            )}
            {selectedDate && !slotsLoading && !slotsError && slots.length === 0 && (
              <p className="text-sm text-steel-500">
                No times available on {formatDateDisplay(selectedDate)}. Please try another date.
              </p>
            )}
            {selectedDate && !slotsLoading && !slotsError && slots.length > 0 && (
              <>
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-steel-400">
                  Available on {formatDateDisplay(selectedDate)}
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={[
                        "rounded-sm border px-2 py-2 font-mono text-xs font-semibold transition-colors",
                        selectedTime === slot
                          ? "border-pit-500 bg-pit-500 text-white"
                          : "border-cream-300 text-asphalt-800 hover:border-pit-500",
                      ].join(" ")}
                    >
                      {formatTimeDisplay(slot)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step 3: Details */}
      <div>
        <h2 className="font-display text-lg font-semibold uppercase text-asphalt-800">
          3. Your details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="customer_name" className="field-label">Full name</label>
            <input id="customer_name" name="customer_name" required className="field-input" />
          </div>
          <div>
            <label htmlFor="customer_phone" className="field-label">Phone</label>
            <input id="customer_phone" name="customer_phone" type="tel" required className="field-input" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="customer_email" className="field-label">Email</label>
            <input id="customer_email" name="customer_email" type="email" required className="field-input" />
          </div>
          <div>
            <label htmlFor="vehicle_rego" className="field-label">Vehicle registration</label>
            <input id="vehicle_rego" name="vehicle_rego" required className="field-input" placeholder="ABC123" />
          </div>
          <div>
            <label htmlFor="vehicle_make" className="field-label">Vehicle make</label>
            <input id="vehicle_make" name="vehicle_make" required className="field-input" placeholder="Toyota" />
          </div>
          <div>
            <label htmlFor="vehicle_model" className="field-label">Vehicle model</label>
            <input id="vehicle_model" name="vehicle_model" required className="field-input" placeholder="Corolla" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notes" className="field-label">Notes (optional)</label>
            <textarea id="notes" name="notes" rows={4} className="field-input resize-none" placeholder="Anything we should know before you arrive?" />
          </div>
        </div>
      </div>

      {submitError && (
        <p className="rounded-sm bg-rust/10 px-3 py-2 text-sm text-rust-600">{submitError}</p>
      )}

      <button
        type="submit"
        className="btn-primary w-full sm:w-auto"
        disabled={!selectedDate || !selectedTime || status === "submitting"}
      >
        {status === "submitting" ? "Submitting…" : "Submit Booking Request"}
      </button>
    </form>
  );
}
