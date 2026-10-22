import type { SyncOp } from "@/lib/sync/types";
import { SYNC_QUEUE_STORAGE_KEY } from "@/lib/sync/types";
import { coalesceByLww } from "@/lib/sync/queue";

export type KvStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function createMemoryStore(
  initial: Record<string, string> = {},
): KvStore {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

function defaultStore(): KvStore | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadQueue(store: KvStore | null = defaultStore()): SyncOp[] {
  if (!store) {
    return [];
  }
  try {
    const raw = store.getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return coalesceByLww(parsed as SyncOp[]);
  } catch {
    return [];
  }
}

export function saveQueue(
  queue: readonly SyncOp[],
  store: KvStore | null = defaultStore(),
): void {
  if (!store) {
    return;
  }
  store.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
}
