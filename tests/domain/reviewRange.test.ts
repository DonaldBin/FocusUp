import { describe, expect, it } from "vitest";
import {
  collectPendingWeeks,
  formatMergedLabel,
  formatReviewLabel,
  mergePendingRanges,
  previousWeekRange,
  type PendingWeekRange,
} from "@/lib/domain/reviewRange";
import { getWeekRange } from "@/lib/domain/week";

function week(startIso: string, endIso: string): PendingWeekRange {
  return { start: new Date(startIso), end: new Date(endIso) };
}

describe("mergePendingRanges", () => {
  it("returns null for an empty list", () => {
    expect(mergePendingRanges([])).toBeNull();
  });

  it("keeps a single week and marks merged false", () => {
    const result = mergePendingRanges([
      week("2024-06-10T00:00:00.000Z", "2024-06-17T00:00:00.000Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.merged).toBe(false);
    expect(result!.start.toISOString()).toBe("2024-06-10T00:00:00.000Z");
    expect(result!.end.toISOString()).toBe("2024-06-17T00:00:00.000Z");
  });

  it("merges multiple weeks into one span from earliest start to latest end", () => {
    const result = mergePendingRanges([
      week("2024-06-17T00:00:00.000Z", "2024-06-24T00:00:00.000Z"),
      week("2024-06-03T00:00:00.000Z", "2024-06-10T00:00:00.000Z"),
      week("2024-06-10T00:00:00.000Z", "2024-06-17T00:00:00.000Z"),
    ]);
    expect(result).not.toBeNull();
    expect(result!.merged).toBe(true);
    expect(result!.start.toISOString()).toBe("2024-06-03T00:00:00.000Z");
    expect(result!.end.toISOString()).toBe("2024-06-24T00:00:00.000Z");
  });
});

describe("formatMergedLabel / formatReviewLabel", () => {
  it("formats English merged review label", () => {
    const label = formatMergedLabel(
      new Date("2024-09-01T00:00:00.000Z"),
      new Date("2024-09-21T00:00:00.000Z"),
    );
    expect(label).toBe("Review for Sep 1 – Sep 21 (merged)");
  });

  it("formats same-month and cross-month ranges", () => {
    expect(
      formatMergedLabel(
        new Date("2024-01-28T00:00:00.000Z"),
        new Date("2024-02-04T00:00:00.000Z"),
      ),
    ).toBe("Review for Jan 28 – Feb 4 (merged)");
  });

  it("omits merged suffix for a single week", () => {
    expect(
      formatReviewLabel(
        new Date("2024-09-01T00:00:00.000Z"),
        new Date("2024-09-08T00:00:00.000Z"),
        false,
      ),
    ).toBe("Review for Sep 1 – Sep 8");
  });
});

describe("previousWeekRange / collectPendingWeeks", () => {
  it("shifts one week backward", () => {
    const current = getWeekRange(
      new Date("2024-06-12T12:00:00.000Z"),
      1,
      "UTC",
    );
    const prev = previousWeekRange(current);
    expect(prev.end.toISOString()).toBe(current.start.toISOString());
    expect(prev.end.getTime() - prev.start.getTime()).toBe(
      current.end.getTime() - current.start.getTime(),
    );
  });

  it("lists uncovered past weeks and skips reviewed ends", () => {
    const now = new Date("2024-06-12T12:00:00.000Z"); // Wed
    const current = getWeekRange(now, 1, "UTC");
    const prev = previousWeekRange(current);
    const pending = collectPendingWeeks({
      now,
      reviewWeekday: 1,
      timeZone: "UTC",
      reviewedEnds: [prev.end],
      lookbackWeeks: 2,
    });
    expect(pending.some((w) => w.end.toISOString() === prev.end.toISOString())).toBe(
      false,
    );
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });
});
