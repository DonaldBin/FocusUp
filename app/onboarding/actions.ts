"use server";

import { redirect } from "next/navigation";
import { completeOnboarding } from "@/lib/db/profile";
import { POST_LOGIN_PATH } from "@/lib/auth/paths";

export type OnboardingActionState = {
  error?: string;
};

export async function submitOnboarding(
  _prev: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const plan = String(formData.get("plan") ?? "");
  const reviewWeekday = Number(formData.get("reviewWeekday"));
  const timezone = String(formData.get("timezone") ?? "");

  const result = await completeOnboarding({
    plan,
    reviewWeekday,
    timezone,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(POST_LOGIN_PATH);
}
