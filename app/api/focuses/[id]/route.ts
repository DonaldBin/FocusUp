import { NextResponse } from "next/server";
import {
  updateFocusStatus,
  updateInvestmentSummary,
} from "@/lib/db/focuses";

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

  if (
    "investmentSummary" in obj &&
    typeof (obj as { investmentSummary: unknown }).investmentSummary === "string"
  ) {
    const result = await updateInvestmentSummary(
      id,
      (obj as { investmentSummary: string }).investmentSummary,
    );
    if (!result.ok) {
      const code =
        result.error === "Not signed in"
          ? 401
          : result.error === "Focus not found"
            ? 404
            : 400;
      return NextResponse.json(result, { status: code });
    }
    return NextResponse.json(result);
  }

  const status =
    "status" in obj && typeof (obj as { status: unknown }).status === "string"
      ? (obj as { status: string }).status
      : "";

  const result = await updateFocusStatus(id, status);

  if (!result.ok) {
    const code =
      result.error === "Not signed in"
        ? 401
        : result.error === "Focus not found"
          ? 404
          : 400;
    return NextResponse.json(result, { status: code });
  }

  return NextResponse.json(result);
}

/** Hard delete is forbidden (PRD / Task 4.3). Use status: "ended" instead. */
export async function DELETE() {
  return NextResponse.json(
    {
      ok: false,
      error: "Focuses cannot be deleted. End them instead.",
    },
    { status: 405 },
  );
}
