import { NextResponse } from "next/server";
import {
  getActiveSessionForUser,
  startSession,
  stopSession,
} from "@/lib/db/sessions";

export async function GET() {
  const session = await getActiveSessionForUser();
  return NextResponse.json({ ok: true, session });
}

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

  const action =
    typeof body === "object" &&
    body !== null &&
    "action" in body &&
    typeof (body as { action: unknown }).action === "string"
      ? (body as { action: string }).action
      : "";

  const clientUpdatedAt =
    typeof body === "object" &&
    body !== null &&
    "clientUpdatedAt" in body &&
    typeof (body as { clientUpdatedAt: unknown }).clientUpdatedAt === "string"
      ? (body as { clientUpdatedAt: string }).clientUpdatedAt
      : undefined;

  if (action === "stop") {
    const result = await stopSession({ clientUpdatedAt });
    if (!result.ok) {
      const status = result.error === "Not signed in" ? 401 : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  if (action === "start") {
    const focusId =
      typeof body === "object" &&
      body !== null &&
      "focusId" in body &&
      typeof (body as { focusId: unknown }).focusId === "string"
        ? (body as { focusId: string }).focusId
        : "";
    if (!focusId) {
      return NextResponse.json(
        { ok: false, error: "focusId is required" },
        { status: 400 },
      );
    }
    const result = await startSession({ focusId, clientUpdatedAt });
    if (!result.ok) {
      const status =
        result.error === "Not signed in"
          ? 401
          : result.error === "Focus not found"
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }
    return NextResponse.json(result);
  }

  return NextResponse.json(
    { ok: false, error: "action must be start or stop" },
    { status: 400 },
  );
}
