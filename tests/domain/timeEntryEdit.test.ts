import { describe, expect, it } from "vitest";
import {
  endFromDuration,
  entryDayKey,
  resolveTimeRange,
  validateTimeRange,
} from "@/lib/domain/timeEntryEdit";

describe("validateTimeRange", () => {
  it("allows equal start and end", () => {
    const t = new Date("2024-06-10T10:00:00.000Z");
    expect(validateTimeRange(t, t)).toEqual({ ok: true });
  });

  it("rejects end before start", () => {
    const start = new Date("2024-06-10T11:00:00.000Z");
    const end = new Date("2024-06-10T10:00:00.000Z");
    expect(validateTimeRange(start, end)).toEqual({
      ok: false,
      error: "End must be at or after start",
    });
  });
});

describe("resolveTimeRange", () => {
  const start = new Date("2024-06-10T10:00:00.000Z");

  it("uses endAt when provided", () => {
    const end = new Date("2024-06-10T11:00:00.000Z");
    expect(resolveTimeRange({ startAt: start, endAt: end })).toEqual({
      startAt: start,
      endAt: end,
    });
  });

  it("derives end from durationMs", () => {
    const result = resolveTimeRange({
      startAt: start,
      durationMs: 30 * 60 * 1000,
    });
    expect(result).toEqual({
      startAt: start,
      endAt: new Date("2024-06-10T10:30:00.000Z"),
    });
  });

  it("rejects both endAt and durationMs", () => {
    expect(
      resolveTimeRange({
        startAt: start,
        endAt: new Date("2024-06-10T11:00:00.000Z"),
        durationMs: 1000,
      }),
    ).toEqual({
      error: "Provide either endAt or durationMs, not both",
    });
  });
});

describe("endFromDuration / entryDayKey", () => {
  it("adds duration to start", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    expect(endFromDuration(start, 90_000).toISOString()).toBe(
      "2024-06-10T10:01:30.000Z",
    );
  });

  it("attributes to start calendar day in timezone", () => {
    const start = new Date("2024-06-10T14:00:00.000Z");
    expect(entryDayKey(start, "Asia/Tokyo")).toBe("2024-06-10");
  });
});
