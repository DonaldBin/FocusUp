import { createServerSupabaseClient } from "@/lib/db/server";
import type { FocusStatus, PlanTier, ProfileRow } from "@/lib/db/types";
import {
  isOnboardingComplete,
  isValidPlan,
  isValidReviewWeekday,
  isValidTimezone,
} from "@/lib/domain/onboarding";
import {
  DOWNGRADE_BLOCKED_MESSAGE,
  canDowngradeToStandard,
  type Plan,
} from "@/lib/domain/quota";

export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data as ProfileRow | null;
}

export type CompleteOnboardingInput = {
  plan: string;
  reviewWeekday: number;
  timezone: string;
};

export async function completeOnboarding(
  input: CompleteOnboardingInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidPlan(input.plan)) {
    return { ok: false, error: "Invalid plan" };
  }
  if (!isValidReviewWeekday(input.reviewWeekday)) {
    return { ok: false, error: "Invalid review weekday" };
  }
  if (!isValidTimezone(input.timezone)) {
    return { ok: false, error: "Invalid timezone" };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const plan = input.plan as PlanTier;
  const { error } = await supabase
    .from("profiles")
    .update({
      plan,
      review_weekday: input.reviewWeekday,
      timezone: input.timezone.trim(),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type UpdatePlanResult =
  | { ok: true; plan: PlanTier }
  | { ok: false; error: string };

export type UpdatePlanDeps = {
  getUserId: () => Promise<string | null>;
  getPlan: () => Promise<PlanTier | null>;
  listFocusStatuses: () => Promise<{ status: FocusStatus }[]>;
  savePlan: (plan: PlanTier) => Promise<void>;
};

async function defaultUpdatePlanDeps(): Promise<UpdatePlanDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async getPlan() {
      const profile = await getCurrentProfile();
      return profile?.plan ?? null;
    },
    async listFocusStatuses() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }
      const { data, error } = await supabase
        .from("focuses")
        .select("status")
        .eq("user_id", user.id);
      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []).map((f) => ({
        status: f.status as FocusStatus,
      }));
    },
    async savePlan(plan) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not signed in");
      }
      const { error } = await supabase
        .from("profiles")
        .update({ plan })
        .eq("id", user.id);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

/** Change Standard/Intense with downgrade guard (Task 10.1). */
export async function updatePlan(
  nextPlan: string,
  injected?: UpdatePlanDeps,
): Promise<UpdatePlanResult> {
  if (!isValidPlan(nextPlan)) {
    return { ok: false, error: "Invalid plan" };
  }

  const deps = injected ?? (await defaultUpdatePlanDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const currentPlan = await deps.getPlan();
  if (!currentPlan) {
    return { ok: false, error: "Complete onboarding first" };
  }

  if (currentPlan === nextPlan) {
    return { ok: true, plan: currentPlan };
  }

  if (currentPlan === "intense" && nextPlan === "standard") {
    const occupied = await deps.listFocusStatuses();
    if (!canDowngradeToStandard(occupied)) {
      return { ok: false, error: DOWNGRADE_BLOCKED_MESSAGE };
    }
  }

  try {
    await deps.savePlan(nextPlan as Plan);
    return { ok: true, plan: nextPlan as PlanTier };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update plan",
    };
  }
}

export type UpdateReviewScheduleResult =
  | { ok: true; reviewWeekday: number; timezone: string }
  | { ok: false; error: string };

export type UpdateReviewScheduleDeps = {
  getUserId: () => Promise<string | null>;
  hasCompletedOnboarding: () => Promise<boolean>;
  saveSchedule: (input: {
    reviewWeekday: number;
    timezone: string;
  }) => Promise<void>;
};

async function defaultUpdateReviewScheduleDeps(): Promise<UpdateReviewScheduleDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async hasCompletedOnboarding() {
      const profile = await getCurrentProfile();
      return isOnboardingComplete(profile);
    },
    async saveSchedule({ reviewWeekday, timezone }) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not signed in");
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          review_weekday: reviewWeekday,
          timezone,
        })
        .eq("id", user.id);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

/** Update weekly review day + timezone (Task 10.2). Callers use new values with getWeekRange immediately. */
export async function updateReviewSchedule(
  input: { reviewWeekday: number; timezone: string },
  injected?: UpdateReviewScheduleDeps,
): Promise<UpdateReviewScheduleResult> {
  if (!isValidReviewWeekday(input.reviewWeekday)) {
    return { ok: false, error: "Invalid review weekday" };
  }
  if (!isValidTimezone(input.timezone)) {
    return { ok: false, error: "Invalid timezone" };
  }

  const timezone = input.timezone.trim();
  const deps = injected ?? (await defaultUpdateReviewScheduleDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  if (!(await deps.hasCompletedOnboarding())) {
    return { ok: false, error: "Complete onboarding first" };
  }

  try {
    await deps.saveSchedule({
      reviewWeekday: input.reviewWeekday,
      timezone,
    });
    return {
      ok: true,
      reviewWeekday: input.reviewWeekday,
      timezone,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update schedule",
    };
  }
}
