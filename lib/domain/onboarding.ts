/**
 * Onboarding completion rules (FocusUp PRD §6.1 / Task 3.2).
 */

import type { PlanTier } from "@/lib/db/types";

export type OnboardingProfileFields = {
  plan: PlanTier | null;
  review_weekday: number | null;
  timezone: string | null;
  onboarding_completed_at: string | null;
};

export const PLAN_LABELS: Record<PlanTier, string> = {
  standard: "Standard — up to 3 focuses",
  intense: "Intense — up to 7 focuses",
};

export const WEEKDAY_LABELS: { value: number; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function isOnboardingComplete(
  profile: OnboardingProfileFields | null | undefined,
): boolean {
  if (!profile) {
    return false;
  }
  return (
    profile.onboarding_completed_at != null &&
    profile.plan != null &&
    profile.review_weekday != null &&
    profile.review_weekday >= 0 &&
    profile.review_weekday <= 6 &&
    typeof profile.timezone === "string" &&
    profile.timezone.trim().length > 0
  );
}

export function isValidPlan(plan: string): plan is PlanTier {
  return plan === "standard" || plan === "intense";
}

export function isValidReviewWeekday(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

export function isValidTimezone(timezone: string): boolean {
  const tz = timezone.trim();
  if (!tz) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
