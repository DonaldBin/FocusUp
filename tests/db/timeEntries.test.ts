import { describe, expect, it, vi } from "vitest";
import {
  createManualTimeEntry,
  deleteTimeEntry,
  updateTimeEntry,
  type TimeEntryWriteDeps,
} from "@/lib/db/timeEntries";
import type { FocusRow, TimeEntryRow } from "@/lib/db/types";

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

function entry(partial: Partial<TimeEntryRow> = {}): TimeEntryRow {
  return {
    id: "te1",
    user_id: "u1",
    focus_id: "f1",
    start_at: "2024-06-10T10:00:00.000Z",
    end_at: "2024-06-10T10:30:00.000Z",
    source: "manual",
    note: null,
    created_at: "2024-06-10T10:30:00.000Z",
    updated_at: "2024-06-10T10:30:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<TimeEntryWriteDeps> = {}): TimeEntryWriteDeps {
  return {
    getUserId: async () => "u1",
    getTimezone: async () => "UTC",
    getFocus: async () => focus(),
    getEntry: async () => entry(),
    insertManual: async (input) =>
      entry({
        focus_id: input.focusId,
        start_at: input.startAt,
        end_at: input.endAt,
        note: input.note,
        source: "manual",
      }),
    updateEntry: async (input) =>
      entry({
        id: input.id,
        start_at: input.startAt,
        end_at: input.endAt,
        note: input.note,
      }),
    deleteEntry: async () => {},
    ...overrides,
  };
}

describe("createManualTimeEntry", () => {
  it("requires sign-in", async () => {
    const result = await createManualTimeEntry(
      {
        focusId: "f1",
        startAt: "2024-06-10T10:00:00.000Z",
        durationMs: 60000,
      },
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("creates a manual entry from duration and returns dayKey", async () => {
    const result = await createManualTimeEntry(
      {
        focusId: "f1",
        startAt: "2024-06-10T10:00:00.000Z",
        durationMs: 30 * 60 * 1000,
        note: " gym ",
      },
      deps(),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.entry.source).toBe("manual");
      expect(result.entry.end_at).toBe("2024-06-10T10:30:00.000Z");
      expect(result.entry.note).toBe("gym");
      expect(result.dayKey).toBe("2024-06-10");
    }
  });

  it("rejects end before start", async () => {
    const result = await createManualTimeEntry(
      {
        focusId: "f1",
        startAt: "2024-06-10T11:00:00.000Z",
        endAt: "2024-06-10T10:00:00.000Z",
      },
      deps(),
    );
    expect(result).toEqual({
      ok: false,
      error: "End must be at or after start",
    });
  });
});

describe("updateTimeEntry", () => {
  it("updates duration from start", async () => {
    const updateEntry = vi.fn(
      async (input: {
        id: string;
        userId: string;
        startAt: string;
        endAt: string;
        note: string | null;
      }) =>
        entry({
          id: input.id,
          start_at: input.startAt,
          end_at: input.endAt,
          note: input.note,
        }),
    );
    const result = await updateTimeEntry(
      { id: "te1", durationMs: 45 * 60 * 1000 },
      deps({ updateEntry }),
    );
    expect(result.ok).toBe(true);
    expect(updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        endAt: "2024-06-10T10:45:00.000Z",
      }),
    );
  });

  it("keeps duration when only startAt changes", async () => {
    const updateEntry = vi.fn(
      async (input: {
        id: string;
        userId: string;
        startAt: string;
        endAt: string;
        note: string | null;
      }) =>
        entry({
          start_at: input.startAt,
          end_at: input.endAt,
        }),
    );
    const result = await updateTimeEntry(
      { id: "te1", startAt: "2024-06-10T11:00:00.000Z" },
      deps({ updateEntry }),
    );
    expect(result.ok).toBe(true);
    expect(updateEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        startAt: "2024-06-10T11:00:00.000Z",
        endAt: "2024-06-10T11:30:00.000Z",
      }),
    );
  });
});

describe("deleteTimeEntry", () => {
  it("deletes an owned entry", async () => {
    const deleteEntry = vi.fn();
    const result = await deleteTimeEntry("te1", deps({ deleteEntry }));
    expect(result).toEqual({ ok: true });
    expect(deleteEntry).toHaveBeenCalledWith("te1", "u1");
  });

  it("returns not found", async () => {
    const result = await deleteTimeEntry(
      "missing",
      deps({ getEntry: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Entry not found" });
  });
});
