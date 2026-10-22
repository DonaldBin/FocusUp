import { enqueueOp } from "@/lib/sync/queue";
import { isForceOffline } from "@/lib/sync/offlineFlag";
import { loadQueue, saveQueue, type KvStore } from "@/lib/sync/storage";
import type { SyncOp, SyncOpType } from "@/lib/sync/types";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";

export type MutateOrQueueInput = {
  type: SyncOpType;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body: Record<string, unknown>;
  conflictKey?: string | null;
  clientTimestamp?: string;
};

export type MutateOrQueueResult =
  | { status: "ok"; data: unknown }
  | { status: "queued"; message: string }
  | { status: "error"; error: string };

export type MutateOrQueueDeps = {
  fetch: typeof fetch;
  store: KvStore | null;
  isOnline: () => boolean;
  now: () => Date;
  newId: () => string;
};

function browserDeps(): MutateOrQueueDeps {
  return {
    fetch: (...args) => globalThis.fetch(...args),
    store: typeof window !== "undefined" ? window.localStorage : null,
    isOnline: () => {
      if (isForceOffline()) {
        return false;
      }
      return typeof navigator === "undefined" ? true : navigator.onLine !== false;
    },
    now: () => new Date(),
    newId: () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `op-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  };
}

export function isLikelyNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const msg = error.message.toLowerCase();
  return (
    error.name === "TypeError" ||
    error.name === "NetworkError" ||
    error.name === "AbortError" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("fetch failed") ||
    msg.includes("load failed") ||
    msg.includes("internet")
  );
}

function notifyQueueChanged(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event("focusup-sync-queue-changed"));
}

function buildOp(
  input: MutateOrQueueInput,
  deps: MutateOrQueueDeps,
): SyncOp {
  const clientTimestamp =
    input.clientTimestamp ?? deps.now().toISOString();
  return {
    id: deps.newId(),
    type: input.type,
    clientTimestamp,
    conflictKey: input.conflictKey ?? null,
    path: input.path,
    method: input.method,
    body: input.body,
  };
}

function enqueueLocal(
  input: MutateOrQueueInput,
  deps: MutateOrQueueDeps,
): MutateOrQueueResult {
  const op = buildOp(input, deps);
  const next = enqueueOp(loadQueue(deps.store), op);
  saveQueue(next, deps.store);
  notifyQueueChanged();
  return { status: "queued", message: QUEUED_OFFLINE_MESSAGE };
}

/**
 * Try the API; if offline / network failure, enqueue for later flush.
 */
export async function mutateOrQueue(
  input: MutateOrQueueInput,
  injected?: Partial<MutateOrQueueDeps>,
): Promise<MutateOrQueueResult> {
  const deps: MutateOrQueueDeps = { ...browserDeps(), ...injected };

  if (!deps.isOnline()) {
    return enqueueLocal(input, deps);
  }

  try {
    const res = await deps.fetch(input.path, {
      method: input.method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input.body),
    });
    let data: { ok?: boolean; error?: string };
    try {
      data = (await res.json()) as { ok?: boolean; error?: string };
    } catch {
      // Non-JSON (e.g. HTML error page while "online" but unreachable)
      return enqueueLocal(input, deps);
    }
    if (!res.ok || data.ok === false) {
      return {
        status: "error",
        error: data.error ?? `Request failed (${res.status})`,
      };
    }
    return { status: "ok", data };
  } catch (error) {
    // Prefer queue over losing the user's action on any transport failure.
    if (isLikelyNetworkError(error) || !deps.isOnline()) {
      return enqueueLocal(input, deps);
    }
    return {
      status: "error",
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}
