import { NextResponse } from "next/server";
import { createOutcome } from "@/lib/db/outcomes";

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
  const timeEntryId =
    "timeEntryId" in obj &&
    typeof (obj as { timeEntryId: unknown }).timeEntryId === "string"
      ? (obj as { timeEntryId: string }).timeEntryId
      : null;
  const bodyText =
    "bodyText" in obj && typeof (obj as { bodyText: unknown }).bodyText === "string"
      ? (obj as { bodyText: string }).bodyText
      : null;
  const numberValue =
    "numberValue" in obj ? (obj as { numberValue: unknown }).numberValue : null;
  const url =
    "url" in obj && typeof (obj as { url: unknown }).url === "string"
      ? (obj as { url: string }).url
      : null;

  if (!focusId) {
    return NextResponse.json(
      { ok: false, error: "focusId is required" },
      { status: 400 },
    );
  }

  const result = await createOutcome({
    focusId,
    timeEntryId,
    bodyText,
    numberValue:
      typeof numberValue === "number" || typeof numberValue === "string"
        ? numberValue
        : null,
    url,
  });

  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Focus not found" ||
            result.error === "Time entry not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
