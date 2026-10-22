import { describe, expect, it } from "vitest";
import {
  appendWeekToSummary,
  buildInitialSummary,
  findUnappendedWeekBlurb,
  summaryEditorState,
} from "@/lib/domain/investmentSummary";

describe("buildInitialSummary", () => {
  it("returns empty string for no weeks", () => {
    expect(buildInitialSummary([])).toBe("");
  });

  it("joins week blurbs with blank lines", () => {
    expect(
      buildInitialSummary([
        "Week of Jun 3: 2h — wrote outline",
        "Week of Jun 10: 3h — shipped draft",
      ]),
    ).toBe(
      "Week of Jun 3: 2h — wrote outline\n\nWeek of Jun 10: 3h — shipped draft",
    );
  });

  it("skips blank blurbs", () => {
    expect(buildInitialSummary(["A", "  ", "B"])).toBe("A\n\nB");
  });
});

describe("appendWeekToSummary", () => {
  it("when user has not edited, replaces with initial join including the new week", () => {
    const result = appendWeekToSummary({
      existingSummary: "Week of Jun 3: 2h",
      priorWeekBlurbs: ["Week of Jun 3: 2h"],
      newWeekBlurb: "Week of Jun 10: 3h",
      userEdited: false,
    });
    expect(result).toEqual({
      kind: "replaced",
      summary:
        "Week of Jun 3: 2h\n\nWeek of Jun 10: 3h",
    });
  });

  it("when user edited, does not overwrite — returns needsConfirmAppend", () => {
    const result = appendWeekToSummary({
      existingSummary: "My custom notes about progress",
      priorWeekBlurbs: ["Week of Jun 3: 2h"],
      newWeekBlurb: "Week of Jun 10: 3h",
      userEdited: true,
    });
    expect(result).toEqual({
      kind: "needsConfirmAppend",
      existingSummary: "My custom notes about progress",
      pendingBlurb: "Week of Jun 10: 3h",
    });
  });

  it("appendConfirmed appends the new week after the user draft", () => {
    const result = appendWeekToSummary({
      existingSummary: "My custom notes about progress",
      priorWeekBlurbs: ["Week of Jun 3: 2h"],
      newWeekBlurb: "Week of Jun 10: 3h",
      userEdited: true,
      confirmAppend: true,
    });
    expect(result).toEqual({
      kind: "appended",
      summary: "My custom notes about progress\n\nWeek of Jun 10: 3h",
    });
  });

  it("never silently drops the user-edited summary", () => {
    const edited = "Keep this text";
    const result = appendWeekToSummary({
      existingSummary: edited,
      priorWeekBlurbs: [],
      newWeekBlurb: "Week of Jun 10: 1h",
      userEdited: true,
      confirmAppend: false,
    });
    expect(result.kind).toBe("needsConfirmAppend");
    if (result.kind === "needsConfirmAppend") {
      expect(result.existingSummary).toBe(edited);
    }
  });
});

describe("summaryEditorState / findUnappendedWeekBlurb", () => {
  it("drafts from weeks when nothing is saved yet", () => {
    expect(summaryEditorState(null, ["A", "B"])).toEqual({
      text: "A\n\nB",
      userEdited: false,
    });
  });

  it("keeps the saved user draft", () => {
    expect(summaryEditorState("My notes", ["A"])).toEqual({
      text: "My notes",
      userEdited: true,
    });
  });

  it("finds a week blurb missing from the saved summary", () => {
    expect(
      findUnappendedWeekBlurb("My notes\n\nA", ["A", "B"]),
    ).toBe("B");
    expect(findUnappendedWeekBlurb("My notes\n\nA\n\nB", ["A", "B"])).toBeNull();
  });
});
