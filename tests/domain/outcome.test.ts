import { describe, expect, it } from "vitest";
import { normalizeOutcomeFields } from "@/lib/domain/outcome";

describe("normalizeOutcomeFields", () => {
  it("allows text only", () => {
    expect(normalizeOutcomeFields({ bodyText: "  Shipped  " })).toEqual({
      bodyText: "Shipped",
      numberValue: null,
      url: null,
    });
  });

  it("allows number only", () => {
    expect(normalizeOutcomeFields({ numberValue: 3 })).toEqual({
      bodyText: null,
      numberValue: 3,
      url: null,
    });
  });

  it("allows url only", () => {
    expect(
      normalizeOutcomeFields({ url: "https://example.com/path" }),
    ).toEqual({
      bodyText: null,
      numberValue: null,
      url: "https://example.com/path",
    });
  });

  it("allows combinations", () => {
    expect(
      normalizeOutcomeFields({
        bodyText: "PR",
        numberValue: "2",
        url: "https://example.com",
      }),
    ).toEqual({
      bodyText: "PR",
      numberValue: 2,
      url: "https://example.com/",
    });
  });

  it("rejects empty outcome (time-only needs no row)", () => {
    expect(normalizeOutcomeFields({})).toEqual({
      error:
        "Add text, a number, or a link — or skip outcome and keep time only",
    });
  });

  it("rejects invalid url", () => {
    expect(normalizeOutcomeFields({ url: "not-a-url" })).toEqual({
      error: "Invalid URL",
    });
  });
});
