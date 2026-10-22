import { describe, expect, it } from "vitest";
import { aggregateReviewRange } from "@/lib/domain/reviewAggregate";

const start = new Date("2024-06-10T00:00:00.000Z");
const end = new Date("2024-06-17T00:00:00.000Z");

describe("aggregateReviewRange", () => {
  it("sums duration and counts entries inside the range", () => {
    const result = aggregateReviewRange({
      rangeStart: start,
      rangeEnd: end,
      entries: [
        {
          startAt: new Date("2024-06-11T10:00:00.000Z"),
          endAt: new Date("2024-06-11T11:00:00.000Z"),
        },
        {
          startAt: new Date("2024-06-12T10:00:00.000Z"),
          endAt: new Date("2024-06-12T10:30:00.000Z"),
        },
        {
          startAt: new Date("2024-06-01T10:00:00.000Z"),
          endAt: new Date("2024-06-01T12:00:00.000Z"),
        },
      ],
      outcomes: [],
    });
    expect(result.entryCount).toBe(2);
    expect(result.totalDurationLabel).toBe("1h 30m");
  });

  it("lists outcome text lines in range", () => {
    const result = aggregateReviewRange({
      rangeStart: start,
      rangeEnd: end,
      entries: [],
      outcomes: [
        {
          createdAt: new Date("2024-06-12T12:00:00.000Z"),
          bodyText: "Shipped",
          url: "https://example.com",
        },
        {
          createdAt: new Date("2024-06-01T12:00:00.000Z"),
          bodyText: "Too old",
        },
      ],
    });
    expect(result.outcomeLines).toEqual([
      "Shipped · https://example.com",
    ]);
  });

  it("uses half-open end boundary", () => {
    const result = aggregateReviewRange({
      rangeStart: start,
      rangeEnd: end,
      entries: [
        {
          startAt: new Date("2024-06-17T00:00:00.000Z"),
          endAt: new Date("2024-06-17T01:00:00.000Z"),
        },
      ],
      outcomes: [],
    });
    expect(result.entryCount).toBe(0);
  });
});
