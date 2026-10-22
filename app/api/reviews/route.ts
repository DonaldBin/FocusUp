import { NextResponse } from "next/server";
import { submitReviewDecision } from "@/lib/db/submitReview";

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
  const rangeStart =
    "rangeStart" in obj &&
    typeof (obj as { rangeStart: unknown }).rangeStart === "string"
      ? (obj as { rangeStart: string }).rangeStart
      : "";
  const rangeEnd =
    "rangeEnd" in obj &&
    typeof (obj as { rangeEnd: unknown }).rangeEnd === "string"
      ? (obj as { rangeEnd: string }).rangeEnd
      : "";
  const decision =
    "decision" in obj && typeof (obj as { decision: unknown }).decision === "string"
      ? (obj as { decision: string }).decision
      : "";
  const merged =
    "merged" in obj && typeof (obj as { merged: unknown }).merged === "boolean"
      ? (obj as { merged: boolean }).merged
      : false;
  const adjustNote =
    "adjustNote" in obj &&
    typeof (obj as { adjustNote: unknown }).adjustNote === "string"
      ? (obj as { adjustNote: string }).adjustNote
      : null;

  const result = await submitReviewDecision({
    rangeStart,
    rangeEnd,
    merged,
    decision,
    adjustNote,
  });

  if (!result.ok) {
    const status = result.error === "Not signed in" ? 401 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
