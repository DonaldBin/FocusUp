/**
 * Focus status transitions (PRD §4.1 / Task 4.3).
 * Focuses are never hard-deleted — only moved to `ended`.
 */

import type { FocusStatus } from "@/lib/db/types";

const ALLOWED: Record<FocusStatus, readonly FocusStatus[]> = {
  active: ["paused", "ended"],
  paused: ["active", "ended"],
  ended: [],
};

export function canTransitionFocusStatus(
  from: FocusStatus,
  to: FocusStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED[from].includes(to);
}

export function assertFocusStatusTransition(
  from: FocusStatus,
  to: FocusStatus,
): { ok: true } | { ok: false; error: string } {
  if (!canTransitionFocusStatus(from, to)) {
    return {
      ok: false,
      error: `Cannot change status from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

export function isValidFocusStatus(value: string): value is FocusStatus {
  return value === "active" || value === "paused" || value === "ended";
}
