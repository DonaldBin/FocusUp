import { createServerSupabaseClient } from "@/lib/db/server";
import type {
  FocusRow,
  FocusStatus,
  PlanTier,
  TimeEntryRow,
} from "@/lib/db/types";
import {
  FOCUS_LIMIT_REACHED_MESSAGE,
} from "@/lib/domain/focusExamples";
import {
  assertFocusStatusTransition,
  isValidFocusStatus,
} from "@/lib/domain/focusStatus";
import {
  PLAN_LIMITS,
  canCreateFocus,
  countOccupied,
  type Plan,
} from "@/lib/domain/quota";

export { EXAMPLE_FOCUSES, FOCUS_LIMIT_REACHED_MESSAGE } from "@/lib/domain/focusExamples";

export type CreateFocusInput = {
  name: string;
  why: string;
};

export type CreateFocusResult =
  | { ok: true; focus: FocusRow }
  | { ok: false; error: string };

export type FocusListItem = { status: FocusStatus };

export type CreateFocusDeps = {
  getUserId: () => Promise<string | null>;
  getPlan: () => Promise<PlanTier | null>;
  listFocusStatuses: () => Promise<FocusListItem[]>;
  insertFocus: (input: {
    userId: string;
    name: string;
    why: string;
  }) => Promise<FocusRow>;
};

export type FocusQuotaSnapshot = {
  plan: PlanTier;
  occupied: number;
  limit: number;
  canCreate: boolean;
};

export function normalizeFocusFields(
  name: string,
  why: string,
): { name: string; why: string } | { error: string } {
  const trimmedName = name.trim();
  const trimmedWhy = why.trim();
  if (!trimmedName) {
    return { error: "Name is required" };
  }
  if (!trimmedWhy) {
    return { error: "Why is required" };
  }
  return { name: trimmedName, why: trimmedWhy };
}

async function defaultDeps(): Promise<CreateFocusDeps> {
  const supabase = await createServerSupabaseClient();

  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async getPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return null;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data?.plan as PlanTier | null) ?? null;
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
      return (data ?? []) as FocusListItem[];
    },
    async insertFocus({ userId, name, why }) {
      const { data, error } = await supabase
        .from("focuses")
        .insert({
          user_id: userId,
          name,
          why,
          status: "active",
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as FocusRow;
    },
  };
}

/**
 * Create a focus after quota check (PRD §4.1 / §4.2 / Task 4.1).
 * Always goes through canCreateFocus — including example/chip creates.
 */
export async function createFocus(
  input: CreateFocusInput,
  injected?: CreateFocusDeps,
): Promise<CreateFocusResult> {
  const fields = normalizeFocusFields(input.name, input.why);
  if ("error" in fields) {
    return { ok: false, error: fields.error };
  }

  const deps = injected ?? (await defaultDeps());

  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const plan = await deps.getPlan();
  if (!plan) {
    return { ok: false, error: "Complete onboarding first" };
  }

  const existing = await deps.listFocusStatuses();
  if (!canCreateFocus(existing, plan as Plan)) {
    return { ok: false, error: FOCUS_LIMIT_REACHED_MESSAGE };
  }

  try {
    const focus = await deps.insertFocus({
      userId,
      name: fields.name,
      why: fields.why,
    });
    return { ok: true, focus };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create focus",
    };
  }
}

/** Current plan quota for UI (Task 4.2). */
export async function getFocusQuotaSnapshot(): Promise<FocusQuotaSnapshot | null> {
  const deps = await defaultDeps();
  const userId = await deps.getUserId();
  if (!userId) {
    return null;
  }
  const plan = await deps.getPlan();
  if (!plan) {
    return null;
  }
  const existing = await deps.listFocusStatuses();
  const occupied = countOccupied(existing);
  const limit = PLAN_LIMITS[plan as Plan];
  return {
    plan,
    occupied,
    limit,
    canCreate: canCreateFocus(existing, plan as Plan),
  };
}

export type UpdateFocusStatusDeps = {
  getUserId: () => Promise<string | null>;
  getFocus: (id: string, userId: string) => Promise<FocusRow | null>;
  saveStatus: (
    id: string,
    userId: string,
    status: FocusStatus,
  ) => Promise<FocusRow>;
};

export type UpdateFocusStatusResult =
  | { ok: true; focus: FocusRow }
  | { ok: false; error: string };

async function defaultUpdateDeps(): Promise<UpdateFocusStatusDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async getFocus(id, userId) {
      const { data, error } = await supabase
        .from("focuses")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as FocusRow | null) ?? null;
    },
    async saveStatus(id, userId, status) {
      const { data, error } = await supabase
        .from("focuses")
        .update({ status })
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as FocusRow;
    },
  };
}

/**
 * Change focus status only (PRD: never hard-delete). Task 4.3.
 */
export async function updateFocusStatus(
  focusId: string,
  nextStatus: string,
  injected?: UpdateFocusStatusDeps,
): Promise<UpdateFocusStatusResult> {
  if (!isValidFocusStatus(nextStatus)) {
    return { ok: false, error: "Invalid status" };
  }

  const deps = injected ?? (await defaultUpdateDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  let current: FocusRow | null;
  try {
    current = await deps.getFocus(focusId, userId);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not load focus",
    };
  }

  if (!current) {
    return { ok: false, error: "Focus not found" };
  }

  const transition = assertFocusStatusTransition(current.status, nextStatus);
  if (!transition.ok) {
    return transition;
  }

  try {
    const focus = await deps.saveStatus(focusId, userId, nextStatus);
    return { ok: true, focus };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update focus",
    };
  }
}

/** List current user's focuses (newest first). */
export async function listFocuses(): Promise<FocusRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from("focuses")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as FocusRow[];
}

export async function getFocusById(id: string): Promise<FocusRow | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data, error } = await supabase
    .from("focuses")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return (data as FocusRow | null) ?? null;
}

export async function listTimeEntriesForFocus(
  focusId: string,
  limit = 50,
): Promise<TimeEntryRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from("time_entries")
    .select("*")
    .eq("user_id", user.id)
    .eq("focus_id", focusId)
    .order("start_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as TimeEntryRow[];
}

export type UpdateInvestmentSummaryResult =
  | { ok: true; focus: FocusRow }
  | { ok: false; error: string };

/** Save user-editable investment summary (Task 8.3). */
export async function updateInvestmentSummary(
  focusId: string,
  summary: string,
): Promise<UpdateInvestmentSummaryResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in" };
  }

  const trimmed = summary.trim();
  const { data, error } = await supabase
    .from("focuses")
    .update({
      investment_summary: trimmed.length > 0 ? trimmed : null,
    })
    .eq("id", focusId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data) {
    return { ok: false, error: "Focus not found" };
  }
  return { ok: true, focus: data as FocusRow };
}
