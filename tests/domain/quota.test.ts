import { describe, expect, it } from "vitest";
import {
  DOWNGRADE_BLOCKED_MESSAGE,
  PAUSED_COUNT_MESSAGE,
  PLAN_LIMITS,
  canCreateFocus,
  canDowngradeToStandard,
  countOccupied,
  type FocusQuotaInput,
  type Plan,
} from "@/lib/domain/quota";

function focus(status: FocusQuotaInput["status"]): FocusQuotaInput {
  return { status };
}

describe("PLAN_LIMITS", () => {
  it("uses Standard 3 and Intense 7", () => {
    expect(PLAN_LIMITS.standard).toBe(3);
    expect(PLAN_LIMITS.intense).toBe(7);
  });
});

describe("countOccupied", () => {
  it("counts active focuses", () => {
    expect(countOccupied([focus("active"), focus("active")])).toBe(2);
  });

  it("counts paused focuses toward the limit", () => {
    expect(countOccupied([focus("paused"), focus("paused")])).toBe(2);
  });

  it("does not count ended focuses", () => {
    expect(
      countOccupied([focus("active"), focus("ended"), focus("ended")]),
    ).toBe(1);
  });

  it("counts active + paused together and ignores ended", () => {
    expect(
      countOccupied([
        focus("active"),
        focus("paused"),
        focus("ended"),
        focus("paused"),
      ]),
    ).toBe(3);
  });
});

describe("canCreateFocus", () => {
  const standard: Plan = "standard";
  const intense: Plan = "intense";

  it("allows create under Standard limit", () => {
    expect(canCreateFocus([focus("active"), focus("paused")], standard)).toBe(
      true,
    );
  });

  it("blocks create when Standard slots are full (including paused)", () => {
    expect(
      canCreateFocus(
        [focus("active"), focus("paused"), focus("paused")],
        standard,
      ),
    ).toBe(false);
  });

  it("allows create under Intense when Standard would be full", () => {
    expect(
      canCreateFocus(
        [focus("active"), focus("active"), focus("paused"), focus("paused")],
        intense,
      ),
    ).toBe(true);
  });

  it("blocks create when Intense slots are full", () => {
    const seven = Array.from({ length: 7 }, () => focus("active"));
    expect(canCreateFocus(seven, intense)).toBe(false);
  });

  it("ignores ended when checking create room", () => {
    expect(
      canCreateFocus(
        [focus("ended"), focus("ended"), focus("active"), focus("paused")],
        standard,
      ),
    ).toBe(true);
  });
});

describe("canDowngradeToStandard", () => {
  it("allows downgrade when occupied <= 3", () => {
    expect(
      canDowngradeToStandard([
        focus("active"),
        focus("paused"),
        focus("ended"),
      ]),
    ).toBe(true);
  });

  it("blocks downgrade when occupied > 3 (paused still counts)", () => {
    expect(
      canDowngradeToStandard([
        focus("active"),
        focus("paused"),
        focus("paused"),
        focus("paused"),
      ]),
    ).toBe(false);
  });

  it("exposes English quota and downgrade copy", () => {
    expect(PAUSED_COUNT_MESSAGE).toContain("Paused focuses still count");
    expect(DOWNGRADE_BLOCKED_MESSAGE.length).toBeGreaterThan(10);
  });
});
