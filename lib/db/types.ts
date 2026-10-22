/**
 * Database row types aligned with supabase/migrations/001_init.sql (PRD §10).
 * No runtime secrets here.
 */

export type PlanTier = "standard" | "intense";
export type FocusStatus = "active" | "paused" | "ended";
export type TimeEntrySource = "timer" | "manual";
export type ReviewDecision = "continue" | "adjust" | "pause" | "end";

export type ProfileRow = {
  id: string;
  plan: PlanTier | null;
  review_weekday: number | null;
  timezone: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type FocusRow = {
  id: string;
  user_id: string;
  name: string;
  why: string;
  status: FocusStatus;
  last_used_at: string | null;
  investment_summary: string | null;
  created_at: string;
  updated_at: string;
};

export type TimeEntryRow = {
  id: string;
  user_id: string;
  focus_id: string;
  start_at: string;
  end_at: string;
  source: TimeEntrySource;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type OutcomeRow = {
  id: string;
  user_id: string;
  focus_id: string;
  time_entry_id: string | null;
  body_text: string | null;
  number_value: number | null;
  url: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRow = {
  id: string;
  user_id: string;
  range_start: string;
  range_end: string;
  merged: boolean;
  decision: ReviewDecision;
  adjust_note: string | null;
  decided_at: string;
  created_at: string;
};

export type FocusWeekSnapRow = {
  id: string;
  user_id: string;
  focus_id: string;
  range_start: string;
  range_end: string;
  duration_ms: number;
  auto_blurb: string | null;
  created_at: string;
  updated_at: string;
};

export type ActiveSessionRow = {
  user_id: string;
  focus_id: string;
  start_at: string;
  updated_at: string;
};

/** Table name → row type map for later Supabase client generics. */
export type DatabaseTables = {
  profiles: ProfileRow;
  focuses: FocusRow;
  time_entries: TimeEntryRow;
  outcomes: OutcomeRow;
  reviews: ReviewRow;
  focus_week_snaps: FocusWeekSnapRow;
  active_sessions: ActiveSessionRow;
};
