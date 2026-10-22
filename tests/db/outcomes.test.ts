import { describe, expect, it, vi } from "vitest";
import {
  createOutcome,
  deleteOutcome,
  updateOutcome,
  type OutcomeDeps,
} from "@/lib/db/outcomes";
import type { FocusRow, OutcomeRow, TimeEntryRow } from "@/lib/db/types";

function focus(partial: Partial<FocusRow> = {}): FocusRow {
  return {
    id: "f1",
    user_id: "u1",
    name: "Fitness",
    why: "why",
    status: "active",
    last_used_at: null,
    investment_summary: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

function outcome(partial: Partial<OutcomeRow> = {}): OutcomeRow {
  return {
    id: "o1",
    user_id: "u1",
    focus_id: "f1",
    time_entry_id: null,
    body_text: "Shipped",
    number_value: null,
    url: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

function entry(partial: Partial<TimeEntryRow> = {}): TimeEntryRow {
  return {
    id: "te1",
    user_id: "u1",
    focus_id: "f1",
    start_at: "2024-06-10T10:00:00.000Z",
    end_at: "2024-06-10T10:30:00.000Z",
    source: "timer",
    note: null,
    created_at: "2024-06-10T10:30:00.000Z",
    updated_at: "2024-06-10T10:30:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<OutcomeDeps> = {}): OutcomeDeps {
  return {
    getUserId: async () => "u1",
    getFocus: async () => focus(),
    getTimeEntry: async () => entry(),
    getOutcome: async () => outcome(),
    insertOutcome: async (input) =>
      outcome({
        focus_id: input.focusId,
        time_entry_id: input.timeEntryId,
        body_text: input.fields.bodyText,
        number_value: input.fields.numberValue,
        url: input.fields.url,
      }),
    updateOutcome: async (input) =>
      outcome({
        id: input.id,
        time_entry_id: input.timeEntryId,
        body_text: input.fields.bodyText,
        number_value: input.fields.numberValue,
        url: input.fields.url,
      }),
    deleteOutcome: async () => {},
    ...overrides,
  };
}

describe("createOutcome", () => {
  it("requires sign-in", async () => {
    const result = await createOutcome(
      { focusId: "f1", bodyText: "x" },
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("creates with a link only and optional time entry", async () => {
    const insertOutcome = vi.fn(
      async (input: {
        userId: string;
        focusId: string;
        timeEntryId: string | null;
        fields: {
          bodyText: string | null;
          numberValue: number | null;
          url: string | null;
        };
      }) =>
        outcome({
          focus_id: input.focusId,
          time_entry_id: input.timeEntryId,
          body_text: input.fields.bodyText,
          number_value: input.fields.numberValue,
          url: input.fields.url,
        }),
    );
    const result = await createOutcome(
      {
        focusId: "f1",
        timeEntryId: "te1",
        url: "https://example.com/pr",
      },
      deps({ insertOutcome }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome.url).toContain("https://example.com/pr");
      expect(result.outcome.time_entry_id).toBe("te1");
      expect(result.outcome.body_text).toBeNull();
    }
  });

  it("allows skipping outcome entirely at the product level (rejects empty row)", async () => {
    const result = await createOutcome({ focusId: "f1" }, deps());
    expect(result.ok).toBe(false);
  });
});

describe("updateOutcome / deleteOutcome", () => {
  it("updates fields", async () => {
    const result = await updateOutcome(
      { id: "o1", numberValue: 5, bodyText: null },
      deps(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.outcome.number_value).toBe(5);
    }
  });

  it("deletes an owned outcome", async () => {
    const deleteFn = vi.fn();
    const result = await deleteOutcome("o1", deps({ deleteOutcome: deleteFn }));
    expect(result).toEqual({ ok: true });
    expect(deleteFn).toHaveBeenCalledWith("o1", "u1");
  });
});
