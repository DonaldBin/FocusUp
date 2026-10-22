import { describe, expect, it } from "vitest";
import {
  applyDecisionToFocuses,
  isValidReviewDecision,
  type FocusForDecision,
  type ReviewDecision,
} from "@/lib/domain/reviewDecision";

function f(
  id: string,
  status: FocusForDecision["status"],
): FocusForDecision {
  return { id, status };
}

describe("isValidReviewDecision", () => {
  it("accepts the four PRD decisions", () => {
    expect(isValidReviewDecision("pause")).toBe(true);
    expect(isValidReviewDecision("nope")).toBe(false);
  });
});

describe("applyDecisionToFocuses", () => {
  const occupied: FocusForDecision[] = [
    f("a", "active"),
    f("b", "paused"),
    f("c", "ended"),
  ];

  it("does not change ended focuses for any decision", () => {
    const decisions: ReviewDecision[] = [
      "continue",
      "adjust",
      "pause",
      "end",
    ];
    for (const decision of decisions) {
      const result = applyDecisionToFocuses(occupied, decision);
      expect(result.find((x) => x.id === "c")?.status).toBe("ended");
    }
  });

  it("sets all occupied focuses to active on continue", () => {
    const result = applyDecisionToFocuses(occupied, "continue");
    expect(result.find((x) => x.id === "a")?.status).toBe("active");
    expect(result.find((x) => x.id === "b")?.status).toBe("active");
  });

  it("sets all occupied focuses to active on adjust (note is separate)", () => {
    const result = applyDecisionToFocuses(occupied, "adjust");
    expect(result.find((x) => x.id === "a")?.status).toBe("active");
    expect(result.find((x) => x.id === "b")?.status).toBe("active");
  });

  it("pauses all occupied focuses on pause", () => {
    const result = applyDecisionToFocuses(occupied, "pause");
    expect(result.find((x) => x.id === "a")?.status).toBe("paused");
    expect(result.find((x) => x.id === "b")?.status).toBe("paused");
    expect(result.find((x) => x.id === "c")?.status).toBe("ended");
  });

  it("ends all occupied focuses on end", () => {
    const result = applyDecisionToFocuses(occupied, "end");
    expect(result.find((x) => x.id === "a")?.status).toBe("ended");
    expect(result.find((x) => x.id === "b")?.status).toBe("ended");
    expect(result.find((x) => x.id === "c")?.status).toBe("ended");
  });

  it("returns a new array and does not mutate inputs", () => {
    const input = [f("a", "active"), f("b", "paused")];
    const snapshot = input.map((x) => ({ ...x }));
    const result = applyDecisionToFocuses(input, "end");
    expect(input).toEqual(snapshot);
    expect(result).not.toBe(input);
    expect(result.every((x) => x.status === "ended")).toBe(true);
  });

  it("applies one decision to every occupied focus (single decision for all)", () => {
    const many = [
      f("1", "active"),
      f("2", "active"),
      f("3", "paused"),
      f("4", "ended"),
    ];
    const result = applyDecisionToFocuses(many, "pause");
    expect(result.filter((x) => x.status === "paused").map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(result.find((x) => x.id === "4")?.status).toBe("ended");
  });
});
