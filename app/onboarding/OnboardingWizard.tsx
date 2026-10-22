"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  PLAN_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/domain/onboarding";
import type { PlanTier } from "@/lib/db/types";
import {
  submitOnboarding,
  type OnboardingActionState,
} from "./actions";

const initialState: OnboardingActionState = {};

type Props = {
  defaultTimezone: string;
};

export function OnboardingWizard({ defaultTimezone }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [plan, setPlan] = useState<PlanTier | null>(null);
  const [reviewWeekday, setReviewWeekday] = useState(1);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [state, formAction, pending] = useActionState(
    submitOnboarding,
    initialState,
  );

  useEffect(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (browserTz) {
      setTimezone(browserTz);
    }
  }, []);

  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [
        "UTC",
        "America/New_York",
        "America/Los_Angeles",
        "Europe/London",
        "Asia/Shanghai",
        "Asia/Tokyo",
      ];
    }
  }, []);

  return (
    <div className="w-full max-w-md space-y-6">
      <p className="text-sm opacity-60 text-center">Step {step} of 2</p>

      {step === 1 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Choose your plan</h2>
          <p className="text-sm opacity-70 text-center">
            Paused focuses still count toward your limit.
          </p>
          <div className="flex flex-col gap-3">
            {(["standard", "intense"] as PlanTier[]).map((value) => (
              <button
                key={value}
                type="button"
                className={`btn btn-outline justify-start h-auto py-3 ${
                  plan === value ? "btn-active border-primary" : ""
                }`}
                onClick={() => setPlan(value)}
              >
                {PLAN_LABELS[value]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary w-full"
            disabled={!plan}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="plan" value={plan ?? ""} />
          <h2 className="text-xl font-semibold text-center">
            Weekly review day & timezone
          </h2>

          <label className="form-control w-full">
            <span className="label-text mb-1">Review day</span>
            <select
              className="select select-bordered w-full"
              name="reviewWeekday"
              value={reviewWeekday}
              onChange={(e) => setReviewWeekday(Number(e.target.value))}
            >
              {WEEKDAY_LABELS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control w-full">
            <span className="label-text mb-1">Timezone</span>
            <select
              className="select select-bordered w-full"
              name="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </label>

          {state.error ? (
            <p className="text-error text-sm" role="alert">
              {state.error}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost flex-1"
              onClick={() => setStep(1)}
              disabled={pending}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={pending}
            >
              {pending ? "Saving…" : "Finish"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
