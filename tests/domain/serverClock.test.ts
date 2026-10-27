import { describe, expect, it } from "vitest";
import {
  estimateClockOffset,
  isUsableClockSample,
  medianClockOffset,
  serverNowFrom,
  type ClockSample,
} from "@/lib/domain/serverClock";

function sample(
  sent: string,
  received: string,
  server: string,
): ClockSample {
  return {
    requestSentAt: new Date(sent),
    responseReceivedAt: new Date(received),
    serverNow: new Date(server),
  };
}

describe("estimateClockOffset", () => {
  it("is zero when client and server clocks agree", () => {
    // Symmetric 400ms round trip; server stamped at the midpoint.
    const s = sample(
      "2024-06-10T10:00:00.000Z",
      "2024-06-10T10:00:00.400Z",
      "2024-06-10T10:00:00.200Z",
    );
    expect(estimateClockOffset(s)).toBe(0);
  });

  it("is negative when the client clock runs ahead of the server", () => {
    // Desktop clock is 15s fast — the bug this module exists to fix.
    const s = sample(
      "2024-06-10T10:00:15.000Z",
      "2024-06-10T10:00:15.400Z",
      "2024-06-10T10:00:00.200Z",
    );
    expect(estimateClockOffset(s)).toBe(-15000);
  });

  it("is positive when the client clock runs behind the server", () => {
    const s = sample(
      "2024-06-10T09:59:45.000Z",
      "2024-06-10T09:59:45.200Z",
      "2024-06-10T10:00:00.100Z",
    );
    expect(estimateClockOffset(s)).toBe(15000);
  });

  it("rounds to whole milliseconds", () => {
    const s = sample(
      "2024-06-10T10:00:00.000Z",
      "2024-06-10T10:00:00.301Z",
      "2024-06-10T10:00:00.500Z",
    );
    // midpoint 150.5ms → offset 349.5 → 350
    expect(estimateClockOffset(s)).toBe(350);
  });
});

describe("serverNowFrom", () => {
  it("shifts a client clock reading onto the server clock", () => {
    const clientNow = new Date("2024-06-10T10:00:15.000Z");
    expect(serverNowFrom(clientNow, -15000).toISOString()).toBe(
      "2024-06-10T10:00:00.000Z",
    );
  });

  it("is an identity when the offset is zero", () => {
    const clientNow = new Date("2024-06-10T10:00:00.000Z");
    expect(serverNowFrom(clientNow, 0).getTime()).toBe(clientNow.getTime());
  });
});

describe("isUsableClockSample", () => {
  it("accepts a normal round trip", () => {
    expect(
      isUsableClockSample(
        sample(
          "2024-06-10T10:00:00.000Z",
          "2024-06-10T10:00:00.400Z",
          "2024-06-10T10:00:00.200Z",
        ),
      ),
    ).toBe(true);
  });

  it("rejects an inverted round trip (client clock jumped backwards)", () => {
    expect(
      isUsableClockSample(
        sample(
          "2024-06-10T10:00:01.000Z",
          "2024-06-10T10:00:00.000Z",
          "2024-06-10T10:00:00.500Z",
        ),
      ),
    ).toBe(false);
  });

  it("rejects slow samples that span a sleep/resume", () => {
    expect(
      isUsableClockSample(
        sample(
          "2024-06-10T10:00:00.000Z",
          "2024-06-10T10:00:30.000Z",
          "2024-06-10T10:00:15.000Z",
        ),
      ),
    ).toBe(false);
  });

  it("rejects an invalid server timestamp", () => {
    expect(
      isUsableClockSample({
        requestSentAt: new Date("2024-06-10T10:00:00.000Z"),
        responseReceivedAt: new Date("2024-06-10T10:00:00.200Z"),
        serverNow: new Date("not-a-date"),
      }),
    ).toBe(false);
  });
});

describe("medianClockOffset", () => {
  it("returns zero for no samples", () => {
    expect(medianClockOffset([])).toBe(0);
  });

  it("picks the middle value of an odd number of samples", () => {
    const offsets = [
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.400Z",
        "2024-06-10T10:00:00.200Z",
      ), // -15000
      sample(
        "2024-06-10T10:00:16.000Z",
        "2024-06-10T10:00:16.300Z",
        "2024-06-10T10:00:00.150Z",
      ), // -16000
      sample(
        "2024-06-10T10:00:14.000Z",
        "2024-06-10T10:00:14.900Z",
        "2024-06-10T10:00:00.450Z",
      ), // -14000
    ];
    expect(medianClockOffset(offsets)).toBe(-15000);
  });

  it("averages the two middle values of an even number of samples", () => {
    const offsets = [
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.200Z",
        "2024-06-10T10:00:00.100Z",
      ), // -15000
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.200Z",
        "2024-06-10T10:00:00.120Z",
      ), // -14980
    ];
    expect(medianClockOffset(offsets)).toBe(-14990);
  });

  it("ignores jitter from a single slow sample", () => {
    const offsets = [
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.200Z",
        "2024-06-10T10:00:00.100Z",
      ), // -15000
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.400Z",
        "2024-06-10T10:00:00.950Z",
      ), // -14750
      sample(
        "2024-06-10T10:00:15.000Z",
        "2024-06-10T10:00:15.200Z",
        "2024-06-10T10:00:00.100Z",
      ), // -15000
    ];
    expect(medianClockOffset(offsets)).toBe(-15000);
  });
});
