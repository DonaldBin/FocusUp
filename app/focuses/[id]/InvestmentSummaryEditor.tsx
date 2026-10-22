"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  appendWeekToSummary,
  findUnappendedWeekBlurb,
  summaryEditorState,
} from "@/lib/domain/investmentSummary";

type Props = {
  focusId: string;
  savedSummary: string | null;
  weekBlurbs: string[];
};

export function InvestmentSummaryEditor({
  focusId,
  savedSummary,
  weekBlurbs,
}: Props) {
  const router = useRouter();
  const initial = useMemo(
    () => summaryEditorState(savedSummary, weekBlurbs),
    [savedSummary, weekBlurbs],
  );
  const [text, setText] = useState(initial.text);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [confirmBlurb, setConfirmBlurb] = useState<string | null>(null);

  const pendingBlurb = useMemo(() => {
    if (!initial.userEdited) {
      return null;
    }
    return findUnappendedWeekBlurb(text, weekBlurbs);
  }, [initial.userEdited, text, weekBlurbs]);

  async function save(nextText: string) {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/focuses/${focusId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ investmentSummary: nextText }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not save summary");
        return;
      }
      setMessage("Saved");
      setConfirmBlurb(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save summary");
    } finally {
      setPending(false);
    }
  }

  function onAppendClick() {
    if (!pendingBlurb) {
      return;
    }
    const result = appendWeekToSummary({
      existingSummary: text,
      priorWeekBlurbs: weekBlurbs.slice(0, -1),
      newWeekBlurb: pendingBlurb,
      userEdited: true,
      confirmAppend: false,
    });
    if (result.kind === "needsConfirmAppend") {
      setConfirmBlurb(result.pendingBlurb);
      return;
    }
  }

  async function confirmAppend() {
    if (!confirmBlurb) {
      return;
    }
    const result = appendWeekToSummary({
      existingSummary: text,
      priorWeekBlurbs: weekBlurbs.slice(0, -1),
      newWeekBlurb: confirmBlurb,
      userEdited: true,
      confirmAppend: true,
    });
    if (result.kind !== "appended") {
      return;
    }
    setText(result.summary);
    await save(result.summary);
  }

  return (
    <section className="w-full max-w-md space-y-2">
      <h2 className="text-sm font-semibold text-center opacity-70">
        Investment summary
      </h2>
      <textarea
        className="textarea textarea-bordered w-full min-h-28 text-sm"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setMessage(null);
        }}
        placeholder="Your running notes across weeks…"
        aria-label="Investment summary"
      />
      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-success text-sm" role="status">
          {message}
        </p>
      ) : null}
      {confirmBlurb ? (
        <div className="border border-warning/40 bg-warning/10 rounded-lg p-3 space-y-2 text-sm">
          <p className="font-medium">Append this week?</p>
          <p className="opacity-70 text-xs">{confirmBlurb}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={pending}
              onClick={() => void confirmAppend()}
            >
              Append
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={pending}
              onClick={() => setConfirmBlurb(null)}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() => void save(text)}
        >
          {pending ? "Saving…" : "Save summary"}
        </button>
        {pendingBlurb && !confirmBlurb ? (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={pending}
            onClick={onAppendClick}
          >
            Append this week?
          </button>
        ) : null}
      </div>
    </section>
  );
}
