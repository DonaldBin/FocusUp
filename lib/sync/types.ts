/** Offline sync queue ops (PRD §4.6 / Task 11.1). */

export type SyncOpType =
  | "session.start"
  | "session.stop"
  | "time_entry.create"
  | "outcome.create";

export type SyncOp = {
  id: string;
  type: SyncOpType;
  /** ISO timestamp; newer wins when conflictKey matches. */
  clientTimestamp: string;
  /** When set, coalesceByLww keeps only the newest op per key. */
  conflictKey: string | null;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
};

export const SYNC_QUEUE_STORAGE_KEY = "focusup.syncQueue.v1";

export const QUEUED_OFFLINE_MESSAGE =
  "Saved offline. Will sync when you are back online.";
