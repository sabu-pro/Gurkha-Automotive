"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { BUSINESS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useBookingAssistant, type ChatMessage } from "@/components/assistant/useBookingAssistant";
import type { Step, SummaryRow } from "@/lib/assistant/types";

interface InputHint {
  placeholder: string;
  type?: "text" | "tel" | "email";
  inputMode?: "text" | "tel" | "email" | "numeric";
  autoComplete?: string;
  autoCapitalize?: "none" | "words" | "characters" | "sentences";
}

const INPUT_HINTS: Partial<Record<Step, InputHint>> = {
  service: { placeholder: "Describe the problem, or pick a service above" },
  problem: { placeholder: "e.g. squeaking when I brake", autoCapitalize: "sentences" },
  make: { placeholder: "e.g. Toyota", autoCapitalize: "words" },
  model: { placeholder: "e.g. Corolla", autoCapitalize: "words" },
  year: { placeholder: "e.g. 2018", inputMode: "numeric" },
  rego: { placeholder: "e.g. ABC123", autoCapitalize: "characters", autoComplete: "off" },
  date: { placeholder: "e.g. next Tuesday or 28/11" },
  time: { placeholder: "e.g. 10:30am" },
  name: { placeholder: "Your full name", autoComplete: "name", autoCapitalize: "words" },
  phone: { placeholder: "04XX XXX XXX", type: "tel", inputMode: "tel", autoComplete: "tel" },
  email: { placeholder: "you@example.com", type: "email", inputMode: "email", autoComplete: "email", autoCapitalize: "none" },
  comments: { placeholder: "Anything else? (optional)", autoCapitalize: "sentences" },
  summary: { placeholder: "Type “submit”, or what to change" },
  done: { placeholder: "Type a message" },
};

export default function AssistantPanel({ onClose }: { onClose: () => void }) {
  const assistant = useBookingAssistant();
  const { state, messages, busy, submitting, ready, configError } = assistant;
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const lastBotIndex = messages.map((m) => m.from).lastIndexOf("bot");
  const canEdit = state.step !== "submitting" && state.step !== "done";
  const hint = INPUT_HINTS[state.step] ?? { placeholder: "Type your answer" };

  // Desktop: focus the input when the panel opens. On phones this would
  // pop the keyboard over the quick-reply buttons, so leave it.
  useEffect(() => {
    if (window.matchMedia("(min-width: 640px)").matches) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, busy]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || submitting || !ready) return;
    assistant.sendText(draft);
    setDraft("");
  }

  return (
    <div
      id="ga-booking-assistant"
      role="dialog"
      aria-modal="false"
      aria-labelledby="ga-assistant-title"
      className={cn(
        "fixed inset-0 z-[60] flex flex-col overflow-hidden bg-cream-200",
        "sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:rounded-md sm:border sm:border-cream-300 sm:shadow-2xl",
        "motion-safe:animate-[fade-up_0.25s_cubic-bezier(0.16,1,0.3,1)_both]"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Header */}
      <div className="bg-asphalt-900 text-cream-100">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-sm bg-pit-500" aria-hidden="true">
            <WrenchIcon />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pit-400">Booking assistant</p>
            <h2 id="ga-assistant-title" className="truncate font-display text-base font-semibold uppercase tracking-wide">
              {BUSINESS.name}
            </h2>
          </div>
          <HeaderButton
            label="Previous question"
            disabled={!ready || !canEdit || state.history.length === 0}
            onClick={() => assistant.send({ type: "back" }, "Back")}
          >
            <path d="M15 18l-6-6 6-6" />
          </HeaderButton>
          <HeaderButton
            label="Start over"
            disabled={!ready || submitting}
            onClick={() => assistant.send({ type: "reset" }, "Start over")}
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </HeaderButton>
          <HeaderButton label="Close booking assistant" onClick={onClose}>
            <path d="M6 6l12 12M18 6L6 18" />
          </HeaderButton>
        </div>
        <div
          className="h-1 bg-asphalt-700"
          role="progressbar"
          aria-label="Booking progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={assistant.progress}
        >
          <div className="h-full bg-pit-400 transition-[width] duration-500 ease-premium" style={{ width: `${assistant.progress}%` }} />
        </div>
      </div>

      {/* Conversation */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
        className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4"
      >
        {configError && (
          <div className="rounded-md border border-rust/40 bg-white p-4 text-sm text-asphalt-800">
            <p>Sorry, the booking assistant couldn&apos;t load. You can try again, book on our booking page, or call us on {BUSINESS.phone}.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={assistant.retryConfig} className={chipClass(true)}>
                Try again
              </button>
              <Link href="/book" onClick={onClose} className={chipClass(false)}>
                Booking page
              </Link>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            showReplies={index === lastBotIndex && !busy && !submitting}
            canEdit={canEdit && !busy}
            onReply={assistant.chooseReply}
            onEdit={(row) => assistant.send({ type: "edit", field: row.field }, `Change ${row.label.toLowerCase()}`)}
          />
        ))}

        {(busy || (!ready && !configError)) && (
          <div className="flex items-center gap-2 text-xs text-steel-500">
            <TypingDots />
            <span>{submitting ? "Sending your booking request…" : "Assistant is typing…"}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-cream-300 bg-white px-3 pt-3 sm:px-4"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <label htmlFor="ga-assistant-input" className="sr-only">
          Your answer
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ga-assistant-input"
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={1000}
            disabled={!ready || submitting}
            placeholder={hint.placeholder}
            type={hint.type ?? "text"}
            inputMode={hint.inputMode}
            autoComplete={hint.autoComplete ?? "off"}
            autoCapitalize={hint.autoCapitalize}
            enterKeyHint="send"
            className="field-input min-h-[44px] flex-1 !text-base sm:!text-sm"
          />
          <button
            type="submit"
            disabled={!ready || submitting || !draft.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-sm bg-pit-500 text-white transition-colors hover:bg-pit-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-steel-400">
          Type “back” or “start over” any time. This sends a booking request — our team confirms every appointment.
        </p>
      </form>
    </div>
  );
}

function MessageBubble({
  message,
  showReplies,
  canEdit,
  onReply,
  onEdit,
}: {
  message: ChatMessage;
  showReplies: boolean;
  canEdit: boolean;
  onReply: (reply: NonNullable<ChatMessage["quickReplies"]>[number]) => void;
  onEdit: (row: SummaryRow) => void;
}) {
  if (message.from === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-line break-words rounded-md rounded-br-sm bg-pit-500 px-3.5 py-2 text-sm text-white">
          {message.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div
        className={cn(
          "max-w-[92%] whitespace-pre-line break-words rounded-md rounded-bl-sm border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-asphalt-800 shadow-sm",
          message.tone === "error" && "border-rust/40",
          message.tone === "success" && "border-pit/40 border-l-4 !border-l-pit-500",
          (!message.tone || message.tone === "default") && "border-cream-300"
        )}
      >
        {message.tone === "error" && <span className="sr-only">Problem: </span>}
        {message.text}
        {message.summary && (
          <dl className="mt-3 divide-y divide-cream-300 border-t border-cream-300">
            {message.summary.map((row) => (
              <div key={row.field} className="flex items-start gap-2 py-1.5">
                <dt className="w-24 shrink-0 text-[11px] font-bold uppercase tracking-wide text-steel-400">{row.label}</dt>
                <dd className="min-w-0 flex-1 break-words text-[13px] font-semibold text-asphalt-800">{row.value}</dd>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(row)}
                    className="shrink-0 rounded-sm px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-pit-600 hover:bg-pit-500/10"
                    aria-label={`Change ${row.label.toLowerCase()}`}
                  >
                    Edit
                  </button>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>

      {showReplies && message.quickReplies && message.quickReplies.length > 0 && (
        <div className="flex max-w-full flex-wrap gap-2" role="group" aria-label="Suggested replies">
          {message.quickReplies.map((reply, i) => (
            <button key={`${reply.label}-${i}`} type="button" onClick={() => onReply(reply)} className={chipClass(reply.variant === "primary")}>
              {reply.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function chipClass(primary: boolean): string {
  return cn(
    "inline-flex min-h-[40px] items-center rounded-full border px-3.5 py-1.5 text-left text-[13px] font-semibold transition-colors focus-visible:outline-offset-2",
    primary
      ? "border-pit-500 bg-pit-500 text-white hover:bg-pit-600"
      : "border-cream-300 bg-white text-asphalt-800 hover:border-pit-500 hover:text-pit-600"
  );
}

function HeaderButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-sm text-cream-100/80 transition-colors hover:bg-cream-100/10 hover:text-cream-100 disabled:opacity-30"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-2 shadow-sm" aria-hidden="true">
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="h-1.5 w-1.5 rounded-full bg-steel-400 motion-safe:animate-bounce" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

export function WrenchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" />
    </svg>
  );
}
