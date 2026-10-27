import { describe, expect, it } from "vitest";
import {
  STALE_OPEN_SESSION_HINT,
  elapsedMs,
  formatElapsed,
  liveElapsedMs,
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

describe("liveElapsedMs", () => {
  // Regression: a desktop clock ~15s ahead of the server used to render a
  // freshly started timer at 15 seconds instead of 0:00.
  const startAt = new Date("2024-06-10T10:00:00.000Z");
  const skewedClientNow = new Date("2024-06-10T10:00:15.000Z");
  const offset = -15_000;

  it("reads 0 right after start when the client clock is fast", () => {
    expect(liveElapsedMs(startAt, skewedClientNow, offset)).toBe(0);
    expect(formatElapsed(liveElapsedMs(startAt, skewedClientNow, offset))).toBe(
      "0:00",
    );
  });

  it("tracks real elapsed time, not clock skew, while running", () => {
    // 60s of real time later the skewed client reads 10:01:15.
    const later = new Date("2024-06-10T10:01:15.000Z");
    expect(formatElapsed(liveElapsedMs(startAt, later, offset))).toBe("1:00");
  });

  it("does not inflate elapsed when the client clock is slow", () => {
    const slowNow = new Date("2024-06-10T10:00:30.000Z");
    expect(liveElapsedMs(startAt, slowNow, 30_000)).toBe(60_000);
  });

  it("never goes negative when the server reading precedes start_at", () => {
    // Client reading 09:59:50 + 5s offset = 09:59:55, i.e. before start_at.
    const beforeStart = new Date("2024-06-10T09:59:50.000Z");
    expect(liveElapsedMs(startAt, beforeStart, 5_000)).toBe(0);
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
