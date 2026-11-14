"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUSINESS } from "@/lib/constants";
import { createInitialState, fieldFromServer, progressPercent, reduce } from "@/lib/assistant/flow";
import type {
  AssistantContext,
  AssistantEvent,
  AssistantService,
  AssistantState,
  BotMessage,
  Effect,
  QuickReply,
  SubmitFailure,
} from "@/lib/assistant/types";

export interface ChatMessage extends BotMessage {
  id: string;
  from: "bot" | "user";
}

interface AssistantConfig {
  services: AssistantService[];
  today: string;
  currentYear: number;
  maxDaysAhead: number;
  aiEnabled: boolean;
}

// The conversation survives page navigation (the widget lives in the
// root layout) and a reload of the tab. sessionStorage is per-tab and
// cleared when the tab closes, so details aren't left behind on a
// shared computer.
const STORAGE_KEY = "ga-booking-assistant-v1";
const STORAGE_MAX_AGE_MS = 2 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  // Fallback for very old browsers: RFC 4122 v4 shape from Math.random.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface Saved {
  savedAt: number;
  state: AssistantState;
  messages: ChatMessage[];
}

function loadSaved(): Saved | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Saved;
    if (saved?.state?.version !== 1 || Date.now() - saved.savedAt > STORAGE_MAX_AGE_MS) return null;
    return saved;
  } catch {
    return null;
  }
}

function save(state: AssistantState, messages: ChatMessage[]) {
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ savedAt: Date.now(), state, messages: messages.slice(-60) } satisfies Saved)
    );
  } catch {
    // Private mode / storage full: the chat still works, it just won't survive a reload.
  }
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

function submitFailureFrom(status: number, data: Record<string, unknown>): SubmitFailure {
  const message = typeof data.error === "string" ? data.error : "Something went wrong.";
  const code = typeof data.code === "string" ? data.code : "";
  if (status === 409 || code === "slot_taken") return { kind: "slot_taken", message };
  if (code === "too_many_active") return { kind: "too_many_active", message };
  if (status === 429) return { kind: "rate_limited", message };
  if (status === 400) {
    return { kind: "invalid", message, field: fieldFromServer(typeof data.field === "string" ? data.field : undefined) };
  }
  return { kind: "server", message };
}

export function useBookingAssistant() {
  const [initial] = useState(() => {
    const saved = loadSaved();
    return saved ?? { savedAt: 0, state: createInitialState(newId()), messages: [] as ChatMessage[] };
  });

  const [config, setConfig] = useState<AssistantConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [state, setState] = useState<AssistantState>(initial.state);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [typing, setTyping] = useState(false);
  const [pendingEffects, setPendingEffects] = useState(0);

  const stateRef = useRef(state);
  const configRef = useRef<AssistantConfig | null>(null);
  const revealQueue = useRef<Promise<void>>(Promise.resolve());
  // Bumped on "start over" so late responses from the old conversation are ignored.
  const epochRef = useRef(0);
  const startedRef = useRef(false);
  const dispatchRef = useRef<(event: AssistantEvent, echo?: string) => void>(() => {});

  useEffect(() => {
    save(state, messages);
  }, [state, messages]);

  const applyConfig = useCallback((loaded: AssistantConfig) => {
    configRef.current = loaded;
    setConfig(loaded);
    setConfigError(false);
    // Greet (or welcome back) once the services have loaded.
    if (!startedRef.current) {
      startedRef.current = true;
      dispatchRef.current({ type: "start" });
    }
  }, []);

  const loadConfig = useCallback(
    () =>
      fetchJson("/api/assistant/config")
        .then(({ ok, data }) => {
          if (!ok || !Array.isArray(data.services)) throw new Error("config");
          return data as unknown as AssistantConfig;
        })
        .then(applyConfig, () => setConfigError(true)),
    [applyConfig]
  );

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const retryConfig = useCallback(() => {
    setConfigError(false);
    void loadConfig();
  }, [loadConfig]);

  const reveal = useCallback((botMessages: BotMessage[]) => {
    for (const message of botMessages) {
      revealQueue.current = revealQueue.current.then(async () => {
        if (!prefersReducedMotion()) {
          setTyping(true);
          await new Promise((resolve) => setTimeout(resolve, Math.min(700, 250 + message.text.length * 3)));
        }
        setMessages((prev) => [...prev, { ...message, id: newId(), from: "bot" }]);
        setTyping(false);
      });
    }
  }, []);

  const runEffect = useCallback(async (effect: Effect, epoch: number) => {
    const deliver = (event: AssistantEvent) => {
      if (epoch === epochRef.current) dispatchRef.current(event);
    };
    setPendingEffects((n) => n + 1);
    try {
      switch (effect.type) {
        case "loadDays": {
          const { ok, data } = await fetchJson(
            `/api/availability/days?service_id=${encodeURIComponent(effect.serviceId)}&limit=6`
          );
          if (!ok || !Array.isArray(data.days)) throw new Error("days");
          deliver({ type: "daysLoaded", serviceId: effect.serviceId, days: data.days as { date: string; slotCount: number }[] });
          break;
        }
        case "loadSlots": {
          const { ok, data } = await fetchJson(
            `/api/availability?service_id=${encodeURIComponent(effect.serviceId)}&date=${encodeURIComponent(effect.date)}`
          );
          if (!ok || !Array.isArray(data.slots)) throw new Error("slots");
          deliver({ type: "slotsLoaded", serviceId: effect.serviceId, date: effect.date, times: data.slots as string[] });
          break;
        }
        case "submit": {
          try {
            const { ok, status, data } = await fetchJson("/api/bookings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(effect.payload),
            });
            const booking = data.booking as { reference?: string } | undefined;
            if (ok && booking?.reference) {
              deliver({ type: "submitSucceeded", booking: data.booking as never });
            } else {
              deliver({ type: "submitFailed", failure: submitFailureFrom(status, data) });
            }
          } catch {
            deliver({ type: "submitFailed", failure: { kind: "network", message: "Network error" } });
          }
          break;
        }
        case "interpret": {
          let result = null;
          try {
            const { ok, data } = await fetchJson("/api/assistant/interpret", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ step: effect.step, text: effect.text.slice(0, 500) }),
            });
            if (ok) result = (data.interpretation as never) ?? null;
          } catch {
            // Fall through: the engine answers with its rule-based reply.
          }
          deliver({ type: "interpreted", step: effect.step, text: effect.text, result });
          break;
        }
      }
    } catch {
      deliver({ type: "availabilityFailed" });
    } finally {
      setPendingEffects((n) => n - 1);
    }
  }, []);

  const dispatch = useCallback(
    (event: AssistantEvent, echo?: string) => {
      const cfg = configRef.current;
      if (!cfg) return;
      const ctx: AssistantContext = {
        services: cfg.services,
        today: cfg.today,
        currentYear: cfg.currentYear,
        aiEnabled: cfg.aiEnabled,
        maxDaysAhead: cfg.maxDaysAhead,
        businessPhone: BUSINESS.phone,
        createId: newId,
      };

      if (echo) setMessages((prev) => [...prev, { id: newId(), from: "user", text: echo }]);

      const before = stateRef.current;
      const outcome = reduce(before, event, ctx);
      if (outcome.state.requestId !== before.requestId) epochRef.current += 1;

      stateRef.current = outcome.state;
      setState(outcome.state);
      reveal(outcome.messages);
      for (const effect of outcome.effects) void runEffect(effect, epochRef.current);
    },
    [reveal, runEffect]
  );

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  const sendText = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed) dispatch({ type: "text", text: trimmed }, trimmed);
  }, [dispatch]);

  const chooseReply = useCallback((reply: QuickReply) => dispatch(reply.event, reply.label), [dispatch]);

  const send = useCallback((event: AssistantEvent, echo?: string) => dispatch(event, echo), [dispatch]);

  return {
    ready: config !== null,
    configError,
    retryConfig,
    state,
    messages,
    busy: typing || pendingEffects > 0,
    submitting: state.step === "submitting",
    progress: progressPercent(state),
    sendText,
    chooseReply,
    send,
  };
}
