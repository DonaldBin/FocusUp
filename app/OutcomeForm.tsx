"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FocusRow, TimeEntryRow } from "@/lib/db/types";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

type Props = {
  focuses: FocusRow[];
  recentEntries: TimeEntryRow[];
};

export function OutcomeForm({ focuses, recentEntries }: Props) {
  const router = useRouter();
  const usable = focuses.filter((f) => f.status !== "ended");
  const [open, setOpen] = useState(false);
  const [focusId, setFocusId] = useState(usable[0]?.id ?? "");
  const [bodyText, setBodyText] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [url, setUrl] = useState("");
  const [timeEntryId, setTimeEntryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (usable.length === 0) {
    return null;
  }

  const entriesForFocus = recentEntries.filter((e) => e.focus_id === focusId);

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
          bodyText: bodyText.trim() || null,
          numberValue: numberValue.trim() === "" ? null : numberValue,
          url: url.trim() || null,
          timeEntryId: timeEntryId || null,
        },
      });
      if (result.status === "error") {
        setError(result.error);
        return;
      }
      if (result.status === "queued") {
        // Do not router.refresh() while offline — it reloads RSC and blanks the page.
        setError(result.message);
        setBodyText("");
        setNumberValue("");
        setUrl("");
        setTimeEntryId("");
        return;
      }
      setBodyText("");
      setNumberValue("");
      setUrl("");
      setTimeEntryId("");
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
          <p className="text-xs opacity-60 text-center">
            Time-only is fine — skip this if you only logged time.
          </p>
          <label className="form-control w-full">
            <span className="label-text">Focus</span>
            <select
              className="select select-bordered w-full"
              value={focusId}
              onChange={(e) => {
                setFocusId(e.target.value);
                setTimeEntryId("");
              }}
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
            <span className="label-text">Text</span>
            <input
              className="input input-bordered w-full"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              maxLength={500}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Number</span>
            <input
              type="number"
              className="input input-bordered w-full"
              value={numberValue}
              onChange={(e) => setNumberValue(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Link</span>
            <input
              type="url"
              className="input input-bordered w-full"
              placeholder="https://"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text">Link to time entry (optional)</span>
            <select
              className="select select-bordered w-full"
              value={timeEntryId}
              onChange={(e) => setTimeEntryId(e.target.value)}
            >
              <option value="">None</option>
              {entriesForFocus.map((e) => (
                <option key={e.id} value={e.id}>
                  {new Date(e.start_at).toLocaleString()} · {e.source}
                </option>
              ))}
            </select>
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
