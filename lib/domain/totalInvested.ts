/**
 * Focus Total invested (PRD §4.8 / Task 8.1).
 * Sum of wall-clock durations for all time entries on one focus.
 */

import { durationMs } from "@/lib/domain/timeEntry";

export type TimeRangeLike = {
  start_at: string | Date;
  end_at: string | Date;
};

export function totalInvestedMs(entries: readonly TimeRangeLike[]): number {
  let total = 0;
  for (const entry of entries) {
    const start =
      entry.start_at instanceof Date
        ? entry.start_at
        : new Date(entry.start_at);
    const end =
      entry.end_at instanceof Date ? entry.end_at : new Date(entry.end_at);
    const ms = durationMs(start, end);
    if (ms > 0) {
      total += ms;
    }
  }
  return total;
}

/** English compact label, e.g. `42h 15m`, `15m`, `0m`. */
export function formatTotalInvested(ms: number): string {
  const safe = Math.max(0, Math.floor(ms));
  const totalMinutes = Math.floor(safe / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}
