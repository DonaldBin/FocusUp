import { describe, expect, it } from "vitest";
import {
  buildMultiTableCsv,
  escapeCsvCell,
  toCsv,
} from "@/lib/domain/csvExport";

describe("csvExport", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeCsvCell(null)).toBe("");
  });

  it("builds a single table csv", () => {
    const csv = toCsv(
      ["id", "name"],
      [
        ["1", "Fitness"],
        ["2", 'Say "go"'],
      ],
    );
    expect(csv).toBe('id,name\r\n1,Fitness\r\n2,"Say ""go"""');
  });

  it("builds multi-table export with section labels", () => {
    const csv = buildMultiTableCsv([
      {
        name: "focuses",
        headers: ["id", "name"],
        rows: [["f1", "Fitness"]],
      },
      {
        name: "time_entries",
        headers: ["id", "focus_id"],
        rows: [["t1", "f1"]],
      },
    ]);
    expect(csv).toContain("# focuses");
    expect(csv).toContain("id,name");
    expect(csv).toContain("f1,Fitness");
    expect(csv).toContain("# time_entries");
    expect(csv).toContain("t1,f1");
  });
});
