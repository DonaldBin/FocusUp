import { describe, expect, it, vi } from "vitest";
import {
  updateReviewSchedule,
  type UpdateReviewScheduleDeps,
} from "@/lib/db/profile";
import { getWeekRange } from "@/lib/domain/week";

function deps(
  overrides: Partial<UpdateReviewScheduleDeps> = {},
): UpdateReviewScheduleDeps {
  return {
    getUserId: async () => "u1",
    hasCompletedOnboarding: async () => true,
    saveSchedule: async () => {},
    ...overrides,
  };
}

describe("updateReviewSchedule", () => {
  it("rejects invalid weekday", async () => {
    const saveSchedule = vi.fn();
    const result = await updateReviewSchedule(
      { reviewWeekday: 7, timezone: "UTC" },
      deps({ saveSchedule }),
    );
    expect(result).toEqual({ ok: false, error: "Invalid review weekday" });
    expect(saveSchedule).not.toHaveBeenCalled();
  });

  it("rejects invalid timezone", async () => {
    const saveSchedule = vi.fn();
    const result = await updateReviewSchedule(
      { reviewWeekday: 1, timezone: "Not/AZone" },
      deps({ saveSchedule }),
    );
    expect(result).toEqual({ ok: false, error: "Invalid timezone" });
    expect(saveSchedule).not.toHaveBeenCalled();
  });

  it("saves schedule and getWeekRange uses the new timezone immediately", async () => {
    const saveSchedule = vi.fn();
    const result = await updateReviewSchedule(
      { reviewWeekday: 1, timezone: "Asia/Tokyo" },
      deps({ saveSchedule }),
    );
    expect(result).toEqual({
      ok: true,
      reviewWeekday: 1,
      timezone: "Asia/Tokyo",
    });
    expect(saveSchedule).toHaveBeenCalledWith({
      reviewWeekday: 1,
      timezone: "Asia/Tokyo",
    });

    if (!result.ok) {
      throw new Error("expected ok");
    }

    const now = new Date("2024-06-12T01:00:00.000Z");
    const before = getWeekRange(now, 1, "UTC");
    const after = getWeekRange(
      now,
      result.reviewWeekday,
      result.timezone,
    );
    expect(after.start.toISOString()).not.toBe(before.start.toISOString());
    expect(after.start.toISOString()).toBe("2024-06-09T15:00:00.000Z");
    expect(after.end.toISOString()).toBe("2024-06-16T15:00:00.000Z");
  });

  it("requires onboarding", async () => {
    const result = await updateReviewSchedule(
      { reviewWeekday: 1, timezone: "UTC" },
      deps({ hasCompletedOnboarding: async () => false }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Complete onboarding first",
    });
  });
});
