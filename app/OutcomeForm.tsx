"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FocusRow } from "@/lib/db/types";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

type Props = {
  focuses: FocusRow[];
  /** Kept for call-site compatibility; linking to a time entry is no longer shown. */
  recentEntries?: unknown;
};

export function OutcomeForm({ focuses }: Props) {
  const router = useRouter();
  const usable = focuses.filter((f) => f.status !== "ended");
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(usable[0]?.id ?? "");
  const [summary, setSummary] = useState("");
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
      const clientTimestamp = new Date().toISOString();
      const result = await mutateOrQueue({
        type: "outcome.create",
        path: "/api/outcomes",
        method: "POST",
        clientTimestamp,
        body: {
          focusId,
          bodyText: summary.trim() || null,
          numberValue: null,
          url: null,
          timeEntryId: null,
        },
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "queued") {
        setError(result.message);
        setSummary("");
        return;
      }
      setSummary("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save outcome");
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
        <span>Add outcome (optional)</span>
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
            <span className="label-text">Process & result summary</span>
            <textarea
              className="textarea textarea-bordered w-full min-h-24"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={500}
              placeholder="What you did and how it went"
              required
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
            {pending ? "Saving…" : "Save outcome"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
