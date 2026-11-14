import { describe, expect, it } from "vitest";
import {
  cleanEmail,
  cleanName,
  cleanRego,
  detectEditIntent,
  detectGlobalIntent,
  matchServices,
  parseDate,
  parseTime,
  parseYear,
  tidyMake,
} from "@/lib/assistant/parse";
import { SERVICES, TODAY } from "./fixtures";

const names = (text: string) => matchServices(text, SERVICES).map((s) => s.name);

describe("matchServices", () => {
  it.each([
    ["my brakes squeal when I stop", ["Brake Inspection & Repair"]],
    ["I need a roadworthy", ["Vehicle Inspection"]],
    ["pre-purchase inspection please", ["Vehicle Inspection"]],
    ["brake inspection", ["Brake Inspection & Repair"]],
    ["car won't start in the morning", ["Battery Test & Replacement"]],
    ["check engine light is on", ["Diagnostic Check"]],
    ["got a puncture", ["Tyre Change and Fitting"]],
    ["due for a logbook service", ["General Service"]],
    ["Diagnostic Check", ["Diagnostic Check"]],
  ])("%s → %j", (text, expected) => {
    expect(names(text)).toEqual(expected);
  });

  it("returns several services when a description fits more than one", () => {
    expect(names("brakes making a strange noise").sort()).toEqual(["Brake Inspection & Repair", "Diagnostic Check"]);
  });

  it("returns nothing it can't place", () => {
    expect(names("hello")).toEqual([]);
    expect(names("")).toEqual([]);
  });
});

describe("parseDate (today is Monday 16 Nov 2026)", () => {
  it.each([
    ["today", "2026-11-16"],
    ["tomorrow", "2026-11-17"],
    ["day after tomorrow", "2026-11-18"],
    ["friday", "2026-11-20"],
    ["next tuesday", "2026-11-17"],
    ["monday", "2026-11-23"], // said on a Monday: next week
    ["this monday", "2026-11-16"],
    ["28/11", "2026-11-28"],
    ["28/11/2026", "2026-11-28"],
    ["3/1", "2027-01-03"], // already passed this year → next year
    ["28th November", "2026-11-28"],
    ["Dec 2", "2026-12-02"],
    ["2026-12-05", "2026-12-05"],
  ])("%s → %s", (text, expected) => {
    expect(parseDate(text, TODAY)).toBe(expected);
  });

  it("rejects impossible dates and nonsense", () => {
    expect(parseDate("31/02", TODAY)).toBeNull();
    expect(parseDate("whenever", TODAY)).toBeNull();
  });
});

describe("parseTime", () => {
  it.each([
    ["10am", "10:00"],
    ["10:30", "10:30"],
    ["2.30pm", "14:30"],
    ["3", "15:00"], // workshop hours: a bare 3 means 3 pm
    ["14:00", "14:00"],
    ["12pm", "12:00"],
    ["midday", "12:00"],
  ])("%s → %s", (text, expected) => {
    expect(parseTime(text)).toEqual({ kind: "exact", time: expected });
  });

  it("understands periods and extremes", () => {
    expect(parseTime("morning")).toEqual({ kind: "period", period: "morning" });
    expect(parseTime("arvo")).toEqual({ kind: "period", period: "afternoon" });
    expect(parseTime("earliest you have")).toEqual({ kind: "earliest" });
  });

  it("rejects invalid times", () => {
    expect(parseTime("25:00")).toBeNull();
    expect(parseTime("13pm")).toBeNull();
  });
});

describe("intents", () => {
  it("detects navigation commands", () => {
    expect(detectGlobalIntent("start over")).toBe("reset");
    expect(detectGlobalIntent("Go back")).toBe("back");
    expect(detectGlobalIntent("help")).toBe("help");
    expect(detectGlobalIntent("can I talk to a real person")).toBe("human");
    expect(detectGlobalIntent("my brakes are back to squealing")).toBeNull();
  });

  it("detects corrections", () => {
    expect(detectEditIntent("change my email", { strict: false })).toBe("email");
    expect(detectEditIntent("wrong phone number", { strict: false })).toBe("phone");
    expect(detectEditIntent("fix the number plate", { strict: false })).toBe("rego");
    expect(detectEditIntent("change the time", { strict: false })).toBe("time");
  });

  it("does not mistake a problem description for a correction", () => {
    expect(detectEditIntent("engine light comes on at the wrong time", { strict: true })).toBeNull();
    expect(detectEditIntent("the car makes a noise when braking and the steering feels wrong sometimes", { strict: false })).toBeNull();
  });
});

describe("field cleaning", () => {
  it("names", () => {
    expect(cleanName("  Sam   Taylor ")).toBe("Sam Taylor");
    expect(cleanName("Seán O'Brien-Smith")).toBe("Seán O'Brien-Smith");
    expect(cleanName("S")).toBeNull();
    expect(cleanName("Robert'); DROP TABLE bookings;--")).toBeNull();
  });

  it("makes", () => {
    expect(tidyMake("toyota")).toBe("Toyota");
    expect(tidyMake("land rover")).toBe("Land Rover");
    expect(tidyMake("bmw")).toBe("BMW");
    expect(tidyMake("McLaren")).toBe("McLaren");
  });

  it("regos", () => {
    expect(cleanRego("abc 123")).toBe("ABC 123");
    expect(cleanRego("1AB-2CD")).toBe("1AB-2CD");
    expect(cleanRego("A")).toBeNull();
    expect(cleanRego("<script>")).toBeNull();
  });

  it("years", () => {
    expect(parseYear("2018", 2026)).toBe(2018);
    expect(parseYear("it's a 2015 model", 2026)).toBe(2015);
    expect(parseYear("2030", 2026)).toBe("out_of_range");
    expect(parseYear("1900", 2026)).toBe("out_of_range");
    expect(parseYear("old", 2026)).toBeNull();
  });

  it("emails", () => {
    expect(cleanEmail(" Sam@Example.COM ")).toBe("sam@example.com");
    expect(cleanEmail("sam@example")).toBeNull();
    expect(cleanEmail("sam example.com")).toBeNull();
  });
});
