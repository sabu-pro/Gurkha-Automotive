import { describe, expect, it } from "vitest";
import { createInitialState, reduce } from "@/lib/assistant/flow";
import type { AssistantEvent, AssistantState, BotMessage, Effect, StepResult } from "@/lib/assistant/types";
import { byName, makeContext } from "./fixtures";

/** Drives the engine like the chat UI does, recording everything it says. */
function conversation(ctxOverrides = {}) {
  const ctx = makeContext(ctxOverrides);
  let state: AssistantState = createInitialState("request-0");
  const said: BotMessage[] = [];
  let last: StepResult = { state, messages: [], effects: [] };

  const send = (event: AssistantEvent) => {
    last = reduce(state, event, ctx);
    state = last.state;
    said.push(...last.messages);
    return last;
  };

  return {
    ctx,
    send,
    text: (text: string) => send({ type: "text", text }),
    choose: (value: string) => send({ type: "choose", value }),
    get state() {
      return state;
    },
    get last() {
      return last;
    },
    said,
    lastText: () => last.messages.map((m) => m.text).join("\n"),
    replies: () => last.messages.at(-1)?.quickReplies?.map((r) => r.label) ?? [],
    effect: <T extends Effect["type"]>(type: T) => last.effects.find((e) => e.type === type) as Extract<Effect, { type: T }> | undefined,
  };
}

const brake = byName("Brake Inspection & Repair");

/** Gets a conversation to the summary with valid answers. */
function toSummary() {
  const c = conversation();
  c.send({ type: "start" });
  c.text("my brakes squeal when I stop");
  c.choose("__hint__");
  c.text("toyota");
  c.text("Corolla");
  c.text("2018");
  c.text("abc 123");
  c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-17", slotCount: 3 }] });
  c.choose("2026-11-17");
  c.send({ type: "slotsLoaded", serviceId: brake.id, date: "2026-11-17", times: ["09:00", "09:30", "10:00"] });
  c.text("9:30am");
  c.text("Sam Taylor");
  c.text("0412345678");
  c.text("sam@example.com");
  c.choose("__none__");
  return c;
}

describe("booking assistant — happy path", () => {
  it("collects every detail, shows a summary and submits a pending request", () => {
    const c = conversation();

    c.send({ type: "start" });
    expect(c.lastText()).toMatch(/booking request/i);
    expect(c.replies()).toContain("Brake Inspection & Repair");

    c.text("my brakes squeal when I stop");
    expect(c.state.draft.serviceId).toBe(brake.id);
    expect(c.state.step).toBe("problem");
    expect(c.lastText()).toContain("my brakes squeal when I stop");

    c.choose("__hint__");
    expect(c.state.draft.problem).toBe("my brakes squeal when I stop");

    c.text("toyota");
    expect(c.state.draft.make).toBe("Toyota");
    c.text("Corolla");
    c.text("2018");
    c.text("abc 123");
    expect(c.state.draft.rego).toBe("ABC 123");

    // Date step asks the server for real availability.
    expect(c.state.step).toBe("date");
    expect(c.effect("loadDays")).toEqual({ type: "loadDays", serviceId: brake.id });
    c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-17", slotCount: 3 }] });
    expect(c.replies()[0]).toMatch(/Tomorrow/);

    c.choose("2026-11-17");
    expect(c.effect("loadSlots")).toEqual({ type: "loadSlots", serviceId: brake.id, date: "2026-11-17" });
    c.send({ type: "slotsLoaded", serviceId: brake.id, date: "2026-11-17", times: ["09:00", "09:30", "10:00"] });
    c.text("9:30am");
    expect(c.state.draft.time).toBe("09:30");

    c.text("Sam Taylor");
    c.text("0412345678");
    expect(c.state.draft.phone).toBe("0412 345 678");

    c.text("sam@gmial.com");
    expect(c.lastText()).toContain("Did you mean sam@gmail.com?");
    c.choose("__suggested__");
    expect(c.state.draft.email).toBe("sam@gmail.com");

    c.choose("__none__");
    expect(c.state.step).toBe("summary");
    const summary = c.last.messages.find((m) => m.summary)!.summary!;
    expect(Object.fromEntries(summary.map((r) => [r.field, r.value]))).toMatchObject({
      service: "Brake Inspection & Repair",
      make: "Toyota",
      model: "Corolla",
      year: "2018",
      rego: "ABC 123",
      time: "9:30 am",
      name: "Sam Taylor",
      phone: "0412 345 678",
      email: "sam@gmail.com",
      comments: "None",
    });
    expect(c.lastText()).toMatch(/isn't confirmed until/);

    c.send({ type: "submit" });
    expect(c.state.step).toBe("submitting");
    expect(c.effect("submit")?.payload).toEqual({
      service_id: brake.id,
      booking_date: "2026-11-17",
      start_time: "09:30",
      customer_name: "Sam Taylor",
      customer_email: "sam@gmail.com",
      customer_phone: "0412 345 678",
      vehicle_rego: "ABC 123",
      vehicle_make: "Toyota",
      vehicle_model: "Corolla",
      vehicle_year: 2018,
      problem_description: "my brakes squeal when I stop",
      notes: "",
      client_request_id: "request-0",
      source: "assistant",
    });

    // Typing while the request is in flight is ignored.
    c.text("hello?");
    expect(c.state.step).toBe("submitting");

    c.send({
      type: "submitSucceeded",
      booking: { reference: "GA-7K3QX9", status: "pending", booking_date: "2026-11-17", start_time: "09:30:00", service_name: brake.name },
    });
    expect(c.state.step).toBe("done");
    expect(c.lastText()).toContain("Reference: GA-7K3QX9");
    expect(c.lastText()).toContain("Status: Pending");
  });

  it("never tells the customer their booking is confirmed", () => {
    const c = toSummary();
    c.send({ type: "submit" });
    c.send({
      type: "submitSucceeded",
      booking: { reference: "GA-AAAAAA", status: "pending", booking_date: "2026-11-17", start_time: "09:30:00", service_name: brake.name },
    });
    const everything = c.said.map((m) => m.text).join("\n");
    expect(everything).not.toMatch(/\b(is|been|now) confirmed\b/i);
    expect(everything).not.toMatch(/booking confirmed/i);
  });
});

describe("booking assistant — validation", () => {
  it("rejects an invalid phone number and asks again", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "phone" });
    c.text("12345");
    expect(c.state.step).toBe("phone");
    expect(c.last.messages[0].tone).toBe("error");
    expect(c.state.draft.phone).toBe("0412 345 678"); // unchanged
  });

  it("rejects an invalid email address", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "email" });
    c.text("sam at example dot com");
    expect(c.state.step).toBe("email");
    expect(c.lastText()).toMatch(/complete email address/);
  });

  it("rejects a date in the past", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "date" });
    c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-17", slotCount: 3 }] });
    c.text("1/1/2020");
    expect(c.state.step).toBe("date");
    expect(c.lastText()).toMatch(/already passed/);
  });

  it("rejects a date beyond the booking window", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "date" });
    c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-17", slotCount: 3 }] });
    c.text("1/6/2027");
    expect(c.lastText()).toMatch(/up to 60 days ahead/);
  });

  it("sends the customer back to choose a date when a day has no free times", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "date" });
    c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-17", slotCount: 3 }] });
    c.text("sunday");
    c.send({ type: "slotsLoaded", serviceId: brake.id, date: "2026-11-22", times: [] });
    expect(c.state.step).toBe("date");
    expect(c.state.draft.date).toBeUndefined();
    expect(c.lastText()).toMatch(/no free times on Sunday,? 22 November 2026/);
  });

  it("offers the nearest free times when a requested time is taken", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "time" });
    c.text("11am");
    expect(c.state.step).toBe("time");
    expect(c.state.draft.time).toBe("09:30"); // the earlier valid choice stands until a new one is picked
    expect(c.lastText()).toMatch(/11:00 am isn't available/);
    expect(c.replies()).toContain("10:00 am");
  });

  it("refuses to submit while something required is missing", () => {
    const c = conversation();
    c.send({ type: "start" });
    c.choose(brake.id);
    // Jump straight to the summary and try to submit.
    c.send({ type: "showSummary" });
    expect(c.state.step).toBe("problem");
  });
});

describe("booking assistant — corrections and navigation", () => {
  it("edits one answer from the summary and returns there", () => {
    const c = toSummary();
    c.text("change my email");
    expect(c.state.step).toBe("email");
    c.text("sam.taylor@example.com");
    expect(c.state.step).toBe("summary");
    expect(c.state.draft.email).toBe("sam.taylor@example.com");
  });

  it("asks for a new time when the date is changed", () => {
    const c = toSummary();
    c.send({ type: "edit", field: "date" });
    c.send({ type: "daysLoaded", serviceId: brake.id, days: [{ date: "2026-11-18", slotCount: 2 }] });
    c.choose("2026-11-18");
    expect(c.state.step).toBe("time");
    expect(c.state.draft.time).toBeUndefined();
    c.send({ type: "slotsLoaded", serviceId: brake.id, date: "2026-11-18", times: ["13:00"] });
    c.choose("13:00");
    expect(c.state.step).toBe("summary");
  });

  it("asks for a new time when the service is changed (durations differ)", () => {
    const c = toSummary();
    const battery = byName("Battery Test & Replacement");
    c.send({ type: "edit", field: "service" });
    c.choose(battery.id);
    expect(c.state.step).toBe("time");
    expect(c.effect("loadSlots")).toEqual({ type: "loadSlots", serviceId: battery.id, date: "2026-11-17" });
  });

  it("goes back to the previous question and offers to keep the answer", () => {
    const c = conversation();
    c.send({ type: "start" });
    c.choose(brake.id);
    c.choose("__routine__");
    c.text("Mazda");
    expect(c.state.step).toBe("model");
    c.text("back");
    expect(c.state.step).toBe("make");
    expect(c.replies()[0]).toBe("Keep “Mazda”");
    c.choose("__keep__");
    expect(c.state.step).toBe("model");
  });

  it("asks before starting over, then starts a fresh request with a new id", () => {
    const c = toSummary();
    c.text("start over");
    expect(c.state.pending).toEqual({ kind: "confirmReset" });
    c.send({ type: "cancelReset" });
    expect(c.state.draft.name).toBe("Sam Taylor");

    c.send({ type: "reset" });
    c.send({ type: "confirmReset" });
    expect(c.state.draft).toEqual({});
    expect(c.state.step).toBe("service");
    expect(c.state.requestId).not.toBe("request-0");
  });

  it("gives the phone number when the customer asks for a person", () => {
    const c = conversation();
    c.send({ type: "start" });
    c.text("can I speak to someone");
    expect(c.lastText()).toContain("0422 960 735");
    expect(c.state.step).toBe("service");
  });
});

describe("booking assistant — submission failures", () => {
  it("handles a slot taken by someone else between choosing and submitting", () => {
    const c = toSummary();
    c.send({ type: "submit" });
    c.send({ type: "submitFailed", failure: { kind: "slot_taken", message: "taken" } });
    expect(c.state.step).toBe("time");
    expect(c.state.draft.time).toBeUndefined();
    expect(c.effect("loadSlots")).toBeDefined();
    c.send({ type: "slotsLoaded", serviceId: brake.id, date: "2026-11-17", times: ["10:00"] });
    c.choose("10:00");
    expect(c.state.step).toBe("summary");
  });

  it("keeps everything and retries with the same request id after a network error", () => {
    const c = toSummary();
    c.send({ type: "submit" });
    const firstId = c.effect("submit")!.payload.client_request_id;
    c.send({ type: "submitFailed", failure: { kind: "network", message: "offline" } });
    expect(c.state.step).toBe("summary");
    expect(c.replies()).toContain("Try again");
    c.send({ type: "submit" });
    expect(c.effect("submit")!.payload.client_request_id).toBe(firstId);
  });

  it("jumps to the field the server rejected", () => {
    const c = toSummary();
    c.send({ type: "submit" });
    c.send({ type: "submitFailed", failure: { kind: "invalid", message: "That email address doesn't look valid", field: "email" } });
    expect(c.state.step).toBe("email");
    expect(c.lastText()).toContain("doesn't look valid");
  });
});

describe("booking assistant — optional AI provider", () => {
  it("never calls the AI endpoint when no provider is configured", () => {
    const c = conversation({ aiEnabled: false });
    c.send({ type: "start" });
    c.text("something weird is going on");
    expect(c.last.effects).toEqual([]);
    expect(c.lastText()).toMatch(/couldn't match/);
  });

  it("asks the provider only when the rules don't understand, and validates its answer", () => {
    const c = conversation({ aiEnabled: true });
    c.send({ type: "start" });
    c.text("something weird is going on");
    expect(c.effect("interpret")).toEqual({ type: "interpret", step: "service", text: "something weird is going on" });

    // An id that isn't a real service is ignored.
    c.send({ type: "interpreted", step: "service", text: "something weird is going on", result: { serviceId: "not-a-real-id" } });
    expect(c.state.draft.serviceId).toBeUndefined();

    c.text("something weird is going on");
    c.send({ type: "interpreted", step: "service", text: "something weird is going on", result: { serviceId: byName("Diagnostic Check").id } });
    expect(c.state.draft.serviceId).toBe(byName("Diagnostic Check").id);
  });
});
