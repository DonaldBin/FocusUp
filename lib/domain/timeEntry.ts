/**
 * Time entry helpers (FocusUp PRD §4.3).
 * Duration is wall-clock end − start. Cross-midnight entries belong to the start day.
 * Stale detection never auto-stops a session — UI may warn only.
 */

/** 3 hours — remind on reopen; do not auto-stop. */
export const STALE_OPEN_SESSION_MS = 3 * 60 * 60 * 1000;

export function durationMs(start: Date, end: Date): number {
  return end.getTime() - start.getTime();
}

export function isStaleOpenSession(start: Date, now: Date): boolean {
  return now.getTime() - start.getTime() >= STALE_OPEN_SESSION_MS;
}

/** YYYY-MM-DD of `instant` in `timeZone` (start-day attribution). */
export function calendarDayKey(instant: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA yields YYYY-MM-DD
  return fmt.format(instant);
}
