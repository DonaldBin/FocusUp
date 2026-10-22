import { describe, expect, it } from "vitest";
import {
  assertFocusStatusTransition,
  canTransitionFocusStatus,
  isValidFocusStatus,
} from "@/lib/domain/focusStatus";

describe("canTransitionFocusStatus", () => {
  it("allows active → paused and active → ended", () => {
    expect(canTransitionFocusStatus("active", "paused")).toBe(true);
    expect(canTransitionFocusStatus("active", "ended")).toBe(true);
  });

  it("allows paused → active (resume) and paused → ended", () => {
    expect(canTransitionFocusStatus("paused", "active")).toBe(true);
    expect(canTransitionFocusStatus("paused", "ended")).toBe(true);
  });

  it("blocks any transition from ended (history only)", () => {
    expect(canTransitionFocusStatus("ended", "active")).toBe(false);
    expect(canTransitionFocusStatus("ended", "paused")).toBe(false);
    expect(canTransitionFocusStatus("ended", "ended")).toBe(false);
  });

  it("blocks no-op same-status changes", () => {
    expect(canTransitionFocusStatus("active", "active")).toBe(false);
    expect(canTransitionFocusStatus("paused", "paused")).toBe(false);
  });
});

describe("assertFocusStatusTransition", () => {
  it("returns English error for illegal transitions", () => {
    expect(assertFocusStatusTransition("ended", "active")).toEqual({
      ok: false,
      error: "Cannot change status from ended to active",
    });
  });

  it("accepts legal transitions", () => {
    expect(assertFocusStatusTransition("paused", "active")).toEqual({
      ok: true,
    });
  });
});

describe("isValidFocusStatus", () => {
  it("accepts only active/paused/ended", () => {
    expect(isValidFocusStatus("active")).toBe(true);
    expect(isValidFocusStatus("paused")).toBe(true);
    expect(isValidFocusStatus("ended")).toBe(true);
    expect(isValidFocusStatus("deleted")).toBe(false);
  });
});
