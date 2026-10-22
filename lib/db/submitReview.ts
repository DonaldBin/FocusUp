import { createServerSupabaseClient } from "@/lib/db/server";
import type { FocusRow, ReviewRow } from "@/lib/db/types";
import {
  applyDecisionToFocuses,
  isValidReviewDecision,
  type ReviewDecision,
} from "@/lib/domain/reviewDecision";

export type SubmitReviewInput = {
  rangeStart: string;
  rangeEnd: string;
  merged?: boolean;
  decision: string;
  adjustNote?: string | null;
};

export type SubmitReviewResult =
  | { ok: true; review: ReviewRow; updatedFocusIds: string[] }
  | { ok: false; error: string };

export type SubmitReviewDeps = {
  getUserId: () => Promise<string | null>;
  listFocuses: (userId: string) => Promise<FocusRow[]>;
  updateFocusStatuses: (
    userId: string,
    updates: { id: string; status: FocusRow["status"] }[],
  ) => Promise<void>;
  insertReview: (input: {
    userId: string;
    rangeStart: string;
    rangeEnd: string;
    merged: boolean;
    decision: ReviewDecision;
    adjustNote: string | null;
  }) => Promise<ReviewRow>;
};

async function defaultDeps(): Promise<SubmitReviewDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async listFocuses(userId) {
      const { data, error } = await supabase
        .from("focuses")
        .select("*")
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as FocusRow[];
    },
    async updateFocusStatuses(userId, updates) {
      for (const row of updates) {
        const { error } = await supabase
          .from("focuses")
          .update({ status: row.status })
          .eq("id", row.id)
          .eq("user_id", userId);
        if (error) {
          throw new Error(error.message);
        }
      }
    },
    async insertReview(input) {
      const { data, error } = await supabase
        .from("reviews")
        .insert({
          user_id: input.userId,
          range_start: input.rangeStart,
          range_end: input.rangeEnd,
          merged: input.merged,
          decision: input.decision,
          adjust_note: input.adjustNote,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as ReviewRow;
    },
  };
}

export async function submitReviewDecision(
  input: SubmitReviewInput,
  injected?: SubmitReviewDeps,
): Promise<SubmitReviewResult> {
  if (!isValidReviewDecision(input.decision)) {
    return { ok: false, error: "Invalid decision" };
  }

  const start = new Date(input.rangeStart);
  const end = new Date(input.rangeEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, error: "Invalid review range" };
  }
  if (end.getTime() <= start.getTime()) {
    return { ok: false, error: "Range end must be after start" };
  }

  const decision = input.decision;
  const adjustNote =
    decision === "adjust" && typeof input.adjustNote === "string"
      ? input.adjustNote.trim() || null
      : null;

  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  try {
    const focuses = await deps.listFocuses(userId);
    const next = applyDecisionToFocuses(
      focuses.map((f) => ({ id: f.id, status: f.status })),
      decision,
    );
    const updates = next
      .filter((n) => {
        const prev = focuses.find((f) => f.id === n.id);
        return prev && prev.status !== n.status;
      })
      .map((n) => ({ id: n.id, status: n.status }));

    await deps.updateFocusStatuses(userId, updates);
    const review = await deps.insertReview({
      userId,
      rangeStart: start.toISOString(),
      rangeEnd: end.toISOString(),
      merged: Boolean(input.merged),
      decision,
      adjustNote,
    });

    return {
      ok: true,
      review,
      updatedFocusIds: updates.map((u) => u.id),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not submit review",
    };
  }
}
