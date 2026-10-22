import { removeOp } from "@/lib/sync/queue";
import { isForceOffline } from "@/lib/sync/offlineFlag";
import { loadQueue, saveQueue, type KvStore } from "@/lib/sync/storage";
import type { SyncOp } from "@/lib/sync/types";

export type FlushResult = {
  flushed: number;
  remaining: number;
  errors: string[];
};

export type FlushDeps = {
  store: KvStore | null;
  fetch: typeof fetch;
  isOnline: () => boolean;
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15000;

function browserFlushDeps(): FlushDeps {
  return {
    store: typeof window !== "undefined" ? window.localStorage : null,
    fetch: (...args) => globalThis.fetch(...args),
    isOnline: () => {
      if (isForceOffline()) {
        return false;
      }
      return typeof navigator === "undefined" ? true : navigator.onLine !== false;
    },
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

function notifyQueueChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("focusup-sync-queue-changed"));
}

async function sendOp(
  op: SyncOp,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<{ ok: true } | { ok: false; error: string; retryable: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetchFn(op.path, {
      method: op.method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(op.body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!res.ok || data?.ok === false) {
      const error = data?.error ?? `Request failed (${res.status})`;
      return { ok: false, error, retryable: true };
    }
    return { ok: true };
  } catch (e) {
    const aborted =
      e instanceof Error &&
      (e.name === "AbortError" || e.message.toLowerCase().includes("abort"));
    return {
      ok: false,
      error: aborted
        ? "Sync timed out — check network / proxy, then try Sync now again"
        : e instanceof Error
          ? e.message
          : "Flush failed",
      retryable: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Flush pending ops in order. Stops on first failure (keeps remaining). */
export async function flushSyncQueue(
  injected?: Partial<FlushDeps>,
): Promise<FlushResult> {
  const deps: FlushDeps = { ...browserFlushDeps(), ...injected };
  if (!deps.isOnline()) {
    const queue = loadQueue(deps.store);
    return { flushed: 0, remaining: queue.length, errors: [] };
  }

  let queue = loadQueue(deps.store);
  let flushed = 0;
  const errors: string[] = [];
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  while (queue.length > 0) {
    const op = queue[0]!;
    const result = await sendOp(op, deps.fetch, timeoutMs);
    if (result.ok) {
      queue = removeOp(queue, op.id);
      saveQueue(queue, deps.store);
      notifyQueueChanged();
      flushed += 1;
      continue;
    }
    errors.push(`${op.type}: ${result.error}`);
    break;
  }

  return { flushed, remaining: queue.length, errors };
}
