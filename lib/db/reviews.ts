import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import type { ReviewRow } from "@/lib/db/types";
import {
  collectPendingWeeks,
  formatReviewLabel,
  mergePendingRanges,
  type MergedReviewRange,
} from "@/lib/domain/reviewRange";
import {
  formatNextReviewWhen,
  nextReviewInstant,
  reviewWeekdayLabel,
} from "@/lib/domain/reviewPrompt";

export type PendingReviewPrompt = MergedReviewRange & {
  label: string;
};

export type HomeReviewPrompt =
  | ({ status: "due" } & PendingReviewPrompt)
  | {
      status: "upcoming";
      nextReviewAt: Date;
      whenLabel: string;
      weekdayLabel: string;
    };

export async function listReviewRangeEnds(): Promise<Date[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from("reviews")
    .select("range_end")
    .eq("user_id", user.id);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => new Date((row as ReviewRow).range_end));
}

/** Pending weekly review for Home / Review entry (Task 7.2). */
export async function getPendingReviewPrompt(
  now = new Date(),
): Promise<PendingReviewPrompt | null> {
  const profile = await getCurrentProfile();
  if (
    !profile?.timezone ||
    profile.review_weekday == null ||
    profile.onboarding_completed_at == null
  ) {
    return null;
  }

  const onboardedAt = new Date(profile.onboarding_completed_at);
  const reviewedEnds = await listReviewRangeEnds();
  const pendingWeeks = collectPendingWeeks({
    now,
    reviewWeekday: profile.review_weekday,
    timeZone: profile.timezone,
    reviewedEnds,
  }).filter((week) => {
    // Keep weeks that ended after signup, or that still overlap signup time.
    return week.end.getTime() > onboardedAt.getTime();
  });

  const merged = mergePendingRanges(pendingWeeks);
  if (!merged) {
    return null;
  }

  return {
    ...merged,
    label: formatReviewLabel(merged.start, merged.end, merged.merged),
  };
}

/** Due banner, or upcoming hint when the first review week is not over yet. */
export async function getHomeReviewPrompt(
  now = new Date(),
): Promise<HomeReviewPrompt | null> {
  const profile = await getCurrentProfile();
  if (
    !profile?.timezone ||
    profile.review_weekday == null ||
    profile.onboarding_completed_at == null
  ) {
    return null;
  }

  const due = await getPendingReviewPrompt(now);
  if (due) {
    return { status: "due", ...due };
  }

  const nextReviewAt = nextReviewInstant(
    now,
    profile.review_weekday,
    profile.timezone,
  );
  return {
    status: "upcoming",
    nextReviewAt,
    whenLabel: formatNextReviewWhen(nextReviewAt, profile.timezone),
    weekdayLabel: reviewWeekdayLabel(profile.review_weekday),
  };
}
