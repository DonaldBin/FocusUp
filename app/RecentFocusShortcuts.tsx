"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActiveSessionRow, FocusRow } from "@/lib/db/types";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

type Props = {
  focuses: FocusRow[];
  activeSession: ActiveSessionRow | null;
  onSessionLocalChange?: (session: ActiveSessionRow | null) => void;
};

function sessionFromResult(data: unknown): ActiveSessionRow | null {
  if (typeof data !== "object" || data === null || !("session" in data)) {
    return null;
  }
  const session = (data as { session: unknown }).session;
  if (session === null) {
    return null;
  }
  if (typeof session !== "object") {
    return null;
  }
  return session as ActiveSessionRow;
}

export function RecentFocusShortcuts({
  focuses,
  activeSession,
  onSessionLocalChange,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  if (focuses.length === 0) {
    return null;
  }

  async function startTiming(focusId: string) {
    setError(null);
    setPendingId(focusId);
    const clientUpdatedAt = new Date().toISOString();
    try {
      const result = await mutateOrQueue({
        type: "session.start",
        path: "/api/sessions",
        method: "POST",
        clientTimestamp: clientUpdatedAt,
        body: {
          action: "start",
          focusId,
          clientUpdatedAt,
        },
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "queued") {
        // Do not router.refresh() while offline — it reloads RSC and blanks the page.
        setError(result.message);
        return;
      }
      onSessionLocalChange?.(sessionFromResult(result.data));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start");
    } finally {
      setPendingId(null);
    }
  }

  async function pauseTiming() {
    setError(null);
    setPendingId(activeSession?.focus_id ?? "pause");
    const clientUpdatedAt = new Date().toISOString();
    try {
      const result = await mutateOrQueue({
        type: "session.stop",
        path: "/api/sessions",
        method: "POST",
        clientTimestamp: clientUpdatedAt,
        body: {
          action: "stop",
          clientUpdatedAt,
        },
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "queued") {
        setError(result.message);
        return;
      }
      onSessionLocalChange?.(sessionFromResult(result.data));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not pause");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <h2 className="text-sm font-semibold text-center opacity-70">
        Recent focuses
      </h2>
      {error ? (
        <p
          className={
            error === QUEUED_OFFLINE_MESSAGE
              ? "text-sm text-center opacity-70"
              : "text-error text-sm text-center"
          }
          role={error === QUEUED_OFFLINE_MESSAGE ? "status" : "alert"}
        >
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {focuses.map((focus) => {
          const busy = pendingId === focus.id;
          const isTiming = activeSession?.focus_id === focus.id;
          return (
            <li
              key={focus.id}
              className="flex items-center justify-between gap-2 border border-base-300 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <Link
                  href={`/focuses/${focus.id}`}
                  className="font-medium link link-hover truncate block"
                >
                  {focus.name}
                </Link>
                {isTiming ? (
                  <p className="text-xs text-primary">Timing</p>
                ) : null}
              </div>
              {isTiming ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm shrink-0"
                  disabled={busy}
                  onClick={() => void pauseTiming()}
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-sm shrink-0"
                  disabled={busy}
                  onClick={() => void startTiming(focus.id)}
                >
                  Start
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
