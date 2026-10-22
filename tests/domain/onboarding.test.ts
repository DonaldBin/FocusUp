import { describe, expect, it } from "vitest";
import {
  PLAN_LABELS,
  isOnboardingComplete,
  isValidPlan,
  isValidReviewWeekday,
  isValidTimezone,
} from "@/lib/domain/onboarding";

describe("PLAN_LABELS", () => {
  it("matches PRD English copy", () => {
    expect(PLAN_LABELS.standard).toBe("Standard — up to 3 focuses");
    expect(PLAN_LABELS.intense).toBe("Intense — up to 7 focuses");
  });
});

describe("isOnboardingComplete", () => {
  it("is false for null profile", () => {
    expect(isOnboardingComplete(null)).toBe(false);
  });

  it("is false when any required field is missing", () => {
    expect(
      isOnboardingComplete({
        plan: "standard",
        review_weekday: 1,
        timezone: "UTC",
        onboarding_completed_at: null,
      }),
    ).toBe(false);
    expect(
      isOnboardingComplete({
        plan: null,
        review_weekday: 1,
        timezone: "UTC",
        onboarding_completed_at: "2024-01-01T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("is true when plan, weekday, timezone, and completed_at are set", () => {
    expect(
      isOnboardingComplete({
        plan: "intense",
        review_weekday: 0,
        timezone: "Asia/Shanghai",
        onboarding_completed_at: "2024-01-01T00:00:00.000Z",
      }),
    ).toBe(true);
  });
});

describe("validators", () => {
  it("accepts only standard and intense plans", () => {
    expect(isValidPlan("standard")).toBe(true);
    expect(isValidPlan("intense")).toBe(true);
    expect(isValidPlan("pro")).toBe(false);
  });

  it("accepts weekdays 0–6", () => {
    expect(isValidReviewWeekday(0)).toBe(true);
    expect(isValidReviewWeekday(6)).toBe(true);
    expect(isValidReviewWeekday(7)).toBe(false);
    expect(isValidReviewWeekday(1.5)).toBe(false);
  });

  it("accepts real IANA timezones", () => {
    expect(isValidTimezone("UTC")).toBe(true);
    expect(isValidTimezone("America/New_York")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
    expect(isValidTimezone("")).toBe(false);
  });
});
