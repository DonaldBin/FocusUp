import { describe, expect, it, vi } from "vitest";
import { mutateOrQueue } from "@/lib/sync/mutateOrQueue";
import { createMemoryStore, loadQueue } from "@/lib/sync/storage";
import { QUEUED_OFFLINE_MESSAGE } from "@/lib/sync/types";
import { flushSyncQueue } from "@/lib/sync/flush";

describe("mutateOrQueue + flush", () => {
  it("sends immediately when online", async () => {
    const store = createMemoryStore();
    const fetchFn = vi.fn(async () =>
      Response.json({ ok: true }),
    );
    const result = await mutateOrQueue(
      {
        type: "time_entry.create",
        path: "/api/time-entries",
        method: "POST",
        body: { focusId: "f1" },
      },
      {
        store,
        fetch: fetchFn as unknown as typeof fetch,
        isOnline: () => true,
        now: () => new Date("2026-10-22T12:00:00.000Z"),
        newId: () => "op1",
      },
    );
    expect(result).toEqual({ status: "ok", data: { ok: true } });
    expect(loadQueue(store)).toEqual([]);
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("enqueues when offline", async () => {
    const store = createMemoryStore();
    const fetchFn = vi.fn();
    const result = await mutateOrQueue(
      {
        type: "session.start",
        path: "/api/sessions",
        method: "POST",
        body: {
          action: "start",
          focusId: "f1",
          clientUpdatedAt: "2026-10-22T12:00:00.000Z",
        },
        clientTimestamp: "2026-10-22T12:00:00.000Z",
      },
      {
        store,
        fetch: fetchFn as unknown as typeof fetch,
        isOnline: () => false,
        now: () => new Date("2026-10-22T12:00:00.000Z"),
        newId: () => "op1",
      },
    );
    expect(result).toEqual({
      status: "queued",
      message: QUEUED_OFFLINE_MESSAGE,
    });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(loadQueue(store)).toHaveLength(1);
  });

  it("enqueues on network failure then flushes when online", async () => {
    const store = createMemoryStore();
    await mutateOrQueue(
      {
        type: "outcome.create",
        path: "/api/outcomes",
        method: "POST",
        body: { focusId: "f1", bodyText: "done" },
        clientTimestamp: "2026-10-22T12:00:00.000Z",
      },
      {
        store,
        fetch: vi.fn(async () => {
          throw new TypeError("Failed to fetch");
        }) as unknown as typeof fetch,
        isOnline: () => true,
        now: () => new Date("2026-10-22T12:00:00.000Z"),
        newId: () => "op1",
      },
    );
    expect(loadQueue(store)).toHaveLength(1);

    const flushFetch = vi.fn(async () => Response.json({ ok: true }));
    const flushed = await flushSyncQueue({
      store,
      fetch: flushFetch as unknown as typeof fetch,
      isOnline: () => true,
    });
    expect(flushed.flushed).toBe(1);
    expect(flushed.remaining).toBe(0);
    expect(loadQueue(store)).toEqual([]);
  });
});
