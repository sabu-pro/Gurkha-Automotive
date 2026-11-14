"use client";

import { useId, useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";
import { formatDateDisplay, formatTimeDisplay, statusLabel } from "@/lib/utils";
import { BOOKING_STATUSES, type Booking, type BookingEvent, type BookingStatus, type Service } from "@/lib/types";

export type BookingRow = Booking & { service: Service };

type Panel = "none" | "reject" | "cancel" | "reschedule" | "status";

interface EmailOutcome {
  attempted: boolean;
  kind?: "confirmed" | "rejected" | "cancelled" | "rescheduled";
  sent?: boolean;
  error?: string;
}

interface Notice {
  tone: "success" | "warning" | "error";
  text: string;
}

const EMAIL_NAMES: Record<NonNullable<EmailOutcome["kind"]>, string> = {
  confirmed: "confirmation",
  rejected: "rejection",
  cancelled: "cancellation",
  rescheduled: "new-time",
};

function noticeFor(action: string, email: EmailOutcome | undefined, booking: BookingRow): Notice {
  if (!email?.kind) return { tone: "success", text: `${action}.` };
  if (!email.attempted) return { tone: "success", text: `${action}. No email was sent to the customer.` };
  if (email.sent) {
    return { tone: "success", text: `${action}. The ${EMAIL_NAMES[email.kind]} email was sent to ${booking.customer_email}.` };
  }
  return {
    tone: "warning",
    text: `${action}, but the ${EMAIL_NAMES[email.kind]} email could not be sent${email.error ? ` (${email.error})` : ""}. Please let the customer know on ${booking.customer_phone}.`,
  };
}

export default function BookingCard({
  booking,
  today,
  onUpdated,
}: {
  booking: BookingRow;
  today: string;
  onUpdated: (b: BookingRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [notesDraft, setNotesDraft] = useState(booking.admin_notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [history, setHistory] = useState<BookingEvent[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const vehicle = `${booking.vehicle_year ? `${booking.vehicle_year} ` : ""}${booking.vehicle_make} ${booking.vehicle_model}`;

  async function patchBooking(patch: Record<string, unknown>, busyKey: string, action: string): Promise<boolean> {
    setBusy(busyKey);
    setNotice(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "Could not update booking.");
      onUpdated(result.booking);
      setNotice(noticeFor(action, result.email, result.booking));
      setPanel("none");
      if (history) void loadHistory();
      return true;
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Could not update booking." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function loadHistory() {
    setHistoryError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/events`);
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "Could not load history.");
      setHistory(result.events);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Could not load history.");
    }
  }

  const isOpenRequest = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="card-panel overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={booking.status} />
          <span className="font-mono text-xs font-semibold text-steel-600">{booking.reference}</span>
          <span className="font-display text-sm font-semibold uppercase text-asphalt-800">
            {booking.service?.name ?? "Unknown service"}
          </span>
          <span className="font-mono text-xs text-steel-500">
            {formatDateDisplay(booking.booking_date)} · {formatTimeDisplay(booking.start_time)}
          </span>
          {booking.source === "assistant" && (
            <span className="rounded-sm bg-pit-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pit-600">
              Assistant
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-asphalt-800">{booking.customer_name}</span>
          <span className="text-steel-400" aria-hidden="true">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-cream-300 bg-cream-100 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Detail label="Customer" value={booking.customer_name} />
            <Detail label="Phone" value={booking.customer_phone} />
            <Detail label="Email" value={booking.customer_email} />
            <Detail label="Vehicle" value={vehicle} />
            <Detail label="Registration" value={booking.vehicle_rego} mono />
            <Detail label="Service" value={`${booking.service?.name} (~${booking.service?.duration_minutes} min)`} />
            <Detail label="Date" value={formatDateDisplay(booking.booking_date)} />
            <Detail label="Time" value={`${formatTimeDisplay(booking.start_time)} – ${formatTimeDisplay(booking.end_time)}`} />
            <Detail label="Requested" value={new Date(booking.created_at).toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })} />
            <Detail label="Source" value={booking.source === "assistant" ? "Booking assistant" : booking.source === "admin" ? "Admin" : "Booking form"} />
          </div>

          {booking.problem_description && <TextBlock label="Problem described" value={booking.problem_description} />}
          {booking.notes && <TextBlock label="Customer comments" value={booking.notes} />}
          {booking.status_reason && <TextBlock label="Last message to customer" value={booking.status_reason} />}

          <div className="mt-4">
            <label htmlFor={`admin-notes-${booking.id}`} className="field-label">Admin notes (internal)</label>
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
              onClick={() => patchBooking({ admin_notes: notesDraft }, "notes", "Notes saved")}
              disabled={busy !== null || notesDraft === (booking.admin_notes ?? "")}
              className="btn-secondary mt-2 !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600"
            >
              {busy === "notes" ? "Saving…" : "Save Notes"}
            </button>
          </div>

          {notice && (
            <p
              role="status"
              className={[
                "mt-4 rounded-sm px-3 py-2 text-sm",
                notice.tone === "success" && "bg-pit/10 text-pit-600",
                notice.tone === "warning" && "bg-amber-500/15 text-asphalt-800",
                notice.tone === "error" && "bg-rust/10 text-rust-600",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {notice.text}
            </p>
          )}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-cream-300 pt-4">
            <button
              type="button"
              disabled={busy !== null || booking.status === "confirmed"}
              onClick={() => patchBooking({ status: "confirmed" }, "confirmed", "Booking approved and confirmed")}
              className="btn-dark"
            >
              {busy === "confirmed" ? "Confirming…" : booking.status === "pending" ? "Approve" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setPanel(panel === "reschedule" ? "none" : "reschedule")}
              aria-expanded={panel === "reschedule"}
              className="btn-secondary !border-steel-400/40 !text-asphalt-800 hover:!border-amber-500 hover:!text-amber-600"
            >
              Reschedule
            </button>
            {booking.status === "pending" && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setPanel(panel === "reject" ? "none" : "reject")}
                aria-expanded={panel === "reject"}
                className="btn-secondary !border-rust !text-rust-600 hover:!bg-rust hover:!text-white"
              >
                Reject
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null || booking.status === "completed"}
              onClick={() => patchBooking({ status: "completed" }, "completed", "Marked as completed")}
              className="btn-secondary !border-pit !text-pit-600 hover:!bg-pit hover:!text-white"
            >
              {busy === "completed" ? "Updating…" : "Mark Completed"}
            </button>
            {isOpenRequest && (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")}
                aria-expanded={panel === "cancel"}
                className="btn-secondary !border-rust !text-rust-600 hover:!bg-rust hover:!text-white"
              >
                Cancel Booking
              </button>
            )}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setPanel(panel === "status" ? "none" : "status")}
              aria-expanded={panel === "status"}
              className="text-xs font-bold uppercase tracking-wide text-steel-500 underline-offset-2 hover:text-asphalt-800 hover:underline"
            >
              Change status…
            </button>
          </div>

          {(panel === "reject" || panel === "cancel") && (
            <ReasonPanel
              kind={panel}
              busy={busy !== null}
              onCancel={() => setPanel("none")}
              onSubmit={(message, notify) =>
                patchBooking(
                  { status: panel === "reject" ? "rejected" : "cancelled", customer_message: message || undefined, notify_customer: notify },
                  panel,
                  panel === "reject" ? "Booking request rejected" : "Booking cancelled"
                )
              }
            />
          )}

          {panel === "reschedule" && (
            <ReschedulePanel
              booking={booking}
              today={today}
              busy={busy !== null}
              onCancel={() => setPanel("none")}
              onSubmit={(payload) => patchBooking(payload, "reschedule", "Booking moved to the new time")}
            />
          )}

          {panel === "status" && (
            <StatusPanel
              current={booking.status}
              busy={busy !== null}
              onCancel={() => setPanel("none")}
              onSubmit={(status, notify) =>
                patchBooking({ status, notify_customer: notify }, "status", `Status changed to ${statusLabel(status)}`)
              }
            />
          )}

          <div className="mt-5 border-t border-cream-300 pt-4">
            {history === null ? (
              <button type="button" onClick={loadHistory} className="text-xs font-bold uppercase tracking-wide text-steel-600 hover:text-asphalt-800">
                Show booking history
              </button>
            ) : (
              <BookingHistory events={history} />
            )}
            {historyError && <p className="mt-2 text-sm text-rust-600">{historyError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function ReasonPanel({
  kind,
  busy,
  onCancel,
  onSubmit,
}: {
  kind: "reject" | "cancel";
  busy: boolean;
  onCancel: () => void;
  onSubmit: (message: string, notify: boolean) => void;
}) {
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const id = useId();
  return (
    <div className="mt-4 rounded-sm border border-rust/30 bg-white p-4">
      <p className="text-sm font-semibold text-asphalt-800">
        {kind === "reject" ? "Reject this booking request?" : "Cancel this booking?"}
      </p>
      <label htmlFor={id} className="field-label mt-3">Message to the customer (optional)</label>
      <textarea
        id={id}
        rows={2}
        maxLength={500}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="field-input resize-none"
        placeholder={kind === "reject" ? "e.g. We don't work on this vehicle type — please call us for a referral." : "e.g. A mechanic is unwell; please call us to rebook."}
      />
      <NotifyCheckbox checked={notify} onChange={setNotify} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => onSubmit(message.trim(), notify)} className="btn-secondary !border-rust !bg-rust !text-white">
          {busy ? "Saving…" : kind === "reject" ? "Reject request" : "Cancel booking"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold uppercase tracking-wide text-steel-500 hover:text-asphalt-800">
          Keep as is
        </button>
      </div>
    </div>
  );
}

function ReschedulePanel({
  booking,
  today,
  busy,
  onCancel,
  onSubmit,
}: {
  booking: BookingRow;
  today: string;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: Record<string, unknown>) => void;
}) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmToo, setConfirmToo] = useState(true);
  const [notify, setNotify] = useState(true);

  async function chooseDate(value: string) {
    setDate(value);
    setTime("");
    setSlots(null);
    setSlotsError(null);
    if (!value) return;
    try {
      const res = await fetch(`/api/availability?service_id=${booking.service_id}&date=${value}`);
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error ?? "Could not load times.");
      setSlots(result.slots);
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : "Could not load times.");
    }
  }

  return (
    <div className="mt-4 rounded-sm border border-cream-300 bg-white p-4">
      <p className="text-sm font-semibold text-asphalt-800">
        Move from {formatDateDisplay(booking.booking_date)} at {formatTimeDisplay(booking.start_time)}
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`resched-date-${booking.id}`} className="field-label">New date</label>
          <input id={`resched-date-${booking.id}`} type="date" min={today} value={date} onChange={(e) => chooseDate(e.target.value)} className="field-input" />
        </div>
        <div>
          <label htmlFor={`resched-time-${booking.id}`} className="field-label">New start time</label>
          <input
            id={`resched-time-${booking.id}`}
            type="time"
            step={300}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="field-input"
            disabled={!date}
          />
        </div>
      </div>

      {date && slots && slots.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-steel-400">Free times (other bookings considered)</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                aria-pressed={time === slot}
                className={[
                  "rounded-sm border px-2 py-1 font-mono text-xs font-semibold",
                  time === slot ? "border-pit-500 bg-pit-500 text-white" : "border-cream-300 text-asphalt-800 hover:border-pit-500",
                ].join(" ")}
              >
                {formatTimeDisplay(slot)}
              </button>
            ))}
          </div>
        </div>
      )}
      {date && slots && slots.length === 0 && (
        <p className="mt-3 text-sm text-steel-500">No free 30-minute slots that day. You can still type a time — it will be checked against opening hours and other bookings.</p>
      )}
      {slotsError && <p className="mt-3 text-sm text-rust-600">{slotsError}</p>}

      <label htmlFor={`resched-msg-${booking.id}`} className="field-label mt-3">Message to the customer (optional)</label>
      <textarea
        id={`resched-msg-${booking.id}`}
        rows={2}
        maxLength={500}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="field-input resize-none"
        placeholder="e.g. We've moved you to the morning so we can finish the same day."
      />
      {booking.status !== "confirmed" && (
        <label className="mt-3 flex items-center gap-2 text-sm text-asphalt-800">
          <input type="checkbox" checked={confirmToo} onChange={(e) => setConfirmToo(e.target.checked)} className="h-4 w-4 accent-pit-500" />
          Also confirm the booking at the new time
        </label>
      )}
      <NotifyCheckbox checked={notify} onChange={setNotify} />
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || !date || !time}
          onClick={() =>
            onSubmit({
              booking_date: date,
              start_time: time,
              ...(booking.status !== "confirmed" && confirmToo ? { status: "confirmed" } : {}),
              customer_message: message.trim() || undefined,
              notify_customer: notify,
            })
          }
          className="btn-dark"
        >
          {busy ? "Saving…" : "Move booking"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold uppercase tracking-wide text-steel-500 hover:text-asphalt-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

function StatusPanel({
  current,
  busy,
  onCancel,
  onSubmit,
}: {
  current: BookingStatus;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (status: BookingStatus, notify: boolean) => void;
}) {
  const [status, setStatus] = useState<BookingStatus>(current);
  const [notify, setNotify] = useState(true);
  const selectId = useId();
  const emails = status === "confirmed" || status === "rejected" || status === "cancelled";
  return (
    <div className="mt-4 rounded-sm border border-cream-300 bg-white p-4">
      <label htmlFor={selectId} className="field-label">Set status</label>
      <select id={selectId} value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)} className="field-input sm:w-60">
        {BOOKING_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      {emails && <NotifyCheckbox checked={notify} onChange={setNotify} />}
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" disabled={busy || status === current} onClick={() => onSubmit(status, notify)} className="btn-dark">
          {busy ? "Saving…" : "Update status"}
        </button>
        <button type="button" onClick={onCancel} className="text-xs font-bold uppercase tracking-wide text-steel-500 hover:text-asphalt-800">
          Cancel
        </button>
      </div>
    </div>
  );
}

function NotifyCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mt-3 flex items-center gap-2 text-sm text-asphalt-800">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-pit-500" />
      Email the customer about this change
    </label>
  );
}

const EVENT_LABELS: Record<BookingEvent["event_type"], string> = {
  created: "Booking requested",
  status_changed: "Status changed",
  rescheduled: "Rescheduled",
  notes_updated: "Admin notes edited",
  email_sent: "Email sent",
  email_failed: "Email failed",
};

function describeEvent(event: BookingEvent): string {
  switch (event.event_type) {
    case "status_changed":
      return `${statusLabel(event.from_status ?? "")} → ${statusLabel(event.to_status ?? "")}`;
    case "rescheduled":
      return event.from_date && event.to_date && event.from_start_time && event.to_start_time
        ? `${formatDateDisplay(event.from_date)} ${formatTimeDisplay(event.from_start_time)} → ${formatDateDisplay(event.to_date)} ${formatTimeDisplay(event.to_start_time)}`
        : "";
    default:
      return event.detail ?? "";
  }
}

function BookingHistory({ events }: { events: BookingEvent[] }) {
  if (events.length === 0) {
    return <p className="text-sm text-steel-500">No history recorded yet (bookings made before the history feature have none).</p>;
  }
  return (
    <div>
      <p className="field-label">Booking history</p>
      <ol className="space-y-2 border-l-2 border-cream-300 pl-4">
        {events.map((event) => (
          <li key={event.id} className="text-sm">
            <span className={event.event_type === "email_failed" ? "font-semibold text-rust-600" : "font-semibold text-asphalt-800"}>
              {EVENT_LABELS[event.event_type]}
            </span>{" "}
            <span className="text-steel-600">{describeEvent(event)}</span>
            {event.event_type !== "status_changed" && event.event_type !== "rescheduled" ? null : event.detail ? (
              <span className="block text-xs text-steel-500">Message: {event.detail}</span>
            ) : null}
            <span className="block font-mono text-[11px] text-steel-400">
              {new Date(event.created_at).toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })}
              {event.actor_email ? ` · ${event.actor_email}` : ""}
            </span>
          </li>
        ))}
      </ol>
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

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-4">
      <p className="field-label">{label}</p>
      <p className="whitespace-pre-line text-sm text-steel-600">{value}</p>
    </div>
  );
}
