import { describe, expect, it, vi } from "vitest";
import {
  submitReviewDecision,
  type SubmitReviewDeps,
} from "@/lib/db/submitReview";
import type { FocusRow, ReviewRow } from "@/lib/db/types";

function focus(partial: Partial<FocusRow> = {}): FocusRow {
  return {
    id: "f1",
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

function deps(overrides: Partial<SubmitReviewDeps> = {}): SubmitReviewDeps {
  return {
    getUserId: async () => "u1",
    listFocuses: async () => [
      focus({ id: "a", status: "active" }),
      focus({ id: "b", status: "paused" }),
      focus({ id: "c", status: "ended" }),
    ],
    updateFocusStatuses: async () => {},
    insertReview: async (input) =>
      ({
        id: "r1",
        user_id: input.userId,
        range_start: input.rangeStart,
        range_end: input.rangeEnd,
        merged: input.merged,
        decision: input.decision,
        adjust_note: input.adjustNote,
        decided_at: "2024-06-17T00:00:00.000Z",
        created_at: "2024-06-17T00:00:00.000Z",
      }) as ReviewRow,
    ...overrides,
  };
}

describe("submitReviewDecision", () => {
  it("rejects invalid decisions", async () => {
    const result = await submitReviewDecision(
      {
        rangeStart: "2024-06-10T00:00:00.000Z",
        rangeEnd: "2024-06-17T00:00:00.000Z",
        decision: "maybe",
      },
      deps(),
    );
    expect(result).toEqual({ ok: false, error: "Invalid decision" });
  });

  it("pauses all occupied focuses and writes a review row", async () => {
    const updateFocusStatuses = vi.fn(async () => {});
    const insertReview = vi.fn(
      async (input: {
        userId: string;
        rangeStart: string;
        rangeEnd: string;
        merged: boolean;
        decision: "pause";
        adjustNote: string | null;
      }) =>
        ({
          id: "r1",
          user_id: input.userId,
          range_start: input.rangeStart,
          range_end: input.rangeEnd,
          merged: input.merged,
          decision: input.decision,
          adjust_note: input.adjustNote,
          decided_at: "2024-06-17T00:00:00.000Z",
          created_at: "2024-06-17T00:00:00.000Z",
        }) as ReviewRow,
    );

    const result = await submitReviewDecision(
      {
        rangeStart: "2024-06-10T00:00:00.000Z",
        rangeEnd: "2024-06-17T00:00:00.000Z",
        decision: "pause",
      },
      deps({ updateFocusStatuses, insertReview }),
    );

    expect(result.ok).toBe(true);
    // Only rows whose status actually changes are written (b was already paused).
    expect(updateFocusStatuses).toHaveBeenCalledWith("u1", [
      { id: "a", status: "paused" },
    ]);
    expect(insertReview).toHaveBeenCalledWith(
      expect.objectContaining({ decision: "pause", adjustNote: null }),
    );
  });

  it("stores adjust note only for adjust", async () => {
    const insertReview = vi.fn(
      async (input: {
        userId: string;
        rangeStart: string;
        rangeEnd: string;
        merged: boolean;
        decision: "adjust";
        adjustNote: string | null;
      }) =>
        ({
          id: "r1",
          user_id: input.userId,
          range_start: input.rangeStart,
          range_end: input.rangeEnd,
          merged: input.merged,
          decision: input.decision,
          adjust_note: input.adjustNote,
          decided_at: "2024-06-17T00:00:00.000Z",
          created_at: "2024-06-17T00:00:00.000Z",
        }) as ReviewRow,
    );

    await submitReviewDecision(
      {
        rangeStart: "2024-06-10T00:00:00.000Z",
        rangeEnd: "2024-06-17T00:00:00.000Z",
        decision: "adjust",
        adjustNote: "  tighten scope  ",
      },
      deps({ insertReview }),
    );

    expect(insertReview).toHaveBeenCalledWith(
      expect.objectContaining({
        decision: "adjust",
        adjustNote: "tighten scope",
      }),
    );
  });
});
