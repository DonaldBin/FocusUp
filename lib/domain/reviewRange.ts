/**
 * Pending weekly review range helpers (FocusUp PRD §4.5).
 * Multiple overdue weeks collapse into one span for a single decision.
 */

import { getWeekRange, type WeekRange } from "@/lib/domain/week";

export type PendingWeekRange = {
  start: Date;
  end: Date;
};

export type MergedReviewRange = {
  start: Date;
  end: Date;
  /** true when two or more pending weeks were combined */
  merged: boolean;
};

/** The week immediately before the current review window. */
export function previousWeekRange(current: WeekRange): WeekRange {
  const ms = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - ms),
    end: new Date(current.start.getTime()),
  };
}

/**
 * Weeks that ended at or before `now` and are not covered by a completed review.
 * `reviewedEnds` are `range_end` timestamps already decided.
 */
export function collectPendingWeeks(input: {
  now: Date;
  reviewWeekday: number;
  timeZone: string;
  reviewedEnds: readonly Date[];
  /** How many past weeks to scan (default 8). */
  lookbackWeeks?: number;
}): PendingWeekRange[] {
  const lookback = input.lookbackWeeks ?? 8;
  const covered = new Set(
    input.reviewedEnds.map((d) => d.toISOString()),
  );
  const pending: PendingWeekRange[] = [];
  let cursor = getWeekRange(
    input.now,
    input.reviewWeekday,
    input.timeZone,
  );

  for (let i = 0; i < lookback; i += 1) {
    const prev = previousWeekRange(cursor);
    if (prev.end.getTime() > input.now.getTime()) {
      cursor = prev;
      continue;
    }
    if (!covered.has(prev.end.toISOString())) {
      pending.push({ start: prev.start, end: prev.end });
    }
    cursor = prev;
  }

  return pending;
}

export function formatReviewLabel(
  start: Date,
  end: Date,
  merged: boolean,
): string {
  if (merged) {
    return formatMergedLabel(start, end);
  }
  return `Review for ${formatUtcMonthDay(start)} – ${formatUtcMonthDay(end)}`;
}

export function mergePendingRanges(
  pendingWeeks: PendingWeekRange[],
): MergedReviewRange | null {
  if (pendingWeeks.length === 0) {
    return null;
  }

  let startMs = pendingWeeks[0].start.getTime();
  let endMs = pendingWeeks[0].end.getTime();

  for (let i = 1; i < pendingWeeks.length; i += 1) {
    startMs = Math.min(startMs, pendingWeeks[i].start.getTime());
    endMs = Math.max(endMs, pendingWeeks[i].end.getTime());
  }

  return {
    start: new Date(startMs),
    end: new Date(endMs),
    merged: pendingWeeks.length > 1,
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function formatUtcMonthDay(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const day = date.getUTCDate();
  return `${month} ${day}`;
}

/** English label, e.g. "Review for Sep 1 – Sep 21 (merged)" */
export function formatMergedLabel(start: Date, end: Date): string {
  return `Review for ${formatUtcMonthDay(start)} – ${formatUtcMonthDay(end)} (merged)`;
}
