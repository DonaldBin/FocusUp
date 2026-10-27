import { NextResponse } from "next/server";
import {
  getActiveSessionForUser,
  startSession,
  stopSession,
} from "@/lib/db/sessions";

/**
 * Every response carries `serverNow` so clients can anchor their local clock
 * to the server (`lib/domain/serverClock`). Timers compare a client reading
 * against a server-written `start_at`, so an unsynced client clock would
 * otherwise show a permanently offset elapsed time.
 */
function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

export async function GET() {
  const session = await getActiveSessionForUser();
  return NextResponse.json(
    { ok: true, session, serverNow: new Date().toISOString() },
    { headers: noStoreHeaders() },
  );
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
    return NextResponse.json(
      { ...result, serverNow: new Date().toISOString() },
      { headers: noStoreHeaders() },
    );
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
    return NextResponse.json(
      { ...result, serverNow: new Date().toISOString() },
      { headers: noStoreHeaders() },
    );
  }

  return NextResponse.json(
    { ok: false, error: "action must be start or stop" },
    { status: 400 },
  );
}
