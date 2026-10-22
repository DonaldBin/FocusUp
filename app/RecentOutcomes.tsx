"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FocusRow, OutcomeRow } from "@/lib/db/types";

type Props = {
  outcomes: OutcomeRow[];
  focuses: FocusRow[];
};

export function RecentOutcomes({ outcomes, focuses }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const nameById = new Map(focuses.map((f) => [f.id, f.name]));

  if (outcomes.length === 0) {
    return null;
  }

  async function remove(id: string) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/outcomes/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not delete outcome");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete outcome");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-2">
      <h2 className="text-sm font-semibold text-center opacity-70">
        Recent outcomes
      </h2>
      {error ? (
        <p className="text-error text-sm text-center" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="text-sm space-y-2">
        {outcomes.map((o) => (
          <li
            key={o.id}
            className="border border-base-200 rounded-md p-2 space-y-1"
          >
            <p className="font-medium">{nameById.get(o.focus_id) ?? "Focus"}</p>
            {o.body_text ? <p>{o.body_text}</p> : null}
            {o.number_value != null ? <p>Number: {o.number_value}</p> : null}
            {o.url ? (
              <a
                href={o.url}
                className="link link-primary break-all"
                target="_blank"
                rel="noreferrer"
              >
                {o.url}
              </a>
            ) : null}
            <button
              type="button"
              className="btn btn-outline btn-xs"
              disabled={pending}
              onClick={() => void remove(o.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
