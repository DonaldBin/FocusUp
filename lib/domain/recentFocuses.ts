/**
 * Home recent-focus shortcuts (PRD §6 / Task 7.2).
 * Prefer last_used_at, then created_at. Only active/paused fill the strip.
 */

import type { FocusStatus } from "@/lib/db/types";

export const HOME_RECENT_FOCUS_LIMIT = 3;

export type RecentFocusInput = {
  id: string;
  status: FocusStatus;
  last_used_at: string | null;
  created_at: string;
};

export function pickRecentFocuses<T extends RecentFocusInput>(
  focuses: readonly T[],
  limit = HOME_RECENT_FOCUS_LIMIT,
): T[] {
  const open = focuses.filter(
    (f) => f.status === "active" || f.status === "paused",
  );
  return [...open]
    .sort((a, b) => {
      const aKey = a.last_used_at ?? a.created_at;
      const bKey = b.last_used_at ?? b.created_at;
      return bKey.localeCompare(aKey);
    })
    .slice(0, limit);
}
