import { createServerSupabaseClient } from "@/lib/db/server";
import type { FocusRow, TimeEntryRow } from "@/lib/db/types";
import {
  entryDayKey,
  resolveTimeRange,
} from "@/lib/domain/timeEntryEdit";

export type TimeEntryMutationResult =
  | { ok: true; entry: TimeEntryRow; dayKey?: string }
  | { ok: false; error: string };

export type TimeEntryWriteDeps = {
  getUserId: () => Promise<string | null>;
  getTimezone: () => Promise<string>;
  getFocus: (focusId: string, userId: string) => Promise<FocusRow | null>;
  getEntry: (id: string, userId: string) => Promise<TimeEntryRow | null>;
  insertManual: (input: {
    userId: string;
    focusId: string;
    startAt: string;
    endAt: string;
    note: string | null;
  }) => Promise<TimeEntryRow>;
  updateEntry: (input: {
    id: string;
    userId: string;
    startAt: string;
    endAt: string;
    note: string | null;
  }) => Promise<TimeEntryRow>;
  deleteEntry: (id: string, userId: string) => Promise<void>;
};

function parseDate(value: string, label: string): Date | { error: string } {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return { error: `Invalid ${label}` };
  }
  return d;
}

async function defaultDeps(): Promise<TimeEntryWriteDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async getTimezone() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return "UTC";
      }
      const { data } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .maybeSingle();
      return (data?.timezone as string | null)?.trim() || "UTC";
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
    async getEntry(id, userId) {
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
    async insertManual({ userId, focusId, startAt, endAt, note }) {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          focus_id: focusId,
          start_at: startAt,
          end_at: endAt,
          source: "manual",
          note,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as TimeEntryRow;
    },
    async updateEntry({ id, userId, startAt, endAt, note }) {
      const { data, error } = await supabase
        .from("time_entries")
        .update({
          start_at: startAt,
          end_at: endAt,
          note,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as TimeEntryRow;
    },
    async deleteEntry(id, userId) {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

export type CreateManualEntryInput = {
  focusId: string;
  startAt: string;
  endAt?: string;
  durationMs?: number;
  note?: string | null;
};

export async function createManualTimeEntry(
  input: CreateManualEntryInput,
  injected?: TimeEntryWriteDeps,
): Promise<TimeEntryMutationResult> {
  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const startParsed = parseDate(input.startAt, "startAt");
  if ("error" in startParsed) {
    return { ok: false, error: startParsed.error };
  }

  const endParsed =
    input.endAt != null ? parseDate(input.endAt, "endAt") : undefined;
  if (endParsed && "error" in endParsed) {
    return { ok: false, error: endParsed.error };
  }

  const range = resolveTimeRange({
    startAt: startParsed,
    endAt: endParsed && !("error" in endParsed) ? endParsed : undefined,
    durationMs: input.durationMs,
  });
  if ("error" in range) {
    return { ok: false, error: range.error };
  }

  const focus = await deps.getFocus(input.focusId, userId);
  if (!focus) {
    return { ok: false, error: "Focus not found" };
  }

  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim()
      : null;

  try {
    const entry = await deps.insertManual({
      userId,
      focusId: input.focusId,
      startAt: range.startAt.toISOString(),
      endAt: range.endAt.toISOString(),
      note,
    });
    const timeZone = await deps.getTimezone();
    return {
      ok: true,
      entry,
      dayKey: entryDayKey(range.startAt, timeZone),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not create entry",
    };
  }
}

export type UpdateTimeEntryInput = {
  id: string;
  startAt?: string;
  endAt?: string;
  durationMs?: number;
  note?: string | null;
};

export async function updateTimeEntry(
  input: UpdateTimeEntryInput,
  injected?: TimeEntryWriteDeps,
): Promise<TimeEntryMutationResult> {
  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const current = await deps.getEntry(input.id, userId);
  if (!current) {
    return { ok: false, error: "Entry not found" };
  }

  const startAt =
    input.startAt != null
      ? parseDate(input.startAt, "startAt")
      : new Date(current.start_at);
  if ("error" in startAt) {
    return { ok: false, error: startAt.error };
  }

  let endAt: Date | undefined;
  let durationMs: number | undefined;

  if (input.endAt != null) {
    const parsed = parseDate(input.endAt, "endAt");
    if ("error" in parsed) {
      return { ok: false, error: parsed.error };
    }
    endAt = parsed;
  } else if (input.durationMs != null) {
    durationMs = input.durationMs;
  } else if (input.startAt != null) {
    // Start moved without new end → keep previous wall-clock duration
    durationMs =
      new Date(current.end_at).getTime() - new Date(current.start_at).getTime();
  } else {
    endAt = new Date(current.end_at);
  }

  const range = resolveTimeRange({
    startAt,
    endAt,
    durationMs,
  });
  if ("error" in range) {
    return { ok: false, error: range.error };
  }

  const note =
    input.note === undefined
      ? current.note
      : typeof input.note === "string" && input.note.trim()
        ? input.note.trim()
        : null;

  try {
    const entry = await deps.updateEntry({
      id: input.id,
      userId,
      startAt: range.startAt.toISOString(),
      endAt: range.endAt.toISOString(),
      note,
    });
    const timeZone = await deps.getTimezone();
    return {
      ok: true,
      entry,
      dayKey: entryDayKey(range.startAt, timeZone),
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update entry",
    };
  }
}

export async function deleteTimeEntry(
  id: string,
  injected?: TimeEntryWriteDeps,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const current = await deps.getEntry(id, userId);
  if (!current) {
    return { ok: false, error: "Entry not found" };
  }

  try {
    await deps.deleteEntry(id, userId);
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not delete entry",
    };
  }
}
