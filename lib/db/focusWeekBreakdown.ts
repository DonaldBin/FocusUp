import { getCurrentProfile } from "@/lib/db/profile";
import { listTimeEntriesForFocus } from "@/lib/db/focuses";
import { listOutcomesForFocus } from "@/lib/db/outcomes";
import {
  buildFocusWeekBreakdowns,
  weekRangesForFocusData,
  type FocusWeekBreakdown,
} from "@/lib/domain/focusWeeks";

/** Live weekly breakdown for one focus (Task 8.2). Empty weeks omitted. */
export async function getFocusWeeklyBreakdown(
  focusId: string,
  now = new Date(),
): Promise<FocusWeekBreakdown[]> {
  const profile = await getCurrentProfile();
  if (!profile?.timezone || profile.review_weekday == null) {
    return [];
  }

  const [entries, outcomes] = await Promise.all([
    listTimeEntriesForFocus(focusId, 500),
    listOutcomesForFocus(focusId),
  ]);

  const entryLikes = entries.map((e) => ({
    startAt: new Date(e.start_at),
    endAt: new Date(e.end_at),
  }));
  const outcomeLikes = outcomes.map((o) => ({
    createdAt: new Date(o.created_at),
    bodyText: o.body_text,
    numberValue: o.number_value,
    url: o.url,
  }));

  const ranges = weekRangesForFocusData(
    entryLikes,
    outcomeLikes,
    profile.review_weekday,
    profile.timezone,
    now,
  );

  return buildFocusWeekBreakdowns(entryLikes, outcomeLikes, ranges);
}
