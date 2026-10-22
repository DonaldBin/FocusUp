import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import {
  getFocusById,
  listTimeEntriesForFocus,
} from "@/lib/db/focuses";
import { getFocusWeeklyBreakdown } from "@/lib/db/focusWeekBreakdown";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { durationMs } from "@/lib/domain/timeEntry";
import {
  formatTotalInvested,
  totalInvestedMs,
} from "@/lib/domain/totalInvested";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/paths";
import { InvestmentSummaryEditor } from "./InvestmentSummaryEditor";

type Props = {
  params: Promise<{ id: string }>;
};

function formatWeekRangeLabel(start: Date, end: Date, timeZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
  });
  const endDisplay = new Date(end.getTime() - 1);
  return `${fmt.format(start)} – ${fmt.format(endDisplay)}`;
}

export default async function FocusDetailPage({ params }: Props) {
  const { id } = await params;
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

  const focus = await getFocusById(id);
  if (!focus) {
    notFound();
  }

  const entries = await listTimeEntriesForFocus(focus.id);
  const weeks = await getFocusWeeklyBreakdown(focus.id);
  const totalLabel = formatTotalInvested(totalInvestedMs(entries));
  const timeZone = profile?.timezone ?? "UTC";

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <div className="w-full max-w-md space-y-1 text-center pt-4">
        <p className="text-xs uppercase tracking-wide opacity-50">Focus</p>
        <h1 className="text-2xl font-bold">{focus.name}</h1>
        <p className="text-sm opacity-70">{focus.why}</p>
        <p className="text-xs opacity-50 capitalize">{focus.status}</p>
      </div>

      <section className="w-full max-w-md text-center space-y-1">
        <h2 className="text-sm font-semibold opacity-70">Total invested</h2>
        <p className="text-3xl font-semibold tabular-nums">{totalLabel}</p>
      </section>

      <section className="w-full max-w-md space-y-2">
        <h2 className="text-sm font-semibold text-center opacity-70">
          Weekly breakdown
        </h2>
        {weeks.length === 0 ? (
          <p className="text-sm opacity-60 text-center">
            No weekly data yet.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {weeks.map((week) => (
              <li
                key={week.start.toISOString()}
                className="border border-base-300 rounded-lg px-3 py-2 space-y-1"
              >
                <div className="flex justify-between gap-2">
                  <span className="font-medium">
                    {formatWeekRangeLabel(week.start, week.end, timeZone)}
                  </span>
                  <span className="tabular-nums shrink-0">
                    {week.durationLabel}
                  </span>
                </div>
                <p className="text-xs opacity-70">{week.autoBlurb}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <InvestmentSummaryEditor
        focusId={focus.id}
        savedSummary={focus.investment_summary}
        weekBlurbs={weeks.map((w) => w.autoBlurb)}
      />

      <section className="w-full max-w-md space-y-2">
        <h2 className="text-sm font-semibold text-center opacity-70">
          Recent time entries
        </h2>
        {entries.length === 0 ? (
          <p className="text-sm opacity-60 text-center">No time logged yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {entries.map((entry) => {
              const ms = durationMs(
                new Date(entry.start_at),
                new Date(entry.end_at),
              );
              return (
                <li
                  key={entry.id}
                  className="border border-base-300 rounded-lg px-3 py-2 flex justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      {new Date(entry.start_at).toLocaleString()}
                    </p>
                    <p className="text-xs opacity-60 capitalize">
                      {entry.source}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatTotalInvested(ms)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link href="/" className="link link-hover text-sm opacity-70">
        Back home
      </Link>
    </main>
  );
}
