import { describe, expect, it } from "vitest";
import {
  coalesceByLww,
  enqueueOp,
  pickNewerByClientTimestamp,
  removeOp,
} from "@/lib/sync/queue";
import type { SyncOp } from "@/lib/sync/types";

function op(partial: Partial<SyncOp> & Pick<SyncOp, "id" | "clientTimestamp">): SyncOp {
  return {
    type: "time_entry.create",
    conflictKey: null,
    path: "/api/time-entries",
    method: "POST",
    body: {},
    ...partial,
  };
}

describe("sync queue LWW", () => {
  it("pickNewerByClientTimestamp keeps the later write", () => {
    const older = { clientTimestamp: "2026-10-22T10:00:00.000Z" };
    const newer = { clientTimestamp: "2026-10-22T11:00:00.000Z" };
    expect(pickNewerByClientTimestamp(older, newer)).toBe(newer);
    expect(pickNewerByClientTimestamp(newer, older)).toBe(newer);
  });

  it("coalesceByLww keeps newest op per conflictKey", () => {
    const a = op({
      id: "1",
      clientTimestamp: "2026-10-22T10:00:00.000Z",
      conflictKey: "summary:f1",
      body: { text: "old" },
    });
    const b = op({
      id: "2",
      clientTimestamp: "2026-10-22T12:00:00.000Z",
      conflictKey: "summary:f1",
      body: { text: "new" },
    });
    const c = op({
      id: "3",
      clientTimestamp: "2026-10-22T11:00:00.000Z",
      conflictKey: null,
    });
    expect(coalesceByLww([a, c, b])).toEqual([
      { ...b },
      c,
    ]);
  });

  it("keeps start then stop without coalescing (no conflictKey)", () => {
    const start = op({
      id: "s1",
      type: "session.start",
      clientTimestamp: "2026-10-22T10:00:00.000Z",
      path: "/api/sessions",
      body: { action: "start" },
    });
    const stop = op({
      id: "s2",
      type: "session.stop",
      clientTimestamp: "2026-10-22T10:05:00.000Z",
      path: "/api/sessions",
      body: { action: "stop" },
    });
    expect(enqueueOp([start], stop)).toEqual([start, stop]);
  });

  it("removeOp drops by id", () => {
    const a = op({ id: "a", clientTimestamp: "2026-10-22T10:00:00.000Z" });
    const b = op({ id: "b", clientTimestamp: "2026-10-22T11:00:00.000Z" });
    expect(removeOp([a, b], "a")).toEqual([b]);
  });
});
