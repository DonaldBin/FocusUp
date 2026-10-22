"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLAN_LABELS } from "@/lib/domain/onboarding";
import {
  PAUSED_COUNT_MESSAGE,
  PLAN_LIMITS,
  type Plan,
} from "@/lib/domain/quota";
import type { PlanTier } from "@/lib/db/types";

type Props = {
  currentPlan: PlanTier;
  occupied: number;
};

export function PlanSettings({ currentPlan, occupied }: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanTier>(currentPlan);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(next: PlanTier) {
    setError(null);
    setMessage(null);
    setPending(true);
    setPlan(next);
    try {
      const res = await fetch("/api/settings/plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: next }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not update plan");
        setPlan(currentPlan);
        return;
      }
      setMessage("Plan saved");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update plan");
      setPlan(currentPlan);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-md space-y-3 border border-base-300 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-center">Plan</h2>
      <p className="text-xs opacity-60 text-center">{PAUSED_COUNT_MESSAGE}</p>
      <p className="text-sm text-center opacity-70">
        {occupied} of {PLAN_LIMITS[plan as Plan]} slots used
      </p>
      <div className="flex flex-col gap-2">
        {(["standard", "intense"] as PlanTier[]).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn btn-outline justify-start h-auto py-3 ${
              plan === value ? "btn-active border-primary" : ""
            }`}
            disabled={pending}
            onClick={() => void save(value)}
          >
            {PLAN_LABELS[value]}
          </button>
        ))}
      </div>
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
    </section>
  );
}
