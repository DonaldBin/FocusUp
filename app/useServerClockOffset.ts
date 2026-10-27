"use client";

import { useEffect, useState } from "react";
import { measureClockOffset } from "@/lib/sync/serverClockClient";

/** Round trips taken on mount / when the tab becomes visible again. */
const SAMPLES = 3;
/** Re-measure periodically so a clock that drifts mid-session is corrected. */
const REFRESH_MS = 10 * 60 * 1000;

/**
 * Offset (ms) to add to a local clock reading to get server time.
 *
 * The live timer compares `new Date()` against `session.start_at`, which the
 * server wrote. Without this offset a client whose clock runs fast renders a
 * timer that is fast by the same amount (the "starts at 0:15" bug).
 *
 * Starts at 0 so first paint behaves exactly as before; the measurement
 * replaces it as soon as the first round trip lands.
 */
export function useServerClockOffset(): number {
  const [offsetMs, setOffsetMs] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function measure() {
      const result = await measureClockOffset({
        fetch: (...args) => globalThis.fetch(...args),
        now: () => new Date(),
        samples: SAMPLES,
      });
      if (!cancelled && result.usable > 0) {
        setOffsetMs(result.offsetMs);
      }
    }

    void measure();
    const intervalId = window.setInterval(() => void measure(), REFRESH_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void measure();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return offsetMs;
}
