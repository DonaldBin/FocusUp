import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { LOGIN_PATH, POST_LOGIN_PATH } from "@/lib/auth/paths";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (isOnboardingComplete(profile)) {
    redirect(POST_LOGIN_PATH);
  }

  const defaultTimezone =
    profile?.timezone?.trim() ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    "UTC";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold">FocusUp</h1>
        <p className="opacity-70 text-sm">Set up your account</p>
      </div>
      <OnboardingWizard defaultTimezone={defaultTimezone} />
    </main>
  );
}
