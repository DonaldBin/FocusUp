import { describe, expect, it } from "vitest";
import {
  STALE_OPEN_SESSION_HINT,
  elapsedMs,
  formatElapsed,
  staleOpenSessionHint,
} from "@/lib/domain/elapsedDisplay";

describe("elapsedMs", () => {
  it("is now minus startAt and never negative", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    const now = new Date("2024-06-10T10:05:30.000Z");
    expect(elapsedMs(start, now)).toBe(5 * 60 * 1000 + 30 * 1000);
    expect(elapsedMs(now, start)).toBe(0);
  });
});

describe("formatElapsed", () => {
  it("formats under one hour as m:ss", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(65 * 1000)).toBe("1:05");
  });

  it("formats with hours as h:mm:ss", () => {
    expect(formatElapsed(3 * 3600 * 1000 + 4 * 60 * 1000 + 5 * 1000)).toBe(
      "3:04:05",
    );
  });
});

describe("staleOpenSessionHint", () => {
  it("returns English hint at or after 3 hours without stopping", () => {
    const start = new Date("2024-06-10T10:00:00.000Z");
    expect(
      staleOpenSessionHint(start, new Date("2024-06-10T12:59:00.000Z")),
    ).toBeNull();
    expect(
      staleOpenSessionHint(start, new Date("2024-06-10T13:00:00.000Z")),
    ).toBe(STALE_OPEN_SESSION_HINT);
  });
});
