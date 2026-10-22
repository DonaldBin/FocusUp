import { NextResponse } from "next/server";
import { createManualTimeEntry } from "@/lib/db/timeEntries";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const obj = typeof body === "object" && body !== null ? body : {};
  const focusId =
    "focusId" in obj && typeof (obj as { focusId: unknown }).focusId === "string"
      ? (obj as { focusId: string }).focusId
      : "";
  const startAt =
    "startAt" in obj && typeof (obj as { startAt: unknown }).startAt === "string"
      ? (obj as { startAt: string }).startAt
      : "";
  const endAt =
    "endAt" in obj && typeof (obj as { endAt: unknown }).endAt === "string"
      ? (obj as { endAt: string }).endAt
      : undefined;
  const durationRaw =
    "durationMs" in obj ? (obj as { durationMs: unknown }).durationMs : undefined;
  const durationMs =
    typeof durationRaw === "number"
      ? durationRaw
      : typeof durationRaw === "string" && durationRaw.trim() !== ""
        ? Number(durationRaw)
        : undefined;
  const durationMsSafe =
    durationMs !== undefined && Number.isFinite(durationMs)
      ? durationMs
      : undefined;
  const note =
    "note" in obj && typeof (obj as { note: unknown }).note === "string"
      ? (obj as { note: string }).note
      : null;

  if (!focusId || !startAt) {
    return NextResponse.json(
      { ok: false, error: "focusId and startAt are required" },
      { status: 400 },
    );
  }

  const result = await createManualTimeEntry({
    focusId,
    startAt,
    endAt,
    durationMs: durationMsSafe,
    note,
  });

  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Focus not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
