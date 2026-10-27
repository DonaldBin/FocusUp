import { describe, expect, it, vi } from "vitest";
import {
  measureClockOffset,
  sampleServerClock,
} from "@/lib/sync/serverClockClient";

/** A `now()` that walks a fixed list of instants (one per call). */
function nowSequence(isoTimes: string[]): () => Date {
  let i = 0;
  return () => {
    const iso = isoTimes[Math.min(i, isoTimes.length - 1)]!;
    i += 1;
    return new Date(iso);
  };
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return Response.json(body, init);
}

describe("sampleServerClock", () => {
  it("computes the offset from the serverNow field", async () => {
    // Client clock is 15s fast; 400ms round trip.
    const deps = {
      fetch: vi.fn(async () =>
        jsonResponse({
          ok: true,
          serverNow: "2024-06-10T10:00:00.200Z",
        }),
      ) as unknown as typeof fetch,
      now: nowSequence([
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.400Z",
      ]),
    };

    const sample = await sampleServerClock(deps);

    expect(sample).not.toBeNull();
    expect(sample!.serverNow.toISOString()).toBe("2024-06-10T10:00:00.200Z");
    expect(sample!.requestSentAt.toISOString()).toBe(
      "2024-06-10T10:00:15.000Z",
    );
    expect(sample!.responseReceivedAt.toISOString()).toBe(
      "2024-06-10T10:00:15.400Z",
    );
  });

  it("requests the sessions endpoint without caching", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: true, serverNow: "2024-06-10T10:00:00.000Z" }),
    );
    await sampleServerClock({
      fetch: fetchFn as unknown as typeof fetch,
      now: nowSequence([
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.100Z",
      ]),
    });
    expect(fetchFn).toHaveBeenCalledOnce();
    const [path, init] = fetchFn.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(path).toBe("/api/sessions");
    expect(init.cache).toBe("no-store");
  });

  it("returns null when the response is not ok", async () => {
    const sample = await sampleServerClock({
      fetch: vi.fn(async () =>
        jsonResponse({ ok: false }, { status: 401 }),
      ) as unknown as typeof fetch,
      now: nowSequence([
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.100Z",
      ]),
    });
    expect(sample).toBeNull();
  });

  it("returns null when serverNow is missing or unparseable", async () => {
    for (const body of [
      { ok: true },
      { ok: true, serverNow: "not-a-date" },
      { ok: true, serverNow: 1234 },
    ]) {
      const sample = await sampleServerClock({
        fetch: vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch,
        now: nowSequence([
          "2024-06-10T10:00:15.000Z",
          "2024-06-10T10:00:15.100Z",
        ]),
      });
      expect(sample).toBeNull();
    }
  });

  it("returns null when the request throws", async () => {
    const sample = await sampleServerClock({
      fetch: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
      now: nowSequence([
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.100Z",
      ]),
    });
    expect(sample).toBeNull();
  });
});

describe("measureClockOffset", () => {
  it("uses the median of several samples", async () => {
    // 15s, 16s, 14s fast → median 15s fast → offset -15000.
    const serverNows = [
      "2024-06-10T10:00:00.200Z",
      "2024-06-10T10:00:00.150Z",
      "2024-06-10T10:00:00.450Z",
    ];
    let call = 0;
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: true, serverNow: serverNows[call++]! }),
    );
    // Each round trip reads the clock twice: send, then receive.
    const now = nowSequence([
      "2024-06-10T10:00:15.000Z",
      "2024-06-10T10:00:15.400Z",
      "2024-06-10T10:00:16.000Z",
      "2024-06-10T10:00:16.300Z",
      "2024-06-10T10:00:14.000Z",
      "2024-06-10T10:00:14.900Z",
    ]);

    const result = await measureClockOffset({
      fetch: fetchFn as unknown as typeof fetch,
      now,
      samples: 3,
    });

    expect(result.offsetMs).toBe(-15000);
    expect(result.usable).toBe(3);
  });

  it("falls back to a zero offset when every sample fails", async () => {
    const result = await measureClockOffset({
      fetch: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
      now: () => new Date("2024-06-10T10:00:15.000Z"),
      samples: 3,
    });

    expect(result.offsetMs).toBe(0);
    expect(result.usable).toBe(0);
  });

  it("defaults to a single request", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ ok: true, serverNow: "2024-06-10T10:00:00.000Z" }),
    );
    await measureClockOffset({
      fetch: fetchFn as unknown as typeof fetch,
      now: nowSequence([
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.100Z",
      ]),
    });
    expect(fetchFn).toHaveBeenCalledOnce();
  });
});
