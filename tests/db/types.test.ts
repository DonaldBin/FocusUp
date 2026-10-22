import { describe, expect, it } from "vitest";
import type { DatabaseTables, PlanTier } from "@/lib/db/types";

describe("db types (compile-time smoke)", () => {
  it("exposes expected table keys", () => {
    const keys: (keyof DatabaseTables)[] = [
      "profiles",
      "focuses",
      "time_entries",
      "outcomes",
      "reviews",
      "focus_week_snaps",
      "active_sessions",
    ];
    expect(keys).toHaveLength(7);
  });

  it("plan tiers match PRD", () => {
    const plans: PlanTier[] = ["standard", "intense"];
    expect(plans).toContain("standard");
    expect(plans).toContain("intense");
  });
});
