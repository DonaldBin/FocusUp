import { describe, expect, it } from "vitest";
import {
  STALE_OPEN_SESSION_MS,
  calendarDayKey,
  durationMs,
  isStaleOpenSession,
} from "@/lib/domain/timeEntry";

describe("durationMs", () => {
  it("is end minus start", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    const end = new Date("2024-06-10T11:30:00.000Z");
    expect(durationMs(start, end)).toBe(90 * 60 * 1000);
  });

  it("allows zero-length entries", () => {
    const t = new Date("2024-06-10T10:00:00.000Z");
    expect(durationMs(t, t)).toBe(0);
  });
});

describe("calendarDayKey", () => {
  it("attributes the entry to the start calendar day in the timezone", () => {
    // Starts late evening UTC on Jun 10 → still Jun 10 in UTC
    const start = new Date("2024-06-10T22:00:00.000Z");
    expect(calendarDayKey(start, "UTC")).toBe("2024-06-10");
  });

  it("uses the start day even when the entry crosses midnight locally", () => {
    // 2024-06-10 23:00 JST = 2024-06-10T14:00:00Z; ends after midnight JST
    const start = new Date("2024-06-10T14:00:00.000Z");
    expect(calendarDayKey(start, "Asia/Tokyo")).toBe("2024-06-10");
  });

  it("can land on the previous UTC day when local timezone is behind", () => {
    // 2024-06-11 01:00 JST = 2024-06-10T16:00:00Z → local day Jun 11
    const start = new Date("2024-06-10T16:00:00.000Z");
    expect(calendarDayKey(start, "Asia/Tokyo")).toBe("2024-06-11");
  });
});

describe("isStaleOpenSession", () => {
  it("uses a 3-hour threshold", () => {
    expect(STALE_OPEN_SESSION_MS).toBe(3 * 60 * 60 * 1000);
  });

  it("is false under 3 hours", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    const now = new Date("2024-06-10T12:59:59.000Z");
    expect(isStaleOpenSession(start, now)).toBe(false);
  });

  it("is true at or after 3 hours (does not stop the session)", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    const now = new Date("2024-06-10T13:00:00.000Z");
    expect(isStaleOpenSession(start, now)).toBe(true);
  });
});
