/**
 * Account-level weekly review aggregates (PRD §4.5 / Task 9.1).
 * Range is half-open [start, end).
 */

import { durationMs } from "@/lib/domain/timeEntry";
import { formatTotalInvested } from "@/lib/domain/totalInvested";
import { outcomeLine, type FocusOutcomeLike } from "@/lib/domain/focusWeeks";

export type ReviewEntryLike = {
  startAt: Date;
  endAt: Date;
};

export type ReviewAggregate = {
  totalDurationMs: number;
  totalDurationLabel: string;
  entryCount: number;
  outcomeLines: string[];
};

function inRange(instant: Date, start: Date, end: Date): boolean {
  const t = instant.getTime();
  return t >= start.getTime() && t < end.getTime();
}

export function aggregateReviewRange(input: {
  entries: readonly ReviewEntryLike[];
  outcomes: readonly FocusOutcomeLike[];
  rangeStart: Date;
  rangeEnd: Date;
}): ReviewAggregate {
  const entries = input.entries.filter((e) =>
    inRange(e.startAt, input.rangeStart, input.rangeEnd),
  );
  let totalDurationMs = 0;
  for (const entry of entries) {
    const ms = durationMs(entry.startAt, entry.endAt);
    if (ms > 0) {
      totalDurationMs += ms;
    }
  }

  const outcomeLines = input.outcomes
    .filter((o) => inRange(o.createdAt, input.rangeStart, input.rangeEnd))
    .map(outcomeLine)
    .filter((line): line is string => line != null);

  return {
    totalDurationMs,
    totalDurationLabel: formatTotalInvested(totalDurationMs),
    entryCount: entries.length,
    outcomeLines,
  };
}
