import { describe, expect, it } from "vitest";
import { exportAccountCsv, type ExportDataDeps } from "@/lib/db/exportData";
import type {
  FocusRow,
  OutcomeRow,
  ReviewRow,
  TimeEntryRow,
} from "@/lib/db/types";

function focus(partial: Partial<FocusRow> & Pick<FocusRow, "id" | "name">): FocusRow {
  return {
    user_id: "u1",
    why: "why",
    status: "active",
    last_used_at: null,
    investment_summary: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<ExportDataDeps> = {}): ExportDataDeps {
  return {
    getUserId: async () => "u1",
    listFocuses: async () => [focus({ id: "f1", name: "Fitness" })],
    listTimeEntries: async () => [] as TimeEntryRow[],
    listOutcomes: async () => [] as OutcomeRow[],
    listReviews: async () => [] as ReviewRow[],
    now: () => new Date("2026-10-22T12:00:00.000Z"),
    ...overrides,
  };
}

describe("exportAccountCsv", () => {
  it("requires sign-in", async () => {
    const result = await exportAccountCsv(
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("exports focuses section with filename", async () => {
    const result = await exportAccountCsv(deps());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filename).toBe("focusup-export-2026-10-22.csv");
    expect(result.csv).toContain("# focuses");
    expect(result.csv).toContain("Fitness");
    expect(result.csv).toContain("# time_entries");
    expect(result.csv).toContain("# outcomes");
    expect(result.csv).toContain("# reviews");
  });
});
