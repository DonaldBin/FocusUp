import { createServerSupabaseClient } from "@/lib/db/server";
import type {
  ActiveSessionRow,
  FocusRow,
  TimeEntryRow,
} from "@/lib/db/types";
import { durationMs } from "@/lib/domain/timeEntry";
import { shouldAcceptSessionWrite } from "@/lib/domain/sessionWrite";

export const STALE_SESSION_WRITE_MESSAGE =
  "Stale session write ignored (newer session already saved).";

export type SessionResult =
  | {
      ok: true;
      session: ActiveSessionRow | null;
      closedEntry: TimeEntryRow | null;
    }
  | { ok: false; error: string };

export type StartSessionInput = {
  focusId: string;
  /** ISO timestamp for last-write-wins; defaults to server now. */
  clientUpdatedAt?: string;
  now?: Date;
};

export type StopSessionInput = {
  clientUpdatedAt?: string;
  now?: Date;
};

export type SessionDeps = {
  getUserId: () => Promise<string | null>;
  getFocus: (focusId: string, userId: string) => Promise<FocusRow | null>;
  getActiveSession: (userId: string) => Promise<ActiveSessionRow | null>;
  insertTimeEntry: (input: {
    userId: string;
    focusId: string;
    startAt: string;
    endAt: string;
  }) => Promise<TimeEntryRow>;
  upsertSession: (input: {
    userId: string;
    focusId: string;
    startAt: string;
    updatedAt: string;
  }) => Promise<ActiveSessionRow>;
  deleteSession: (userId: string) => Promise<void>;
  markFocusActiveAndUsed: (
    focusId: string,
    userId: string,
    usedAt: string,
  ) => Promise<void>;
  touchFocusUsed: (
    focusId: string,
    userId: string,
    usedAt: string,
  ) => Promise<void>;
};

function parseIncomingUpdatedAt(
  clientUpdatedAt: string | undefined,
  now: Date,
): Date | { error: string } {
  if (!clientUpdatedAt) {
    return now;
  }
  const parsed = new Date(clientUpdatedAt);
  if (Number.isNaN(parsed.getTime())) {
    return { error: "Invalid clientUpdatedAt" };
  }
  return parsed;
}

async function defaultDeps(): Promise<SessionDeps> {
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
    async getActiveSession(userId) {
      const { data, error } = await supabase
        .from("active_sessions")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        throw new Error(error.message);
      }
      return (data as ActiveSessionRow | null) ?? null;
    },
    async insertTimeEntry({ userId, focusId, startAt, endAt }) {
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          user_id: userId,
          focus_id: focusId,
          start_at: startAt,
          end_at: endAt,
          source: "timer",
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as TimeEntryRow;
    },
    async upsertSession({ userId, focusId, startAt, updatedAt }) {
      const { data, error } = await supabase
        .from("active_sessions")
        .upsert(
          {
            user_id: userId,
            focus_id: focusId,
            start_at: startAt,
            updated_at: updatedAt,
          },
          { onConflict: "user_id" },
        )
        .select("*")
        .single();
      if (error) {
        throw new Error(error.message);
      }
      return data as ActiveSessionRow;
    },
    async deleteSession(userId) {
      const { error } = await supabase
        .from("active_sessions")
        .delete()
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
    },
    async markFocusActiveAndUsed(focusId, userId, usedAt) {
      const { error } = await supabase
        .from("focuses")
        .update({ status: "active", last_used_at: usedAt })
        .eq("id", focusId)
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
    },
    async touchFocusUsed(focusId, userId, usedAt) {
      const { error } = await supabase
        .from("focuses")
        .update({ last_used_at: usedAt })
        .eq("id", focusId)
        .eq("user_id", userId);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}

async function closeSessionToEntry(
  deps: SessionDeps,
  userId: string,
  session: ActiveSessionRow,
  endAt: Date,
): Promise<TimeEntryRow | null> {
  const start = new Date(session.start_at);
  if (durationMs(start, endAt) < 0) {
    throw new Error("Invalid session times");
  }
  const entry = await deps.insertTimeEntry({
    userId,
    focusId: session.focus_id,
    startAt: session.start_at,
    endAt: endAt.toISOString(),
  });
  await deps.touchFocusUsed(session.focus_id, userId, endAt.toISOString());
  return entry;
}

/**
 * Start timing on a focus. Only one open session per user.
 * Starting another focus closes the previous session into a timer time_entry.
 */
export async function startSession(
  input: StartSessionInput,
  injected?: SessionDeps,
): Promise<SessionResult> {
  const now = input.now ?? new Date();
  const incoming = parseIncomingUpdatedAt(input.clientUpdatedAt, now);
  if ("error" in incoming) {
    return { ok: false, error: incoming.error };
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
  if (focus.status === "ended") {
    return { ok: false, error: "Cannot start an ended focus" };
  }

  const existing = await deps.getActiveSession(userId);
  if (
    existing &&
    !shouldAcceptSessionWrite(new Date(existing.updated_at), incoming)
  ) {
    return { ok: false, error: STALE_SESSION_WRITE_MESSAGE };
  }

  let closedEntry: TimeEntryRow | null = null;

  if (existing && existing.focus_id === input.focusId) {
    // Already timing this focus — bump updated_at (last-write touch).
    const session = await deps.upsertSession({
      userId,
      focusId: input.focusId,
      startAt: existing.start_at,
      updatedAt: incoming.toISOString(),
    });
    return { ok: true, session, closedEntry: null };
  }

  if (existing) {
    closedEntry = await closeSessionToEntry(deps, userId, existing, now);
  }

  await deps.markFocusActiveAndUsed(
    input.focusId,
    userId,
    now.toISOString(),
  );

  const session = await deps.upsertSession({
    userId,
    focusId: input.focusId,
    startAt: now.toISOString(),
    updatedAt: incoming.toISOString(),
  });

  return { ok: true, session, closedEntry };
}

/** Stop the current open session and write a timer time_entry. */
export async function stopSession(
  input: StopSessionInput = {},
  injected?: SessionDeps,
): Promise<SessionResult> {
  const now = input.now ?? new Date();
  const incoming = parseIncomingUpdatedAt(input.clientUpdatedAt, now);
  if ("error" in incoming) {
    return { ok: false, error: incoming.error };
  }

  const deps = injected ?? (await defaultDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  const existing = await deps.getActiveSession(userId);
  if (!existing) {
    return { ok: true, session: null, closedEntry: null };
  }

  if (!shouldAcceptSessionWrite(new Date(existing.updated_at), incoming)) {
    return { ok: false, error: STALE_SESSION_WRITE_MESSAGE };
  }

  const closedEntry = await closeSessionToEntry(deps, userId, existing, now);
  await deps.deleteSession(userId);
  return { ok: true, session: null, closedEntry };
}

export async function getActiveSessionForUser(): Promise<ActiveSessionRow | null> {
  const deps = await defaultDeps();
  const userId = await deps.getUserId();
  if (!userId) {
    return null;
  }
  return deps.getActiveSession(userId);
}

export async function listRecentTimeEntries(
  limit = 10,
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
    .order("end_at", { ascending: false })
    .limit(limit);
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as TimeEntryRow[];
}
