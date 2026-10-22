import { createServerSupabaseClient } from "@/lib/db/server";
import { buildMultiTableCsv, type CsvTable } from "@/lib/domain/csvExport";
import type {
  FocusRow,
  OutcomeRow,
  ReviewRow,
  TimeEntryRow,
} from "@/lib/db/types";

export type ExportDataResult =
  | { ok: true; csv: string; filename: string }
  | { ok: false; error: string };

export type ExportDataDeps = {
  getUserId: () => Promise<string | null>;
  listFocuses: () => Promise<FocusRow[]>;
  listTimeEntries: () => Promise<TimeEntryRow[]>;
  listOutcomes: () => Promise<OutcomeRow[]>;
  listReviews: () => Promise<ReviewRow[]>;
  now?: () => Date;
};

async function defaultExportDeps(): Promise<ExportDataDeps> {
  const supabase = await createServerSupabaseClient();
  return {
    async getUserId() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    async listFocuses() {
      const { data, error } = await supabase.from("focuses").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as FocusRow[];
    },
    async listTimeEntries() {
      const { data, error } = await supabase.from("time_entries").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as TimeEntryRow[];
    },
    async listOutcomes() {
      const { data, error } = await supabase.from("outcomes").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as OutcomeRow[];
    },
    async listReviews() {
      const { data, error } = await supabase.from("reviews").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as ReviewRow[];
    },
  };
}

function exportFilename(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `focusup-export-${y}-${m}-${d}.csv`;
}

export function tablesFromRows(input: {
  focuses: FocusRow[];
  timeEntries: TimeEntryRow[];
  outcomes: OutcomeRow[];
  reviews: ReviewRow[];
}): CsvTable[] {
  return [
    {
      name: "focuses",
      headers: [
        "id",
        "name",
        "why",
        "status",
        "last_used_at",
        "investment_summary",
        "created_at",
        "updated_at",
      ],
      rows: input.focuses.map((f) => [
        f.id,
        f.name,
        f.why,
        f.status,
        f.last_used_at,
        f.investment_summary,
        f.created_at,
        f.updated_at,
      ]),
    },
    {
      name: "time_entries",
      headers: [
        "id",
        "focus_id",
        "start_at",
        "end_at",
        "source",
        "note",
        "created_at",
        "updated_at",
      ],
      rows: input.timeEntries.map((t) => [
        t.id,
        t.focus_id,
        t.start_at,
        t.end_at,
        t.source,
        t.note,
        t.created_at,
        t.updated_at,
      ]),
    },
    {
      name: "outcomes",
      headers: [
        "id",
        "focus_id",
        "time_entry_id",
        "body_text",
        "number_value",
        "url",
        "created_at",
        "updated_at",
      ],
      rows: input.outcomes.map((o) => [
        o.id,
        o.focus_id,
        o.time_entry_id,
        o.body_text,
        o.number_value,
        o.url,
        o.created_at,
        o.updated_at,
      ]),
    },
    {
      name: "reviews",
      headers: [
        "id",
        "range_start",
        "range_end",
        "merged",
        "decision",
        "adjust_note",
        "decided_at",
        "created_at",
      ],
      rows: input.reviews.map((r) => [
        r.id,
        r.range_start,
        r.range_end,
        r.merged,
        r.decision,
        r.adjust_note,
        r.decided_at,
        r.created_at,
      ]),
    },
  ];
}

/** Export the signed-in user's focuses, time entries, outcomes, and reviews as CSV. */
export async function exportAccountCsv(
  injected?: ExportDataDeps,
): Promise<ExportDataResult> {
  const deps = injected ?? (await defaultExportDeps());
  const userId = await deps.getUserId();
  if (!userId) {
    return { ok: false, error: "Not signed in" };
  }

  try {
    const [focuses, timeEntries, outcomes, reviews] = await Promise.all([
      deps.listFocuses(),
      deps.listTimeEntries(),
      deps.listOutcomes(),
      deps.listReviews(),
    ]);
    const csv = buildMultiTableCsv(
      tablesFromRows({ focuses, timeEntries, outcomes, reviews }),
    );
    const now = deps.now ? deps.now() : new Date();
    return { ok: true, csv, filename: exportFilename(now) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not export data",
    };
  }
}
