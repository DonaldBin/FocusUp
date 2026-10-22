import { describe, expect, it, vi } from "vitest";
import {
  FOCUS_LIMIT_REACHED_MESSAGE,
  createFocus,
  normalizeFocusFields,
  updateFocusStatus,
  type CreateFocusDeps,
  type FocusListItem,
  type UpdateFocusStatusDeps,
} from "@/lib/db/focuses";
import { EXAMPLE_FOCUSES } from "@/lib/domain/focusExamples";
import type { FocusRow, FocusStatus, PlanTier } from "@/lib/db/types";

function makeFocusRow(partial: Partial<FocusRow> = {}): FocusRow {
  return {
    id: "f1",
    user_id: "u1",
    name: "Fitness",
    why: "Stay healthy",
    status: "active",
    last_used_at: null,
    investment_summary: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
    ...partial,
  };
}

function deps(overrides: Partial<CreateFocusDeps> = {}): CreateFocusDeps {
  return {
    getUserId: async () => "u1",
    getPlan: async () => "standard" as PlanTier,
    listFocusStatuses: async () => [] as FocusListItem[],
    insertFocus: async (input) =>
      makeFocusRow({ name: input.name, why: input.why }),
    ...overrides,
  };
}

describe("EXAMPLE_FOCUSES", () => {
  it("offers four single-create examples from the PRD", () => {
    expect(EXAMPLE_FOCUSES.map((e) => e.name)).toEqual([
      "Fitness",
      "Skill",
      "Learning",
      "Making money",
    ]);
    for (const example of EXAMPLE_FOCUSES) {
      expect(example.why.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("normalizeFocusFields", () => {
  it("trims name and why", () => {
    expect(normalizeFocusFields("  A  ", "  B  ")).toEqual({
      name: "A",
      why: "B",
    });
  });

  it("rejects empty name", () => {
    expect(normalizeFocusFields("   ", "why")).toEqual({
      error: "Name is required",
    });
  });

  it("rejects empty why", () => {
    expect(normalizeFocusFields("Name", "  ")).toEqual({
      error: "Why is required",
    });
  });
});

describe("createFocus", () => {
  it("requires sign-in", async () => {
    const result = await createFocus(
      { name: "A", why: "B" },
      deps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("requires completed onboarding plan", async () => {
    const result = await createFocus(
      { name: "A", why: "B" },
      deps({ getPlan: async () => null }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Complete onboarding first",
    });
  });

  it("creates when under Standard limit", async () => {
    const insertFocus = vi.fn(async (input: { name: string; why: string }) =>
      makeFocusRow({ name: input.name, why: input.why }),
    );
    const result = await createFocus(
      { name: " Fitness ", why: " Stay healthy " },
      deps({
        listFocusStatuses: async () => [{ status: "active" }, { status: "ended" }],
        insertFocus,
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.focus.name).toBe("Fitness");
      expect(result.focus.why).toBe("Stay healthy");
    }
    expect(insertFocus).toHaveBeenCalledWith({
      userId: "u1",
      name: "Fitness",
      why: "Stay healthy",
    });
  });

  it("blocks create when Standard slots are full (paused counts)", async () => {
    const insertFocus = vi.fn();
    const result = await createFocus(
      { name: "Fourth", why: "Too many" },
      deps({
        listFocusStatuses: async () => [
          { status: "active" },
          { status: "paused" },
          { status: "paused" },
        ],
        insertFocus,
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: FOCUS_LIMIT_REACHED_MESSAGE,
    });
    expect(insertFocus).not.toHaveBeenCalled();
  });

  it("allows create under Intense when Standard would be full", async () => {
    const result = await createFocus(
      { name: "Fourth", why: "Room on Intense" },
      deps({
        getPlan: async () => "intense",
        listFocusStatuses: async () => [
          { status: "active" },
          { status: "active" },
          { status: "paused" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("returns insert errors in English", async () => {
    const result = await createFocus(
      { name: "A", why: "B" },
      deps({
        insertFocus: async () => {
          throw new Error("duplicate key");
        },
      }),
    );
    expect(result).toEqual({ ok: false, error: "duplicate key" });
  });
});

function statusDeps(
  overrides: Partial<UpdateFocusStatusDeps> = {},
): UpdateFocusStatusDeps {
  const row = makeFocusRow({ status: "active" });
  return {
    getUserId: async () => "u1",
    getFocus: async () => row,
    saveStatus: async (_id, _userId, status) => makeFocusRow({ status }),
    ...overrides,
  };
}

describe("updateFocusStatus", () => {
  it("requires sign-in", async () => {
    const result = await updateFocusStatus(
      "f1",
      "paused",
      statusDeps({ getUserId: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Not signed in" });
  });

  it("rejects invalid status strings", async () => {
    const result = await updateFocusStatus("f1", "deleted", statusDeps());
    expect(result).toEqual({ ok: false, error: "Invalid status" });
  });

  it("returns not found when focus missing", async () => {
    const result = await updateFocusStatus(
      "missing",
      "ended",
      statusDeps({ getFocus: async () => null }),
    );
    expect(result).toEqual({ ok: false, error: "Focus not found" });
  });

  it("pauses an active focus", async () => {
    const saveStatus = vi.fn(
      async (_id: string, _userId: string, status: FocusStatus) =>
        makeFocusRow({ status }),
    );
    const result = await updateFocusStatus(
      "f1",
      "paused",
      statusDeps({ saveStatus }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.focus.status).toBe("paused");
    }
    expect(saveStatus).toHaveBeenCalledWith("f1", "u1", "paused");
  });

  it("resumes paused → active", async () => {
    const result = await updateFocusStatus(
      "f1",
      "active",
      statusDeps({
        getFocus: async () => makeFocusRow({ status: "paused" }),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.focus.status).toBe("active");
    }
  });

  it("ends a focus without deleting", async () => {
    const result = await updateFocusStatus("f1", "ended", statusDeps());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.focus.status).toBe("ended");
      expect(result.focus.id).toBe("f1");
    }
  });

  it("blocks reviving an ended focus", async () => {
    const saveStatus = vi.fn();
    const result = await updateFocusStatus(
      "f1",
      "active",
      statusDeps({
        getFocus: async () => makeFocusRow({ status: "ended" }),
        saveStatus,
      }),
    );
    expect(result).toEqual({
      ok: false,
      error: "Cannot change status from ended to active",
    });
    expect(saveStatus).not.toHaveBeenCalled();
  });
});
