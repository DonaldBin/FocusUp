import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { getFocusQuotaSnapshot } from "@/lib/db/focuses";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { LOGIN_PATH, ONBOARDING_PATH } from "@/lib/auth/paths";
import { CreateFocusPage } from "./CreateFocusPage";

export default async function NewFocusRoute() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (!isOnboardingComplete(profile)) {
    redirect(ONBOARDING_PATH);
  }

  const quota = await getFocusQuotaSnapshot();
  if (!quota) {
    redirect(ONBOARDING_PATH);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-6">
      <CreateFocusPage
        canCreate={quota.canCreate}
        occupied={quota.occupied}
        limit={quota.limit}
      />
      <Link href="/" className="link link-hover text-sm opacity-70">
        Back home
      </Link>
    </main>
  );
}
