import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/db/deleteAccount";

export async function DELETE(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const confirmation =
    typeof body === "object" &&
    body !== null &&
    "confirmation" in body &&
    typeof (body as { confirmation: unknown }).confirmation === "string"
      ? (body as { confirmation: string }).confirmation
      : "";

  const result = await deleteAccount(confirmation);
  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error.startsWith("Type ")
          ? 400
          : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
