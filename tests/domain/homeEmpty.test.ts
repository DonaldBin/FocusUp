import { describe, expect, it } from "vitest";
import { HOME_EMPTY_BLURB, isHomeEmpty } from "@/lib/domain/homeEmpty";

describe("isHomeEmpty", () => {
  it("is empty with no focuses", () => {
    expect(isHomeEmpty([])).toBe(true);
  });

  it("is empty when only ended focuses remain", () => {
    expect(isHomeEmpty([{ status: "ended" }, { status: "ended" }])).toBe(true);
  });

  it("is not empty with an active or paused focus", () => {
    expect(isHomeEmpty([{ status: "active" }])).toBe(false);
    expect(isHomeEmpty([{ status: "ended" }, { status: "paused" }])).toBe(
      false,
    );
  });

  it("exposes the English empty blurb", () => {
    expect(HOME_EMPTY_BLURB.length).toBeGreaterThan(10);
  });
});
