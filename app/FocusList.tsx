"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActiveSessionRow, FocusRow, FocusStatus } from "@/lib/db/types";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

type Props = {
  focuses: FocusRow[];
  activeSession: ActiveSessionRow | null;
  /** Called after a successful online start/stop so sibling UI can update immediately. */
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

function FocusCard({
  focus,
  busy,
  isTiming,
  onStart,
  onStop,
  onStatus,
}: {
  focus: FocusRow;
  busy: boolean;
  isTiming: boolean;
  onStart: () => void;
  onStop: () => void;
  onStatus: (status: FocusStatus) => void;
}) {
  return (
    <li className="border border-base-300 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/focuses/${focus.id}`}
            className="font-medium link link-hover"
          >
            {focus.name}
          </Link>
          <p className="text-sm opacity-70">{focus.why}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="badge badge-ghost badge-sm capitalize">
            {focus.status}
          </span>
          {isTiming ? (
            <span className="badge badge-primary badge-sm">Timing</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {focus.status !== "ended" ? (
          isTiming ? (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              disabled={busy}
              onClick={onStop}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-xs"
              disabled={busy}
              onClick={onStart}
            >
              Start
            </button>
          )
        ) : null}
        {focus.status === "active" ? (
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={busy || isTiming}
            onClick={() => onStatus("paused")}
          >
            Pause focus
          </button>
        ) : null}
        {focus.status === "paused" ? (
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={busy}
            onClick={() => onStatus("active")}
          >
            Resume focus
          </button>
        ) : null}
        {focus.status !== "ended" ? (
          <button
            type="button"
            className="btn btn-outline btn-xs"
            disabled={busy || isTiming}
            onClick={() => onStatus("ended")}
          >
            End
          </button>
        ) : (
          <span className="text-xs opacity-50">Ended (kept)</span>
        )}
      </div>
    </li>
  );
}

export function FocusList({
  focuses,
  activeSession,
  onSessionLocalChange,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [endedOpen, setEndedOpen] = useState(false);

  const openFocuses = focuses.filter((f) => f.status !== "ended");
  const endedFocuses = focuses.filter((f) => f.status === "ended");

  async function setStatus(id: string, status: FocusStatus) {
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/focuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not update focus");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update focus");
    } finally {
      setPendingId(null);
    }
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

  async function stopTiming() {
    setError(null);
    setPendingId(activeSession?.focus_id ?? "stop");
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
      setError(e instanceof Error ? e.message : "Could not stop");
    } finally {
      setPendingId(null);
    }
  }

  if (focuses.length === 0) {
    return (
      <p className="text-sm opacity-60 text-center">No focuses yet.</p>
    );
  }

  return (
    <div className="w-full max-w-md space-y-3">
      <h2 className="text-lg font-semibold text-center">Your focuses</h2>
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
      <ul className="space-y-3">
        {openFocuses.map((focus) => (
          <FocusCard
            key={focus.id}
            focus={focus}
            busy={pendingId === focus.id}
            isTiming={activeSession?.focus_id === focus.id}
            onStart={() => void startTiming(focus.id)}
            onStop={() => void stopTiming()}
            onStatus={(status) => void setStatus(focus.id, status)}
          />
        ))}
      </ul>

      {endedFocuses.length > 0 ? (
        <div className="space-y-2">
          <button
            type="button"
            className="btn btn-ghost btn-sm w-full justify-between"
            aria-expanded={endedOpen}
            onClick={() => setEndedOpen((v) => !v)}
          >
            <span>
              Ended focuses ({endedFocuses.length})
            </span>
            <span className="opacity-60">{endedOpen ? "Hide" : "Show"}</span>
          </button>
          {endedOpen ? (
            <ul className="space-y-3">
              {endedFocuses.map((focus) => (
                <FocusCard
                  key={focus.id}
                  focus={focus}
                  busy={false}
                  isTiming={false}
                  onStart={() => {}}
                  onStop={() => {}}
                  onStatus={() => {}}
                />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
