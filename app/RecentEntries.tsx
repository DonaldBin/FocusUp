"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FocusRow, TimeEntryRow } from "@/lib/db/types";
import { durationMs } from "@/lib/domain/timeEntry";

type Props = {
  entries: TimeEntryRow[];
  focuses: FocusRow[];
};

function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

/** Local calendar date + start time, e.g. 2026-10-22 13:05 */
function formatStartAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecentEntries({ entries, focuses }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState("");
  const [pending, setPending] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  const nameById = new Map(focuses.map((f) => [f.id, f.name]));

  async function saveDuration(id: string) {
    setError(null);
    const value = Number(minutes);
    if (!Number.isFinite(value) || value < 0) {
      setError("Duration must be a non-negative number");
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/time-entries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationMs: value * 60 * 1000 }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not update entry");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update entry");
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not delete entry");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete entry");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <h2 className="text-sm font-semibold text-center opacity-70">
        Recent time entries
      </h2>
      {error ? (
        <p className="text-error text-sm text-center" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="text-sm space-y-2">
        {entries.map((entry) => {
          const ms = durationMs(
            new Date(entry.start_at),
            new Date(entry.end_at),
          );
          const isEditing = editingId === entry.id;
          return (
            <li
              key={entry.id}
              className="border border-base-200 rounded-md p-2 space-y-2"
            >
              <div className="flex justify-between gap-2 opacity-80">
                <span className="min-w-0">
                  <span className="block font-medium">
                    {nameById.get(entry.focus_id) ?? "Focus"}
                  </span>
                  <span className="block text-xs opacity-70">
                    {formatStartAt(entry.start_at)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  {formatDuration(ms)} · {entry.source}
                </span>
              </div>
              {isEditing ? (
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    className="input input-bordered input-xs w-24"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    aria-label="Duration minutes"
                  />
                  <span className="text-xs opacity-60">minutes</span>
                  <button
                    type="button"
                    className="btn btn-primary btn-xs"
                    disabled={pending}
                    onClick={() => void saveDuration(entry.id)}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    disabled={pending}
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    disabled={pending}
                    onClick={() => {
                      setEditingId(entry.id);
                      setMinutes(String(Math.round(ms / 60000)));
                    }}
                  >
                    Edit duration
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-xs"
                    disabled={pending}
                    onClick={() => void remove(entry.id)}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
