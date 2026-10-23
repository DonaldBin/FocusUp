import { describe, expect, it } from "vitest";
import { sessionFingerprint } from "@/lib/domain/sessionFingerprint";

describe("sessionFingerprint", () => {
  it("is none when there is no session", () => {
    expect(sessionFingerprint(null)).toBe("none");
    expect(sessionFingerprint(undefined)).toBe("none");
  });

  it("changes when start or focus changes", () => {
    const a = sessionFingerprint({
      user_id: "u1",
      focus_id: "f1",
      start_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    const b = sessionFingerprint({
      user_id: "u1",
      focus_id: "f1",
      start_at: "2026-01-01T01:00:00.000Z",
      updated_at: "2026-01-01T01:00:00.000Z",
    });
    const c = sessionFingerprint({
      user_id: "u1",
      focus_id: "f2",
      start_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });
});
