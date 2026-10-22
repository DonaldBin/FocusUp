import type { SyncOp } from "@/lib/sync/types";

/** Last-write-wins by clientTimestamp (PRD §4.6). */
export function pickNewerByClientTimestamp<
  T extends { clientTimestamp: string },
>(a: T, b: T): T {
  return Date.parse(a.clientTimestamp) >= Date.parse(b.clientTimestamp) ? a : b;
}

/**
 * Ops with the same conflictKey collapse to the newest by clientTimestamp.
 * Ops without a conflictKey are kept in order (e.g. start then stop).
 */
export function coalesceByLww(ops: readonly SyncOp[]): SyncOp[] {
  const result: SyncOp[] = [];
  const indexByKey = new Map<string, number>();

  for (const op of ops) {
    if (!op.conflictKey) {
      result.push(op);
      continue;
    }
    const existingIndex = indexByKey.get(op.conflictKey);
    if (existingIndex === undefined) {
      indexByKey.set(op.conflictKey, result.length);
      result.push(op);
      continue;
    }
    const existing = result[existingIndex]!;
    if (pickNewerByClientTimestamp(existing, op) === op) {
      result[existingIndex] = op;
    }
  }

  return result;
}

export function enqueueOp(queue: readonly SyncOp[], op: SyncOp): SyncOp[] {
  return coalesceByLww([...queue, op]);
}

export function removeOp(queue: readonly SyncOp[], id: string): SyncOp[] {
  return queue.filter((op) => op.id !== id);
}
