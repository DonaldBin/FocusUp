import { describe, expect, it } from "vitest";
import {
  buildAutoBlurb,
  buildFocusWeekBreakdowns,
  durationMsInWeek,
  enumerateWeekRanges,
  weekRangesForFocusData,
  weeksForFocus,
  type FocusOutcomeLike,
  type FocusTimeEntryLike,
  type WeekRangeInput,
} from "@/lib/domain/focusWeeks";

function range(startIso: string, endIso: string): WeekRangeInput {
  return { start: new Date(startIso), end: new Date(endIso) };
}

const weekA = range("2024-06-03T00:00:00.000Z", "2024-06-10T00:00:00.000Z");
const weekB = range("2024-06-10T00:00:00.000Z", "2024-06-17T00:00:00.000Z");
const weekC = range("2024-06-17T00:00:00.000Z", "2024-06-24T00:00:00.000Z");

describe("weeksForFocus", () => {
  it("returns empty when there are no entries or outcomes", () => {
    expect(weeksForFocus([], [], [weekA, weekB])).toEqual([]);
  });

  it("includes a week that has a time entry starting inside the range", () => {
    const entries: FocusTimeEntryLike[] = [
      { startAt: new Date("2024-06-11T10:00:00.000Z") },
    ];
    const result = weeksForFocus(entries, [], [weekA, weekB, weekC]);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe(weekB.start.toISOString());
  });

  it("includes a week that has an outcome created inside the range", () => {
    const outcomes: FocusOutcomeLike[] = [
      { createdAt: new Date("2024-06-05T12:00:00.000Z") },
    ];
    const result = weeksForFocus([], outcomes, [weekA, weekB, weekC]);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe(weekA.start.toISOString());
  });

  it("does not include weeks with no time and no outcome", () => {
    const entries: FocusTimeEntryLike[] = [
      { startAt: new Date("2024-06-11T10:00:00.000Z") },
    ];
    const result = weeksForFocus(entries, [], [weekA, weekB, weekC]);
    expect(result.map((w) => w.start.toISOString())).toEqual([
      weekB.start.toISOString(),
    ]);
  });

  it("includes a week only once when both entry and outcome exist", () => {
    const entries: FocusTimeEntryLike[] = [
      { startAt: new Date("2024-06-12T08:00:00.000Z") },
    ];
    const outcomes: FocusOutcomeLike[] = [
      { createdAt: new Date("2024-06-13T08:00:00.000Z") },
    ];
    const result = weeksForFocus(entries, outcomes, [weekB]);
    expect(result).toHaveLength(1);
  });

  it("treats range as half-open [start, end)", () => {
    const entries: FocusTimeEntryLike[] = [
      { startAt: new Date("2024-06-10T00:00:00.000Z") },
      { startAt: new Date("2024-06-17T00:00:00.000Z") },
    ];
    const result = weeksForFocus(entries, [], [weekB, weekC]);
    expect(result.map((w) => w.start.toISOString())).toEqual([
      weekB.start.toISOString(),
      weekC.start.toISOString(),
    ]);
  });

  it("preserves the order of the provided week ranges", () => {
    const entries: FocusTimeEntryLike[] = [
      { startAt: new Date("2024-06-20T10:00:00.000Z") },
      { startAt: new Date("2024-06-04T10:00:00.000Z") },
    ];
    const result = weeksForFocus(entries, [], [weekA, weekB, weekC]);
    expect(result.map((w) => w.start.toISOString())).toEqual([
      weekA.start.toISOString(),
      weekC.start.toISOString(),
    ]);
  });
});

describe("enumerateWeekRanges / breakdown", () => {
  it("enumerates Monday-bound weeks covering a span", () => {
    const ranges = enumerateWeekRanges(
      new Date("2024-06-05T12:00:00.000Z"),
      new Date("2024-06-12T12:00:00.000Z"),
      1,
      "UTC",
    );
    expect(ranges.length).toBeGreaterThanOrEqual(2);
    expect(ranges[0].start.toISOString()).toBe("2024-06-03T00:00:00.000Z");
  });

  it("sums duration only for entries in the week", () => {
    const entries: FocusTimeEntryLike[] = [
      {
        startAt: new Date("2024-06-11T10:00:00.000Z"),
        endAt: new Date("2024-06-11T11:00:00.000Z"),
      },
      {
        startAt: new Date("2024-06-04T10:00:00.000Z"),
        endAt: new Date("2024-06-04T12:00:00.000Z"),
      },
    ];
    expect(durationMsInWeek(entries, weekB)).toBe(60 * 60 * 1000);
  });

  it("builds auto blurb from duration and outcomes", () => {
    expect(
      buildAutoBlurb({
        durationMs: 90 * 60 * 1000,
        outcomes: [{ createdAt: new Date(), bodyText: "Shipped PR" }],
      }),
    ).toBe("1h 30m invested. Shipped PR");
  });

  it("builds breakdown rows only for weeks with data", () => {
    const entries: FocusTimeEntryLike[] = [
      {
        startAt: new Date("2024-06-11T10:00:00.000Z"),
        endAt: new Date("2024-06-11T10:30:00.000Z"),
      },
    ];
    const outcomes: FocusOutcomeLike[] = [
      {
        createdAt: new Date("2024-06-05T12:00:00.000Z"),
        bodyText: "Plan",
      },
    ];
    const rows = buildFocusWeekBreakdowns(entries, outcomes, [
      weekA,
      weekB,
      weekC,
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[0].autoBlurb).toContain("Plan");
    expect(rows[1].durationLabel).toBe("30m");
  });

  it("derives candidate weeks from focus data", () => {
    const ranges = weekRangesForFocusData(
      [{ startAt: new Date("2024-06-11T10:00:00.000Z") }],
      [],
      1,
      "UTC",
      new Date("2024-06-12T12:00:00.000Z"),
    );
    expect(ranges.length).toBeGreaterThanOrEqual(1);
  });
});
