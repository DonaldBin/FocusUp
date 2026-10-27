/**
 * Client-side server clock sampling.
 *
 * The timer compares a live client reading with a server-written `start_at`.
 * If the client clock is off (a fast desktop is the reported case), the
 * elapsed time is permanently offset. We measure the offset by asking the
 * server what time it is and using the request midpoint as the reference
 * instant — see `lib/domain/serverClock` for the pure maths.
 *
 * Dependencies are injected so this is testable without a real network.
 */

import {
  medianClockOffset,
  type ClockSample,
} from "@/lib/domain/serverClock";

export const SERVER_CLOCK_PATH = "/api/sessions";

export type ServerClockDeps = {
  fetch: typeof fetch;
  now: () => Date;
};

export type MeasureClockOffsetInput = ServerClockDeps & {
  /** How many round trips to take. Median of them cancels jitter. */
  samples?: number;
  /** Endpoint that returns `{ ok, serverNow }`. Defaults to `/api/sessions`. */
  path?: string;
};

export type ClockOffsetResult = {
  /** Add to a client clock reading to get server time. 0 when unknown. */
  offsetMs: number;
  /** How many measurements were usable. */
  usable: number;
};

function parseServerNow(body: unknown): Date | null {
  if (typeof body !== "object" || body === null || !("serverNow" in body)) {
    return null;
  }
  const raw = (body as { serverNow: unknown }).serverNow;
  if (typeof raw !== "string") {
    return null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** One round trip. Returns null instead of throwing on any failure. */
export async function sampleServerClock(
  deps: ServerClockDeps,
  path: string = SERVER_CLOCK_PATH,
): Promise<ClockSample | null> {
  const requestSentAt = deps.now();
  try {
    const res = await deps.fetch(path, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const responseReceivedAt = deps.now();
    if (!res.ok) {
      return null;
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      return null;
    }
    const serverNow = parseServerNow(body);
    if (!serverNow) {
      return null;
    }
    return { requestSentAt, responseReceivedAt, serverNow };
  } catch {
    return null;
  }
}

/**
 * Take several samples and return the median offset. Never throws: if the
 * server cannot be reached we report `offsetMs: 0`, i.e. "trust the local
 * clock", which is the pre-existing behaviour.
 */
export async function measureClockOffset(
  input: MeasureClockOffsetInput,
): Promise<ClockOffsetResult> {
  const count = Math.max(1, Math.floor(input.samples ?? 1));
  const path = input.path ?? SERVER_CLOCK_PATH;
  const collected: ClockSample[] = [];

  for (let i = 0; i < count; i += 1) {
    const sample = await sampleServerClock(input, path);
    if (sample) {
      collected.push(sample);
    }
  }

  return {
    offsetMs: medianClockOffset(collected),
    usable: collected.length,
  };
}
