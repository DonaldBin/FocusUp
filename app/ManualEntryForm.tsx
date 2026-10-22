"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FocusRow } from "@/lib/db/types";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

type Props = {
  focuses: FocusRow[];
};

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ManualEntryForm({ focuses }: Props) {
  const router = useRouter();
  const usable = focuses.filter((f) => f.status !== "ended");
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(usable[0]?.id ?? "");
  const [startAt, setStartAt] = useState(() =>
    toLocalInputValue(new Date(Date.now() - 30 * 60 * 1000)),
  );
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (usable.length === 0) {
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const start = new Date(startAt);
      const minutes = Number(durationMinutes);
      if (!Number.isFinite(minutes) || minutes < 0) {
        setError("Duration must be a non-negative number");
        setPending(false);
        return;
      }
      const clientTimestamp = new Date().toISOString();
      const end = new Date(start.getTime() + minutes * 60 * 1000);
      const result = await mutateOrQueue({
        type: "time_entry.create",
        path: "/api/time-entries",
        method: "POST",
        clientTimestamp,
        body: {
          focusId,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          note: note.trim() || null,
        },
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "queued") {
        // Do not router.refresh() while offline — it reloads RSC and blanks the page.
        setError(result.message);
        setNote("");
        return;
      }
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add entry");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <button
        type="button"
        className="btn btn-ghost btn-sm w-full justify-between"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Add time (manual)</span>
        <span className="opacity-60">{open ? "Hide" : "Show"}</span>
      </button>

      {open ? (
        <form
          onSubmit={onSubmit}
          className="space-y-3 border border-base-300 rounded-lg p-4"
        >
          <label className="form-control w-full">
            <span className="label-text">Focus</span>
            <select
              className="select select-bordered w-full"
              value={focusId}
              onChange={(e) => setFocusId(e.target.value)}
              required
            >
              {usable.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-control w-full">
            <span className="label-text">Start</span>
            <input
              type="datetime-local"
              className="input input-bordered w-full"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              required
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Duration (minutes)</span>
            <input
              type="number"
              min={0}
              step={1}
              className="input input-bordered w-full"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Note (optional)</span>
            <input
              className="input input-bordered w-full"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
            />
          </label>
          {error ? (
            <p
              className={
                error === QUEUED_OFFLINE_MESSAGE
                  ? "text-sm opacity-70"
                  : "text-error text-sm"
              }
              role={error === QUEUED_OFFLINE_MESSAGE ? "status" : "alert"}
            >
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="btn btn-outline w-full"
            disabled={pending}
          >
            {pending ? "Saving…" : "Add entry"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
