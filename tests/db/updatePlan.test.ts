import { describe, expect, it, vi } from "vitest";
import { updatePlan, type UpdatePlanDeps } from "@/lib/db/profile";
import { DOWNGRADE_BLOCKED_MESSAGE } from "@/lib/domain/quota";
import type { PlanTier } from "@/lib/db/types";

function deps(overrides: Partial<UpdatePlanDeps> = {}): UpdatePlanDeps {
  return {
    getUserId: async () => "u1",
    getPlan: async () => "intense" as PlanTier,
    listFocusStatuses: async () => [
      { status: "active" },
      { status: "paused" },
      { status: "paused" },
      { status: "active" },
    ],
    savePlan: async () => {},
    ...overrides,
  };
}

describe("updatePlan", () => {
  it("blocks Intense → Standard when occupied > 3", async () => {
    const savePlan = vi.fn();
    const result = await updatePlan(
      "standard",
      deps({ savePlan }),
    );
    expect(result).toEqual({
      ok: false,
      error: DOWNGRADE_BLOCKED_MESSAGE,
    });
    expect(savePlan).not.toHaveBeenCalled();
  });

  it("allows Intense → Standard when occupied <= 3", async () => {
    const savePlan = vi.fn();
    const result = await updatePlan(
      "standard",
      deps({
        listFocusStatuses: async () => [
          { status: "active" },
          { status: "paused" },
          { status: "ended" },
        ],
        savePlan,
      }),
    );
    expect(result).toEqual({ ok: true, plan: "standard" });
    expect(savePlan).toHaveBeenCalledWith("standard");
  });

  it("allows Standard → Intense without quota check", async () => {
    const savePlan = vi.fn();
    const result = await updatePlan(
      "intense",
      deps({
        getPlan: async () => "standard",
        savePlan,
      }),
    );
    expect(result).toEqual({ ok: true, plan: "intense" });
    expect(savePlan).toHaveBeenCalledWith("intense");
  });
});
