/**
 * Display helpers for an open timer (Task 5.2).
 * Elapsed = now − startAt (wall clock). Never auto-stops.
 */

import { serverNowFrom } from "@/lib/domain/serverClock";
import { isStaleOpenSession } from "@/lib/domain/timeEntry";

export const STALE_OPEN_SESSION_HINT =
  "This session has been running for over 3 hours. You may have forgotten to stop — you can edit the duration later.";

export function elapsedMs(startAt: Date, now: Date): number {
  return Math.max(0, now.getTime() - startAt.getTime());
}

/**
 * Elapsed time for a live timer whose `startAt` was written by the server.
 *
 * Raw `elapsedMs(startAt, new Date())` mixes two clocks: a client running
 * 15s fast shows 0:15 the instant a session starts. `offsetMs` (client +
 * offset ≈ server time, see `lib/domain/serverClock`) puts both readings on
 * the server clock, so the timer starts at 0:00 and stays in step across
 * devices.
 */
export function liveElapsedMs(
  startAt: Date,
  clientNow: Date,
  offsetMs: number,
): number {
  return elapsedMs(startAt, serverNowFrom(clientNow, offsetMs));
}

/** Compact h/m/s for live timer UI. */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) {
    return `${h}:${pad(m)}:${pad(s)}`;
  }
  return `${m}:${pad(s)}`;
}

export function staleOpenSessionHint(
  startAt: Date,
  now: Date,
): string | null {
  return isStaleOpenSession(startAt, now) ? STALE_OPEN_SESSION_HINT : null;
}
