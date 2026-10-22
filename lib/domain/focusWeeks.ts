/**
 * Per-focus weekly breakdown (FocusUp PRD §4.8 / Task 8.2).
 * Only weeks with time or outcomes for that focus are shown.
 */

import { getWeekRange, type WeekRange } from "@/lib/domain/week";
import { durationMs } from "@/lib/domain/timeEntry";
import { formatTotalInvested } from "@/lib/domain/totalInvested";

export type WeekRangeInput = {
  start: Date;
  end: Date;
};

export type FocusTimeEntryLike = {
  /** Wall-clock start; attribution uses this instant (PRD start-day rule). */
  startAt: Date;
  endAt?: Date;
};

export type FocusOutcomeLike = {
  createdAt: Date;
  bodyText?: string | null;
  numberValue?: number | null;
  url?: string | null;
};

export type FocusWeekBreakdown = {
  start: Date;
  end: Date;
  durationMs: number;
  durationLabel: string;
  autoBlurb: string;
};

function inWeek(instant: Date, week: WeekRangeInput): boolean {
  const t = instant.getTime();
  return t >= week.start.getTime() && t < week.end.getTime();
}

function weekHasData(
  week: WeekRangeInput,
  entries: FocusTimeEntryLike[],
  outcomes: FocusOutcomeLike[],
): boolean {
  const hasEntry = entries.some((e) => inWeek(e.startAt, week));
  if (hasEntry) {
    return true;
  }
  return outcomes.some((o) => inWeek(o.createdAt, week));
}

/**
 * Returns the subset of `weekRanges` that have at least one time entry
 * or outcome in [start, end). Order of `weekRanges` is preserved.
 */
export function weeksForFocus(
  entries: FocusTimeEntryLike[],
  outcomes: FocusOutcomeLike[],
  weekRanges: WeekRangeInput[],
): WeekRangeInput[] {
  return weekRanges.filter((week) => weekHasData(week, entries, outcomes));
}

/** Walk review weeks from the week containing `from` through the week containing `to`. */
export function enumerateWeekRanges(
  from: Date,
  to: Date,
  reviewWeekday: number,
  timeZone: string,
): WeekRangeInput[] {
  const earliest = from.getTime() <= to.getTime() ? from : to;
  const latest = from.getTime() <= to.getTime() ? to : from;
  const ranges: WeekRangeInput[] = [];
  let cursor: WeekRange = getWeekRange(earliest, reviewWeekday, timeZone);
  const guard = 104; // ~2 years

  for (let i = 0; i < guard; i += 1) {
    ranges.push({ start: cursor.start, end: cursor.end });
    if (cursor.end.getTime() > latest.getTime()) {
      break;
    }
    cursor = getWeekRange(cursor.end, reviewWeekday, timeZone);
  }

  return ranges;
}

export function durationMsInWeek(
  entries: FocusTimeEntryLike[],
  week: WeekRangeInput,
): number {
  let total = 0;
  for (const entry of entries) {
    if (!inWeek(entry.startAt, week) || !entry.endAt) {
      continue;
    }
    const ms = durationMs(entry.startAt, entry.endAt);
    if (ms > 0) {
      total += ms;
    }
  }
  return total;
}

export function outcomeLine(outcome: FocusOutcomeLike): string | null {
  const parts: string[] = [];
  if (outcome.bodyText?.trim()) {
    parts.push(outcome.bodyText.trim());
  }
  if (outcome.numberValue != null && Number.isFinite(outcome.numberValue)) {
    parts.push(`Number: ${outcome.numberValue}`);
  }
  if (outcome.url?.trim()) {
    parts.push(outcome.url.trim());
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
}

/** Draft weekly blurb: duration + outcome highlights. */
export function buildAutoBlurb(input: {
  durationMs: number;
  outcomes: FocusOutcomeLike[];
}): string {
  const durationLabel = formatTotalInvested(input.durationMs);
  const lines = input.outcomes
    .map(outcomeLine)
    .filter((line): line is string => line != null);
  if (lines.length === 0) {
    return `${durationLabel} invested`;
  }
  return `${durationLabel} invested. ${lines.join(" ")}`;
}

export function buildFocusWeekBreakdowns(
  entries: FocusTimeEntryLike[],
  outcomes: FocusOutcomeLike[],
  weekRanges: WeekRangeInput[],
): FocusWeekBreakdown[] {
  const weeks = weeksForFocus(entries, outcomes, weekRanges);
  return weeks.map((week) => {
    const weekEntries = entries.filter((e) => inWeek(e.startAt, week));
    const weekOutcomes = outcomes.filter((o) => inWeek(o.createdAt, week));
    const ms = durationMsInWeek(weekEntries, week);
    return {
      start: week.start,
      end: week.end,
      durationMs: ms,
      durationLabel: formatTotalInvested(ms),
      autoBlurb: buildAutoBlurb({ durationMs: ms, outcomes: weekOutcomes }),
    };
  });
}

/** Candidate weeks covering all entry/outcome timestamps. */
export function weekRangesForFocusData(
  entries: FocusTimeEntryLike[],
  outcomes: FocusOutcomeLike[],
  reviewWeekday: number,
  timeZone: string,
  now = new Date(),
): WeekRangeInput[] {
  const instants: Date[] = [
    ...entries.map((e) => e.startAt),
    ...outcomes.map((o) => o.createdAt),
  ];
  if (instants.length === 0) {
    return [];
  }
  let min = instants[0].getTime();
  let max = instants[0].getTime();
  for (const d of instants) {
    min = Math.min(min, d.getTime());
    max = Math.max(max, d.getTime());
  }
  max = Math.max(max, now.getTime());
  return enumerateWeekRanges(
    new Date(min),
    new Date(max),
    reviewWeekday,
    timeZone,
  );
}
