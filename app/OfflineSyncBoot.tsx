"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { flushSyncQueue } from "@/lib/sync/flush";
import { isForceOffline, setForceOffline } from "@/lib/sync/offlineFlag";
import { loadQueue } from "@/lib/sync/storage";

const isDev = process.env.NODE_ENV === "development";

/**
 * Flushes the offline queue on mount and when the browser goes online.
 * UI: silent in production when idle; show status only when there is
 * pending work / errors. “Simulate offline” is development-only.
 */
export function OfflineSyncBoot() {
  const router = useRouter();
  const [pending, setPending] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [forceOffline, setForceOfflineState] = useState(false);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(() => {
    setPending(loadQueue().length);
    setForceOfflineState(isForceOffline());
  }, []);

  const flush = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    setError(null);
    try {
      refreshCount();
      if (isForceOffline()) {
        setError("Turn off “Simulate offline” first, then tap Sync now");
        return;
      }
      const result = await flushSyncQueue();
      refreshCount();
      if (result.flushed > 0) {
        setMessage(`Synced ${result.flushed} offline change(s)`);
        router.refresh();
        window.setTimeout(() => setMessage(null), 5000);
      }
      if (result.errors.length > 0) {
        setError(result.errors[0] ?? "Sync failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshCount, router]);

  useEffect(() => {
    refreshCount();
    void flush();

    const onOnline = () => {
      window.setTimeout(() => void flush(), 300);
    };
    const onQueue = () => refreshCount();
    window.addEventListener("online", onOnline);
    window.addEventListener("focusup-sync-queue-changed", onQueue);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focusup-sync-queue-changed", onQueue);
    };
    // Intentionally run once on mount — do not depend on flush identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleForceOffline() {
    const next = !isForceOffline();
    setForceOffline(next);
    setForceOfflineState(next);
    setError(null);
    setMessage(
      next
        ? "Offline ON — add an entry below"
        : "Offline OFF — tap Sync now",
    );
    window.setTimeout(() => setMessage(null), 4000);
    refreshCount();
  }

  const canSync = !forceOffline && pending > 0;
  const showPanel =
    isDev || pending > 0 || forceOffline || Boolean(message) || Boolean(error);

  if (!showPanel) {
    return null;
  }

  return (
    <div
      className="w-full space-y-2 border border-base-300 rounded-lg p-3 text-center"
      role="status"
    >
      <p className="text-sm font-medium">
        {pending > 0 || forceOffline ? "Offline sync" : "Sync"}
      </p>
      {forceOffline ? (
        <p className="text-xs text-warning">
          Simulate offline is ON — saves go to the local queue
        </p>
      ) : pending > 0 ? (
        <p className="text-xs opacity-60">
          {pending} change(s) waiting to sync
        </p>
      ) : message || error ? null : isDev ? (
        <p className="text-xs opacity-60">No pending changes</p>
      ) : null}
      {message ? <p className="text-sm text-success">{message}</p> : null}
      {error ? (
        <p className="text-error text-xs" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        {isDev ? (
          <button
            type="button"
            className={`btn btn-sm ${forceOffline ? "btn-warning" : "btn-outline"}`}
            onClick={toggleForceOffline}
          >
            {forceOffline ? "Simulate offline: ON" : "Simulate offline"}
          </button>
        ) : null}
        {pending > 0 || forceOffline || isDev ? (
          <button
            type="button"
            className="btn btn-sm btn-primary"
            disabled={!canSync || syncing}
            onClick={() => void flush()}
          >
            {syncing
              ? "Syncing…"
              : canSync
                ? `Sync now (${pending})`
                : "Sync now"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
