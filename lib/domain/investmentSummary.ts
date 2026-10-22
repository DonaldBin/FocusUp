/**
 * Focus investment summary helpers (FocusUp PRD §4.8).
 * User-saved text is never silently overwritten by a new week.
 */

export function buildInitialSummary(weekBlurbs: string[]): string {
  return weekBlurbs
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .join("\n\n");
}

export type AppendWeekInput = {
  existingSummary: string;
  priorWeekBlurbs: string[];
  newWeekBlurb: string;
  userEdited: boolean;
  /** When userEdited, set true after user confirms "Append this week?" */
  confirmAppend?: boolean;
};

export type AppendWeekResult =
  | { kind: "replaced"; summary: string }
  | { kind: "appended"; summary: string }
  | {
      kind: "needsConfirmAppend";
      existingSummary: string;
      pendingBlurb: string;
    };

function joinWithNewWeek(priorBlurbs: string[], newWeekBlurb: string): string {
  return buildInitialSummary([...priorBlurbs, newWeekBlurb]);
}

function appendBlurb(existingSummary: string, blurb: string): string {
  const base = existingSummary.trimEnd();
  const next = blurb.trim();
  if (!next) {
    return base;
  }
  if (!base) {
    return next;
  }
  return `${base}\n\n${next}`;
}

/**
 * Display text for the Investment summary editor.
 * Empty saved summary → draft from week blurbs (not yet user-owned).
 */
export function summaryEditorState(
  savedSummary: string | null | undefined,
  weekBlurbs: string[],
): { text: string; userEdited: boolean } {
  const saved = savedSummary?.trim() ?? "";
  if (saved) {
    return { text: saved, userEdited: true };
  }
  return {
    text: buildInitialSummary(weekBlurbs),
    userEdited: false,
  };
}

/** Latest week blurb not yet present in the saved summary. */
export function findUnappendedWeekBlurb(
  savedSummary: string,
  weekBlurbs: string[],
): string | null {
  const saved = savedSummary.trim();
  for (let i = weekBlurbs.length - 1; i >= 0; i -= 1) {
    const blurb = weekBlurbs[i].trim();
    if (!blurb) {
      continue;
    }
    if (!saved.includes(blurb)) {
      return blurb;
    }
  }
  return null;
}

/**
 * Apply a newly completed week to the focus investment summary.
 * - Not edited: rebuild from week blurbs (includes the new week).
 * - Edited without confirm: ask before append (no silent overwrite).
 * - Edited with confirm: append the new week blurb after the user draft.
 */
export function appendWeekToSummary(input: AppendWeekInput): AppendWeekResult {
  const pending = input.newWeekBlurb.trim();

  if (!input.userEdited) {
    return {
      kind: "replaced",
      summary: joinWithNewWeek(input.priorWeekBlurbs, pending),
    };
  }

  if (input.confirmAppend) {
    return {
      kind: "appended",
      summary: appendBlurb(input.existingSummary, pending),
    };
  }

  return {
    kind: "needsConfirmAppend",
    existingSummary: input.existingSummary,
    pendingBlurb: pending,
  };
}
