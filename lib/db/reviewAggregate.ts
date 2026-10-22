import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { getPendingReviewPrompt } from "@/lib/db/reviews";
import {
  aggregateReviewRange,
  type ReviewAggregate,
} from "@/lib/domain/reviewAggregate";
import {
  formatReviewLabel,
  previousWeekRange,
} from "@/lib/domain/reviewRange";
import { getWeekRange } from "@/lib/domain/week";

export type ReviewPageModel = {
  rangeStart: Date;
  rangeEnd: Date;
  merged: boolean;
  label: string;
  aggregate: ReviewAggregate;
  /** True when showing last week before the official due date. */
  preview?: boolean;
};

export async function getReviewPageModel(input: {
  start?: Date | null;
  end?: Date | null;
  merged?: boolean;
  now?: Date;
}): Promise<ReviewPageModel | null> {
  const now = input.now ?? new Date();
  let rangeStart = input.start ?? null;
  let rangeEnd = input.end ?? null;
  let merged = input.merged ?? false;
  let preview = false;

  if (
    !rangeStart ||
    !rangeEnd ||
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime())
  ) {
    const pending = await getPendingReviewPrompt(now);
    if (pending) {
      rangeStart = pending.start;
      rangeEnd = pending.end;
      merged = pending.merged;
    } else {
      const profile = await getCurrentProfile();
      if (!profile?.timezone || profile.review_weekday == null) {
        return null;
      }
      const current = getWeekRange(
        now,
        profile.review_weekday,
        profile.timezone,
      );
      const prev = previousWeekRange(current);
      rangeStart = prev.start;
      rangeEnd = prev.end;
      merged = false;
      preview = true;
    }
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const [
    { data: entries, error: entriesError },
    { data: outcomes, error: outcomesError },
  ] = await Promise.all([
    supabase
      .from("time_entries")
      .select("start_at, end_at")
      .eq("user_id", user.id)
      .gte("start_at", rangeStart.toISOString())
      .lt("start_at", rangeEnd.toISOString()),
    supabase
      .from("outcomes")
      .select("created_at, body_text, number_value, url")
      .eq("user_id", user.id)
      .gte("created_at", rangeStart.toISOString())
      .lt("created_at", rangeEnd.toISOString()),
  ]);

  if (entriesError) {
    throw new Error(entriesError.message);
  }
  if (outcomesError) {
    throw new Error(outcomesError.message);
  }

  const aggregate = aggregateReviewRange({
    rangeStart,
    rangeEnd,
    entries: (entries ?? []).map((e) => ({
      startAt: new Date(e.start_at as string),
      endAt: new Date(e.end_at as string),
    })),
    outcomes: (outcomes ?? []).map((o) => ({
      createdAt: new Date(o.created_at as string),
      bodyText: o.body_text as string | null,
      numberValue: o.number_value as number | null,
      url: o.url as string | null,
    })),
  });

  const baseLabel = formatReviewLabel(rangeStart, rangeEnd, merged);

  return {
    rangeStart,
    rangeEnd,
    merged,
    label: preview ? `${baseLabel} (preview)` : baseLabel,
    aggregate,
    preview,
  };
}
