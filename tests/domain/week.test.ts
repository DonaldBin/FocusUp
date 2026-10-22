import { describe, expect, it } from "vitest";
import { getWeekRange } from "@/lib/domain/week";

describe("getWeekRange", () => {
  it("in UTC, Wednesday falls in Mon–next Mon when review day is Monday", () => {
    // 2024-06-12 is Wednesday; review weekday 1 = Monday (JS)
    const now = new Date("2024-06-12T12:00:00.000Z");
    const { start, end } = getWeekRange(now, 1, "UTC");
    expect(start.toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-06-17T00:00:00.000Z");
  });

  it("on the review day after midnight, the week starts that morning", () => {
    const now = new Date("2024-06-10T08:00:00.000Z"); // Monday
    const { start, end } = getWeekRange(now, 1, "UTC");
    expect(start.toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-06-17T00:00:00.000Z");
  });

  it("uses Sunday review day when weekday is 0", () => {
    // 2024-06-12 Wednesday → previous Sunday 2024-06-09
    const now = new Date("2024-06-12T12:00:00.000Z");
    const { start, end } = getWeekRange(now, 0, "UTC");
    expect(start.toISOString()).toBe("2024-06-09T00:00:00.000Z");
    expect(end.toISOString()).toBe("2024-06-16T00:00:00.000Z");
  });

  it("computes local midnights in Asia/Tokyo", () => {
    // 2024-06-12T01:00:00Z = 2024-06-12 10:00 JST (Wednesday)
    // Monday 00:00 JST = 2024-06-09T15:00:00.000Z
    // Next Monday 00:00 JST = 2024-06-16T15:00:00.000Z
    const now = new Date("2024-06-12T01:00:00.000Z");
    const { start, end } = getWeekRange(now, 1, "Asia/Tokyo");
    expect(start.toISOString()).toBe("2024-06-09T15:00:00.000Z");
    expect(end.toISOString()).toBe("2024-06-16T15:00:00.000Z");
  });

  it("recalculates bounds when timezone argument changes (same instant)", () => {
    const now = new Date("2024-06-12T01:00:00.000Z");
    const tokyo = getWeekRange(now, 1, "Asia/Tokyo");
    const utc = getWeekRange(now, 1, "UTC");
    expect(tokyo.start.toISOString()).not.toBe(utc.start.toISOString());
    expect(tokyo.end.toISOString()).not.toBe(utc.end.toISOString());
  });

  it("keeps end exactly 7 days after start", () => {
    const now = new Date("2024-01-03T20:00:00.000Z");
    const { start, end } = getWeekRange(now, 3, "America/New_York"); // Wednesday
    expect(end.getTime() - start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
