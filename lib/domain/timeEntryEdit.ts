/**
 * Manual / edit time entry rules (PRD §4.3 / Task 5.3).
 * Duration is wall-clock; calendar day uses start instant + timezone.
 */

import { calendarDayKey, durationMs } from "@/lib/domain/timeEntry";

export type TimeRangeInput = {
  startAt: Date;
  endAt: Date;
};

export function validateTimeRange(
  startAt: Date,
  endAt: Date,
): { ok: true } | { ok: false; error: string } {
  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return { ok: false, error: "Invalid start or end time" };
  }
  if (endAt.getTime() < startAt.getTime()) {
    return { ok: false, error: "End must be at or after start" };
  }
  return { ok: true };
}

/** Keep start; set end from duration (ms). */
export function endFromDuration(startAt: Date, durationMsValue: number): Date {
  if (!Number.isFinite(durationMsValue) || durationMsValue < 0) {
    throw new Error("Duration must be a non-negative number");
  }
  return new Date(startAt.getTime() + durationMsValue);
}

export function resolveTimeRange(input: {
  startAt: Date;
  endAt?: Date;
  durationMs?: number;
}): TimeRangeInput | { error: string } {
  if (input.endAt != null && input.durationMs != null) {
    return { error: "Provide either endAt or durationMs, not both" };
  }
  if (input.endAt != null) {
    const check = validateTimeRange(input.startAt, input.endAt);
    if (!check.ok) {
      return check;
    }
    return { startAt: input.startAt, endAt: input.endAt };
  }
  if (input.durationMs != null) {
    try {
      const endAt = endFromDuration(input.startAt, input.durationMs);
      return { startAt: input.startAt, endAt };
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Invalid duration",
      };
    }
  }
  return { error: "End time or duration is required" };
}

export function entryDayKey(
  startAt: Date,
  timeZone: string,
): string {
  return calendarDayKey(startAt, timeZone);
}

export function entryDurationMs(startAt: Date, endAt: Date): number {
  return durationMs(startAt, endAt);
}
