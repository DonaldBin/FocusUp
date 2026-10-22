/**
 * Home empty-state rules (PRD §6.2 / Task 7.1).
 * Empty when there is no active or paused focus (ended do not fill the home).
 */

import type { FocusStatus } from "@/lib/db/types";

export const HOME_EMPTY_BLURB =
  "Pick a few focus areas, track time, and decide each week what continues.";

export function isHomeEmpty(
  focuses: ReadonlyArray<{ status: FocusStatus }>,
): boolean {
  return !focuses.some(
    (f) => f.status === "active" || f.status === "paused",
  );
}
