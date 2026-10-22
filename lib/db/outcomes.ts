import { createServerSupabaseClient } from "@/lib/db/server";
import type { FocusRow, OutcomeRow, TimeEntryRow } from "@/lib/db/types";
import {
  normalizeOutcomeFields,
  type OutcomeFields,
} from "@/lib/domain/outcome";

export type OutcomeMutationResult =
  | { ok: true; outcome: OutcomeRow }
  | { ok: false; error: string };

export type OutcomeDeps = {
  getUserId: () => Promise<string | null>;
  getFocus: (focusId: string, userId: string) => Promise<FocusRow | null>;
  getTimeEntry: (
    id: string,
    userId: string,
  ) => Promise<TimeEntryRow | null>;
  getOutcome: (id: string, userId: string) => Promise<OutcomeRow | null>;
  insertOutcome: (input: {
    userId: string;
    focusId: string;
    timeEntryId: string | null;
    fields: OutcomeFields;
  }) => Promise<OutcomeRow>;
  updateOutcome: (input: {
    id: string;
    userId: string;
    timeEntryId: string | null;
    fields: OutcomeFields;
  }) => Promise<OutcomeRow>;
  deleteOutcome: (id: string, userId: string) => Promise<void>;
};

async function defaultDeps(): Promise<OutcomeDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async getFocus(focusId, userId) {
      const { data, error } = await supabase
        .from("focuses")
        .select("*")
        .eq("id", focusId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as FocusRow | null) ?? null;
    },
    async getTimeEntry(id, userId) {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as TimeEntryRow | null) ?? null;
    },
    async getOutcome(id, userId) {
      const { data, error } = await supabase
        .from("outcomes")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as OutcomeRow | null) ?? null;
    },
    async insertOutcome({ userId, focusId, timeEntryId, fields }) {
      const { data, error } = await supabase
        .from("outcomes")
        .insert({
          user_id: userId,
          focus_id: focusId,
          time_entry_id: timeEntryId,
          body_text: fields.bodyText,
          number_value: fields.numberValue,
          url: fields.url,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as OutcomeRow;
    },
    async updateOutcome({ id, userId, timeEntryId, fields }) {
      const { data, error } = await supabase
        .from("outcomes")
        .update({
          time_entry_id: timeEntryId,
          body_text: fields.bodyText,
          number_value: fields.numberValue,
          url: fields.url,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as OutcomeRow;
    },
    async deleteOutcome(id, userId) {
      const { error } = await supabase
        .from("outcomes")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export type CreateOutcomeInput = {
  focusId: string;
  timeEntryId?: string | null;
  bodyText?: string | null;
  numberValue?: number | string | null;
  url?: string | null;
};

export async function createOutcome(
  input: CreateOutcomeInput,
  injected?: OutcomeDeps,
): Promise<OutcomeMutationResult> {
  const fields = normalizeOutcomeFields(input);
  if ("error" in fields) {
    return { ok: false, error: fields.error };
  }

  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const focus = await deps.getFocus(input.focusId, userId);
  if (!focus) {
    return { ok: false, error: "Focus not found" };
  }

  let timeEntryId: string | null = null;
  if (input.timeEntryId) {
    const entry = await deps.getTimeEntry(input.timeEntryId, userId);
    if (!entry) {
      return { ok: false, error: "Time entry not found" };
    }
    if (entry.focus_id !== input.focusId) {
      return { ok: false, error: "Time entry belongs to a different focus" };
    }
    timeEntryId = entry.id;
  }

  try {
    const outcome = await deps.insertOutcome({
      userId,
      focusId: input.focusId,
      timeEntryId,
      fields,
    });
    return { ok: true, outcome };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create outcome",
    };
  }
}

export type UpdateOutcomeInput = {
  id: string;
  timeEntryId?: string | null;
  bodyText?: string | null;
  numberValue?: number | string | null;
  url?: string | null;
};

export async function updateOutcome(
  input: UpdateOutcomeInput,
  injected?: OutcomeDeps,
): Promise<OutcomeMutationResult> {
  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const current = await deps.getOutcome(input.id, userId);
  if (!current) {
    return { ok: false, error: "Outcome not found" };
  }

  const fields = normalizeOutcomeFields({
    bodyText:
      input.bodyText !== undefined ? input.bodyText : current.body_text,
    numberValue:
      input.numberValue !== undefined
        ? input.numberValue
        : current.number_value,
    url: input.url !== undefined ? input.url : current.url,
  });
  if ("error" in fields) {
    return { ok: false, error: fields.error };
  }

  let timeEntryId =
    input.timeEntryId !== undefined
      ? input.timeEntryId
      : current.time_entry_id;

  if (timeEntryId) {
    const entry = await deps.getTimeEntry(timeEntryId, userId);
    if (!entry) {
      return { ok: false, error: "Time entry not found" };
    }
    if (entry.focus_id !== current.focus_id) {
      return { ok: false, error: "Time entry belongs to a different focus" };
    }
  } else {
    timeEntryId = null;
  }

  try {
    const outcome = await deps.updateOutcome({
      id: input.id,
      userId,
      timeEntryId,
      fields,
    });
    return { ok: true, outcome };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update outcome",
    };
  }
}

export async function deleteOutcome(
  id: string,
  injected?: OutcomeDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }
  const current = await deps.getOutcome(id, userId);
  if (!current) {
    return { ok: false, error: "Outcome not found" };
  }
  try {
    await deps.deleteOutcome(id, userId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete outcome",
    };
  }
}

export async function listRecentOutcomes(limit = 10): Promise<OutcomeRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from("outcomes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as OutcomeRow[];
}

export async function listOutcomesForFocus(
  focusId: string,
): Promise<OutcomeRow[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }
  const { data, error } = await supabase
    .from("outcomes")
    .select("*")
    .eq("user_id", user.id)
    .eq("focus_id", focusId)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as OutcomeRow[];
}
