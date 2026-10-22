import { NextResponse } from "next/server";
import { deleteTimeEntry, updateTimeEntry } from "@/lib/db/timeEntries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
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
  const startAt =
    "startAt" in obj && typeof (obj as { startAt: unknown }).startAt === "string"
      ? (obj as { startAt: string }).startAt
      : undefined;
  const endAt =
    "endAt" in obj && typeof (obj as { endAt: unknown }).endAt === "string"
      ? (obj as { endAt: string }).endAt
      : undefined;
  const durationMs =
    "durationMs" in obj &&
    typeof (obj as { durationMs: unknown }).durationMs === "number"
      ? (obj as { durationMs: number }).durationMs
      : undefined;
  const note =
    "note" in obj
      ? typeof (obj as { note: unknown }).note === "string"
        ? (obj as { note: string }).note
        : null
      : undefined;

  const result = await updateTimeEntry({
    id,
    startAt,
    endAt,
    durationMs,
    note,
  });

  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Entry not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteTimeEntry(id);
  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Entry not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
