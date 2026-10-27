/**
 * Server clock anchoring for the live timer (fixes cross-device skew).
 *
 * The timer renders `elapsed = now − session.start_at`, and `start_at` is
 * written by the server. Reading the local `Date` against it therefore mixes
 * two clocks: any client whose clock is fast (e.g. a desktop running ~15s
 * ahead) shows a timer that is ~15s ahead of a correctly-synced phone.
 *
 * We normalise every client reading onto the server clock:
 *   serverTime ≈ clientTime + offset
 *
 * Offset comes from one round trip: the server stamps `serverNow` on its
 * response, and the request's midpoint on the client is the best estimate of
 * the instant that stamp refers to.
 *
 * Pure functions only — no timers, no fetch, no clock reads.
 */

/** A single "what time is it on the server?" round trip. */
export type ClockSample = {
  /** Client clock when the request was sent. */
  requestSentAt: Date;
  /** Client clock when the response was fully received. */
  responseReceivedAt: Date;
  /** Server clock stamped into the response payload. */
  serverNow: Date;
};

/**
 * Round trips slower than this are not trustworthy: a lazy tab, a suspended
 * laptop, or a proxy stall makes the midpoint meaningless. Slow samples are
 * dropped rather than allowed to skew the offset.
 */
export const MAX_CLOCK_SAMPLE_RTT_MS = 10_000;

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

/** Offset in ms to add to a client clock reading to get server time. */
export function estimateClockOffset(sample: ClockSample): number {
  const { requestSentAt, responseReceivedAt, serverNow } = sample;
  const roundTripMs =
    responseReceivedAt.getTime() - requestSentAt.getTime();
  const midpoint = requestSentAt.getTime() + roundTripMs / 2;
  return Math.round(serverNow.getTime() - midpoint);
}

/** True when a sample can be used to compute an offset. */
export function isUsableClockSample(sample: ClockSample): boolean {
  const { requestSentAt, responseReceivedAt, serverNow } = sample;
  if (
    !isValidDate(requestSentAt) ||
    !isValidDate(responseReceivedAt) ||
    !isValidDate(serverNow)
  ) {
    return false;
  }
  const roundTripMs =
    responseReceivedAt.getTime() - requestSentAt.getTime();
  if (roundTripMs < 0) {
    // The client clock jumped backwards mid-request.
    return false;
  }
  return roundTripMs <= MAX_CLOCK_SAMPLE_RTT_MS;
}

/** Shift a client clock reading onto the server clock. */
export function serverNowFrom(clientNow: Date, offsetMs: number): Date {
  return new Date(clientNow.getTime() + offsetMs);
}

/**
 * Median of several samples, which absorbs one slow/jittery round trip.
 * Returns 0 (i.e. "trust the local clock") when nothing usable is available.
 */
export function medianClockOffset(samples: ClockSample[]): number {
  const usable = samples.filter(isUsableClockSample);
  if (usable.length === 0) {
    return 0;
  }
  const offsets = usable
    .map(estimateClockOffset)
    .sort((a, b) => a - b);
  const middle = Math.floor(offsets.length / 2);
  if (offsets.length % 2 === 1) {
    return offsets[middle]!;
  }
  return Math.round((offsets[middle - 1]! + offsets[middle]!) / 2);
}
