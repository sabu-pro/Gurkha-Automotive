"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// The chat panel (and the conversation engine it pulls in) is only
// downloaded once a visitor shows interest, so the floating button adds
// next to nothing to page weight.
const loadPanel = () => import("@/components/assistant/AssistantPanel");
const AssistantPanel = dynamic(loadPanel, { ssr: false });

/** Floating "book with our assistant" button + chat window. Rendered on every public page. */
export default function BookingAssistant() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  function toggle() {
    setMounted(true);
    setOpen((v) => !v);
  }

  return (
    <>
      {/* Kept mounted after first open so the conversation survives closing it. */}
      {mounted && (
        <div hidden={!open}>
          <AssistantPanel onClose={close} />
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={toggle}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-expanded={open}
        aria-controls={mounted ? "ga-booking-assistant" : undefined}
        aria-label={open ? "Close booking assistant" : "Book an appointment with our booking assistant"}
        className={cn(
          "fixed right-4 z-[55] inline-flex min-h-[56px] items-center gap-2 rounded-full bg-pit-500 px-4 text-white shadow-lg shadow-asphalt-900/25",
          "transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:bg-pit-600 hover:shadow-xl active:translate-y-0 motion-reduce:hover:translate-y-0",
          "focus-visible:outline-offset-4 sm:right-5",
          open && "max-sm:hidden"
        )}
        style={{ bottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
            <path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
          </svg>
        )}
        <span className="hidden text-sm font-bold uppercase tracking-wide sm:inline">{open ? "Close" : "Book with our assistant"}</span>
      </button>
    </>
  );
}
