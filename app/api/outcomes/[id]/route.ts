import { NextResponse } from "next/server";
import { deleteOutcome, updateOutcome } from "@/lib/db/outcomes";

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
  const result = await updateOutcome({
    id,
    timeEntryId:
      "timeEntryId" in obj
        ? typeof (obj as { timeEntryId: unknown }).timeEntryId === "string"
          ? (obj as { timeEntryId: string }).timeEntryId
          : null
        : undefined,
    bodyText:
      "bodyText" in obj
        ? typeof (obj as { bodyText: unknown }).bodyText === "string"
          ? (obj as { bodyText: string }).bodyText
          : null
        : undefined,
    numberValue:
      "numberValue" in obj
        ? ((obj as { numberValue: unknown }).numberValue as
            | number
            | string
            | null)
        : undefined,
    url:
      "url" in obj
        ? typeof (obj as { url: unknown }).url === "string"
          ? (obj as { url: string }).url
          : null
        : undefined,
  });

  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Outcome not found" ||
            result.error === "Time entry not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const result = await deleteOutcome(id);
  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Outcome not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result);
}
