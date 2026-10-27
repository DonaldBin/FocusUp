"use client";

import { useEffect, useState } from "react";
import type { ActiveSessionRow, FocusRow } from "@/lib/db/types";
import {
  formatElapsed,
  liveElapsedMs,
  staleOpenSessionHint,
} from "@/lib/domain/elapsedDisplay";
import { serverNowFrom } from "@/lib/domain/serverClock";

type Props = {
  session: ActiveSessionRow;
  focuses: FocusRow[];
  /** Client → server clock offset, so both readings share one clock. */
  clockOffsetMs: number;
};

export function ActiveTimerBanner({
  session,
  focuses,
  clockOffsetMs,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const startAt = new Date(session.start_at);
  const name =
    focuses.find((f) => f.id === session.focus_id)?.name ?? "Focus";
  const elapsed = formatElapsed(liveElapsedMs(startAt, now, clockOffsetMs));
  const staleHint = staleOpenSessionHint(
    startAt,
    serverNowFrom(now, clockOffsetMs),
  );

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [session.start_at, session.focus_id]);

  return (
    <div className="w-full max-w-md space-y-2 text-center">
      <p className="text-sm opacity-70">Timing · {name}</p>
      <p className="text-3xl font-mono font-semibold tabular-nums" aria-live="polite">
        {elapsed}
      </p>
      {staleHint ? (
        <p className="text-warning text-sm" role="status">
          {staleHint}
        </p>
      ) : null}
    </div>
  );
}
