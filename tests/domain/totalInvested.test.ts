import { describe, expect, it } from "vitest";
import {
  formatTotalInvested,
  totalInvestedMs,
} from "@/lib/domain/totalInvested";

describe("totalInvestedMs", () => {
  it("sums wall-clock durations", () => {
    const ms = totalInvestedMs([
      {
        start_at: "2024-06-10T10:00:00.000Z",
        end_at: "2024-06-10T11:00:00.000Z",
      },
      {
        start_at: "2024-06-11T10:00:00.000Z",
        end_at: "2024-06-11T10:15:00.000Z",
      },
    ]);
    expect(ms).toBe(75 * 60 * 1000);
  });

  it("ignores non-positive spans", () => {
    expect(
      totalInvestedMs([
        {
          start_at: "2024-06-10T10:00:00.000Z",
          end_at: "2024-06-10T10:00:00.000Z",
        },
      ]),
    ).toBe(0);
  });
});

describe("formatTotalInvested", () => {
  it("formats hours and minutes like the PRD example", () => {
    expect(formatTotalInvested((42 * 60 + 15) * 60_000)).toBe("42h 15m");
  });

  it("formats hours only and minutes only", () => {
    expect(formatTotalInvested(3 * 60 * 60_000)).toBe("3h");
    expect(formatTotalInvested(15 * 60_000)).toBe("15m");
    expect(formatTotalInvested(0)).toBe("0m");
  });
});
