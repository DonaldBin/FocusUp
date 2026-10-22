import { describe, expect, it } from "vitest";
import { pickRecentFocuses } from "@/lib/domain/recentFocuses";

function f(
  id: string,
  status: "active" | "paused" | "ended",
  last_used_at: string | null,
  created_at: string,
) {
  return { id, status, last_used_at, created_at };
}

describe("pickRecentFocuses", () => {
  it("returns at most three open focuses by last_used_at", () => {
    const result = pickRecentFocuses([
      f("a", "active", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
      f("b", "paused", "2024-01-03T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
      f("c", "active", "2024-01-02T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
      f("d", "active", "2024-01-04T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
      f("e", "ended", "2024-01-05T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
    ]);
    expect(result.map((x) => x.id)).toEqual(["d", "b", "c"]);
  });

  it("falls back to created_at when never used", () => {
    const result = pickRecentFocuses([
      f("old", "active", null, "2024-01-01T00:00:00.000Z"),
      f("new", "active", null, "2024-02-01T00:00:00.000Z"),
    ]);
    expect(result.map((x) => x.id)).toEqual(["new", "old"]);
  });

  it("ignores ended focuses", () => {
    expect(
      pickRecentFocuses([
        f("e", "ended", "2024-06-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z"),
      ]),
    ).toEqual([]);
  });
});
