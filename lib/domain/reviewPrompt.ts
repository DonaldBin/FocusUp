/**
 * Home review prompt copy helpers (Task 7.2).
 */

import { WEEKDAY_LABELS } from "@/lib/domain/onboarding";
import { getWeekRange } from "@/lib/domain/week";

export function nextReviewInstant(
  now: Date,
  reviewWeekday: number,
  timeZone: string,
): Date {
  return getWeekRange(now, reviewWeekday, timeZone).end;
}

export function reviewWeekdayLabel(reviewWeekday: number): string {
  return (
    WEEKDAY_LABELS.find((d) => d.value === reviewWeekday)?.label ?? "Review day"
  );
}

/** Format a short local date for "Next review: Mon, Oct 27". */
export function formatNextReviewWhen(
  instant: Date,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(instant);
}
