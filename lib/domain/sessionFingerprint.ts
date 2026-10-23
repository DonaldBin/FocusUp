import type { ActiveSessionRow } from "@/lib/db/types";

/** Stable id for comparing active timer state across polls / devices. */
export function sessionFingerprint(
  session: ActiveSessionRow | null | undefined,
): string {
  if (!session) {
    return "none";
  }
  return `${session.focus_id}|${session.start_at}|${session.updated_at}`;
}
