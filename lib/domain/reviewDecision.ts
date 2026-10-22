/**
 * Weekly review decision application (FocusUp PRD §4.5 / Q50).
 * One decision applies to all occupied focuses (active + paused).
 * Ended focuses are left unchanged.
 */

export type FocusStatus = "active" | "paused" | "ended";

export type ReviewDecision = "continue" | "adjust" | "pause" | "end";

export type FocusForDecision = {
  id: string;
  status: FocusStatus;
};

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  continue: "Continue",
  adjust: "Adjust",
  pause: "Pause",
  end: "End",
};

export function isValidReviewDecision(value: string): value is ReviewDecision {
  return (
    value === "continue" ||
    value === "adjust" ||
    value === "pause" ||
    value === "end"
  );
}

function isOccupied(status: FocusStatus): boolean {
  return status === "active" || status === "paused";
}

function statusForDecision(decision: ReviewDecision): FocusStatus {
  switch (decision) {
    case "continue":
    case "adjust":
      return "active";
    case "pause":
      return "paused";
    case "end":
      return "ended";
  }
}

/**
 * Returns updated focuses. Does not mutate `focuses`.
 * `adjust` optional note is stored on the Review record elsewhere — status stays active.
 */
export function applyDecisionToFocuses(
  focuses: FocusForDecision[],
  decision: ReviewDecision,
): FocusForDecision[] {
  const nextStatus = statusForDecision(decision);
  return focuses.map((focus) => {
    if (!isOccupied(focus.status)) {
      return { ...focus };
    }
    return { ...focus, status: nextStatus };
  });
}
