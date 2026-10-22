/** Focus quota rules from FocusUp PRD §4.2 */

export type FocusStatus = "active" | "paused" | "ended";
export type Plan = "standard" | "intense";

export type FocusQuotaInput = {
  status: FocusStatus;
};

export const PLAN_LIMITS: Record<Plan, number> = {
  standard: 3,
  intense: 7,
};

export function countOccupied(focuses: FocusQuotaInput[]): number {
  return focuses.filter(
    (f) => f.status === "active" || f.status === "paused",
  ).length;
}

export function canCreateFocus(
  focuses: FocusQuotaInput[],
  plan: Plan,
): boolean {
  return countOccupied(focuses) < PLAN_LIMITS[plan];
}

/** Intense → Standard only when occupied slots are already ≤ 3. */
export function canDowngradeToStandard(focuses: FocusQuotaInput[]): boolean {
  return countOccupied(focuses) <= PLAN_LIMITS.standard;
}

export const PAUSED_COUNT_MESSAGE =
  "Paused focuses still count toward your limit.";

export const DOWNGRADE_BLOCKED_MESSAGE =
  "End focuses until you have 3 or fewer active/paused focuses before switching to Standard.";
