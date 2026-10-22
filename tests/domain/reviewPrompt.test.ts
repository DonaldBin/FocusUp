import { describe, expect, it } from "vitest";
import {
  formatNextReviewWhen,
  nextReviewInstant,
  reviewWeekdayLabel,
} from "@/lib/domain/reviewPrompt";

describe("reviewPrompt helpers", () => {
  it("maps weekday numbers to English labels", () => {
    expect(reviewWeekdayLabel(1)).toBe("Monday");
    expect(reviewWeekdayLabel(4)).toBe("Thursday");
  });

  it("points next review at the end of the current week window", () => {
    const now = new Date("2024-06-12T12:00:00.000Z"); // Wed
    const next = nextReviewInstant(now, 1, "UTC");
    expect(next.toISOString()).toBe("2024-06-17T00:00:00.000Z");
  });

  it("formats next review when in the account timezone", () => {
    const text = formatNextReviewWhen(
      new Date("2024-06-17T00:00:00.000Z"),
      "UTC",
    );
    expect(text).toContain("Jun");
    expect(text).toContain("17");
  });
});
