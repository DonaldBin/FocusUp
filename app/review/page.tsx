import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { getReviewPageModel } from "@/lib/db/reviewAggregate";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/paths";
import { ReviewDecisionForm } from "./ReviewDecisionForm";

type Props = {
  searchParams: Promise<{
    start?: string;
    end?: string;
    merged?: string;
    skip?: string;
  }>;
};

export default async function ReviewPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (!isOnboardingComplete(profile)) {
    redirect(ONBOARDING_PATH);
  }

  const params = await searchParams;
  if (params.skip === "1") {
    redirect("/");
  }

  const model = await getReviewPageModel({
    start: params.start ? new Date(params.start) : null,
    end: params.end ? new Date(params.end) : null,
    merged: params.merged === "1",
  });

  if (!model) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-sm opacity-70 text-center max-w-sm">
          Nothing to review yet.
        </p>
        <Link href="/" className="btn btn-primary">
          Skip
        </Link>
      </main>
    );
  }

  const { aggregate } = model;

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <div className="w-full max-w-md text-center space-y-1 pt-4">
        <h1 className="text-2xl font-bold">Review</h1>
        <p className="text-sm opacity-70">{model.label}</p>
        {model.preview ? (
          <p className="text-xs opacity-50">
            Official due date is still ahead — you can practice a decision now.
          </p>
        ) : null}
      </div>

      <section className="w-full max-w-md border border-base-300 rounded-lg p-4 text-center space-y-1">
        <h2 className="text-sm font-semibold opacity-70">Total time</h2>
        <p className="text-3xl font-semibold tabular-nums">
          {aggregate.totalDurationLabel}
        </p>
      </section>

      <section className="w-full max-w-md border border-base-300 rounded-lg p-4 text-center space-y-1">
        <h2 className="text-sm font-semibold opacity-70">Sessions</h2>
        <p className="text-3xl font-semibold tabular-nums">
          {aggregate.entryCount}
        </p>
        <p className="text-xs opacity-60">Time entries in this range</p>
      </section>

      <section className="w-full max-w-md border border-base-300 rounded-lg p-4 space-y-2">
        <h2 className="text-sm font-semibold text-center opacity-70">
          Outcomes
        </h2>
        {aggregate.outcomeLines.length === 0 ? (
          <p className="text-sm opacity-60 text-center">
            No outcomes this range.
          </p>
        ) : (
          <ul className="text-sm space-y-2">
            {aggregate.outcomeLines.map((line) => (
              <li
                key={line}
                className="border border-base-200 rounded-md px-3 py-2"
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ReviewDecisionForm
        rangeStart={model.rangeStart.toISOString()}
        rangeEnd={model.rangeEnd.toISOString()}
        merged={model.merged}
      />

      <Link href="/" className="btn btn-ghost">
        Skip
      </Link>
    </main>
  );
}
