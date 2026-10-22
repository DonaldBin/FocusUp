import { describe, expect, it } from "vitest";
import { shouldAcceptSessionWrite } from "@/lib/domain/sessionWrite";

describe("shouldAcceptSessionWrite", () => {
  it("accepts when there is no existing session", () => {
    expect(
      shouldAcceptSessionWrite(null, new Date("2024-01-02T00:00:00.000Z")),
    ).toBe(true);
  });

  it("accepts equal or newer updated_at (last write wins)", () => {
    const existing = new Date("2024-01-01T12:00:00.000Z");
    expect(
      shouldAcceptSessionWrite(existing, new Date("2024-01-01T12:00:00.000Z")),
    ).toBe(true);
    expect(
      shouldAcceptSessionWrite(existing, new Date("2024-01-01T13:00:00.000Z")),
    ).toBe(true);
  });

  it("rejects older incoming writes", () => {
    const existing = new Date("2024-01-01T12:00:00.000Z");
    expect(
      shouldAcceptSessionWrite(existing, new Date("2024-01-01T11:00:00.000Z")),
    ).toBe(false);
  });
});
