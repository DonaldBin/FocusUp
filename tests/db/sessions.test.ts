import { describe, expect, it, vi } from "vitest";
import {
  STALE_SESSION_WRITE_MESSAGE,
  startSession,
  stopSession,
  type SessionDeps,
} from "@/lib/db/sessions";
import type {
  ActiveSessionRow,
  FocusRow,
  TimeEntryRow,
} from "@/lib/db/types";

function focus(partial: Partial<FocusRow> = {}): FocusRow {
  return {
    id: "focus-a",
    user_id: "u1",
    name: "A",
    why: "why",
    status: "active",
    last_used_at: null,
    investment_summary: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

function session(partial: Partial<ActiveSessionRow> = {}): ActiveSessionRow {
  return {
    user_id: "u1",
    focus_id: "focus-a",
    start_at: "2024-01-01T10:00:00.000Z",
    updated_at: "2024-01-01T10:00:00.000Z",
    ...partial,
  };
}

function entry(partial: Partial<TimeEntryRow> = {}): TimeEntryRow {
  return {
    id: "te1",
    user_id: "u1",
    focus_id: "focus-a",
    start_at: "2024-01-01T10:00:00.000Z",
    end_at: "2024-01-01T10:30:00.000Z",
    source: "timer",
    note: null,
    created_at: "2024-01-01T10:30:00.000Z",
    updated_at: "2024-01-01T10:30:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<SessionDeps> = {}): SessionDeps {
  return {
    getUserId: async () => "u1",
    getFocus: async (id) => focus({ id }),
    getActiveSession: async () => null,
    insertTimeEntry: async (input) =>
      entry({
        focus_id: input.focusId,
        start_at: input.startAt,
        end_at: input.endAt,
      }),
    upsertSession: async (input) =>
      session({
        focus_id: input.focusId,
        start_at: input.startAt,
        updated_at: input.updatedAt,
      }),
    deleteSession: async () => {},
    markFocusActiveAndUsed: async () => {},
    touchFocusUsed: async () => {},
    ...overrides,
  };
}

const t1 = new Date("2024-01-01T10:00:00.000Z");
const t2 = new Date("2024-01-01T10:30:00.000Z");

describe("startSession", () => {
  it("requires sign-in", async () => {
    const result = await startSession(
      { focusId: "focus-a", now: t1 },
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("rejects ended focuses", async () => {
    const result = await startSession(
      { focusId: "focus-a", now: t1 },
      deps({
        getFocus: async () => focus({ status: "ended" }),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Cannot start an ended focus",
    });
  });

  it("starts when no open session", async () => {
    const upsertSession = vi.fn(
      async (input: {
        userId: string;
        focusId: string;
        startAt: string;
        updatedAt: string;
      }) =>
        session({
          focus_id: input.focusId,
          start_at: input.startAt,
          updated_at: input.updatedAt,
        }),
    );
    const result = await startSession(
      { focusId: "focus-b", now: t1 },
      deps({ upsertSession }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session?.focus_id).toBe("focus-b");
      expect(result.closedEntry).toBeNull();
    }
    expect(upsertSession).toHaveBeenCalled();
  });

  it("closes previous session into a time_entry when starting another focus", async () => {
    const insertTimeEntry = vi.fn(
      async (input: {
        userId: string;
        focusId: string;
        startAt: string;
        endAt: string;
      }) =>
        entry({
          focus_id: input.focusId,
          start_at: input.startAt,
          end_at: input.endAt,
        }),
    );
    const result = await startSession(
      { focusId: "focus-b", now: t2 },
      deps({
        getActiveSession: async () =>
          session({
            focus_id: "focus-a",
            start_at: t1.toISOString(),
            updated_at: t1.toISOString(),
          }),
        insertTimeEntry,
        upsertSession: async (input) =>
          session({
            focus_id: input.focusId,
            start_at: input.startAt,
            updated_at: input.updatedAt,
          }),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.closedEntry?.focus_id).toBe("focus-a");
      expect(result.closedEntry?.start_at).toBe(t1.toISOString());
      expect(result.closedEntry?.end_at).toBe(t2.toISOString());
      expect(result.session?.focus_id).toBe("focus-b");
    }
    expect(insertTimeEntry).toHaveBeenCalledTimes(1);
  });

  it("reactivates a paused focus on start", async () => {
    const markFocusActiveAndUsed = vi.fn();
    const result = await startSession(
      { focusId: "focus-a", now: t1 },
      deps({
        getFocus: async () => focus({ status: "paused" }),
        markFocusActiveAndUsed,
      }),
    );
    expect(result.ok).toBe(true);
    expect(markFocusActiveAndUsed).toHaveBeenCalled();
  });

  it("rejects stale last-write when existing session is newer", async () => {
    const result = await startSession(
      {
        focusId: "focus-b",
        now: t2,
        clientUpdatedAt: "2024-01-01T09:00:00.000Z",
      },
      deps({
        getActiveSession: async () =>
          session({ updated_at: "2024-01-01T10:00:00.000Z" }),
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: STALE_SESSION_WRITE_MESSAGE,
    });
  });
});

describe("stopSession", () => {
  it("writes a time_entry and clears the open session", async () => {
    const deleteSession = vi.fn();
    const result = await stopSession(
      { now: t2 },
      deps({
        getActiveSession: async () =>
          session({
            focus_id: "focus-a",
            start_at: t1.toISOString(),
            updated_at: t1.toISOString(),
          }),
        deleteSession,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session).toBeNull();
      expect(result.closedEntry?.focus_id).toBe("focus-a");
      expect(result.closedEntry?.end_at).toBe(t2.toISOString());
    }
    expect(deleteSession).toHaveBeenCalledWith("u1");
  });

  it("is a no-op when nothing is running", async () => {
    const result = await stopSession({ now: t1 }, deps());
    expect(result).toEqual({
      ok: true,
      session: null,
      closedEntry: null,
    });
  });
});
