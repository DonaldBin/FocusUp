/**
 * CSV helpers for account data export (Task 10.3 / PRD §4.7).
 */

export type CsvTable = {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null | undefined)[][];
};

export function escapeCsvCell(
  value: string | number | boolean | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  const raw = typeof value === "string" ? value : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

/** Multiple tables in one downloadable file, labeled with # section headers. */
export function buildMultiTableCsv(tables: CsvTable[]): string {
  const parts: string[] = [];
  for (const table of tables) {
    parts.push(`# ${table.name}`);
    parts.push(toCsv(table.headers, table.rows));
    parts.push("");
  }
  return parts.join("\r\n").trimEnd() + "\r\n";
}
