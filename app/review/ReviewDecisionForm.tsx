"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  REVIEW_DECISION_LABELS,
  type ReviewDecision,
} from "@/lib/domain/reviewDecision";

type Props = {
  rangeStart: string;
  rangeEnd: string;
  merged: boolean;
};

const DECISIONS: ReviewDecision[] = [
  "continue",
  "adjust",
  "pause",
  "end",
];

export function ReviewDecisionForm({ rangeStart, rangeEnd, merged }: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<ReviewDecision>("continue");
  const [adjustNote, setAdjustNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rangeStart,
          rangeEnd,
          merged,
          decision,
          adjustNote: decision === "adjust" ? adjustNote : null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not submit decision");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit decision");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-md border border-base-300 rounded-lg p-4 space-y-3"
    >
      <h2 className="text-sm font-semibold text-center opacity-70">Decision</h2>
      <p className="text-xs opacity-60 text-center">
        Applies to all active and paused focuses.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {DECISIONS.map((value) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm ${decision === value ? "btn-primary" : "btn-outline"}`}
            onClick={() => setDecision(value)}
          >
            {REVIEW_DECISION_LABELS[value]}
          </button>
        ))}
      </div>
      {decision === "adjust" ? (
        <label className="form-control w-full">
          <span className="label-text">Adjust note (optional)</span>
          <input
            className="input input-bordered w-full"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            maxLength={200}
          />
        </label>
      ) : null}
      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Submit decision"}
      </button>
    </form>
  );
}
