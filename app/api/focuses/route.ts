import { NextResponse } from "next/server";
import { createFocus } from "@/lib/db/focuses";

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

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name
      : "";
  const why =
    typeof body === "object" &&
    body !== null &&
    "why" in body &&
    typeof (body as { why: unknown }).why === "string"
      ? (body as { why: string }).why
      : "";

  const result = await createFocus({ name, why });

  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Complete onboarding first"
          ? 403
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
