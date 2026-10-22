import { NextResponse } from "next/server";
import { updateReviewSchedule } from "@/lib/db/profile";

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

  const obj =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};

  const reviewWeekday =
    typeof obj.reviewWeekday === "number"
      ? obj.reviewWeekday
      : typeof obj.reviewWeekday === "string"
        ? Number(obj.reviewWeekday)
        : NaN;
  const timezone = typeof obj.timezone === "string" ? obj.timezone : "";

  const result = await updateReviewSchedule({ reviewWeekday, timezone });
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
