import { NextResponse } from "next/server";
import { updatePlan } from "@/lib/db/profile";

export async function PATCH(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const plan =
    typeof body === "object" &&
    body !== null &&
    "plan" in body &&
    typeof (body as { plan: unknown }).plan === "string"
      ? (body as { plan: string }).plan
      : "";

  const result = await updatePlan(plan);
  if (!result.ok) {
    const status =
      result.error === "Not signed in"
        ? 401
        : result.error === "Complete onboarding first"
          ? 403
          : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
