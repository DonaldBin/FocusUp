import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { listFocuses } from "@/lib/db/focuses";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { countOccupied } from "@/lib/domain/quota";
import {
  LOGIN_PATH,
  ONBOARDING_PATH,
  PRIVACY_PATH,
  TERMS_PATH,
} from "@/lib/auth/paths";
import { AccountSettings } from "./AccountSettings";
import { PlanSettings } from "./PlanSettings";
import { ScheduleSettings } from "./ScheduleSettings";

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(LOGIN_PATH);
  }

  const profile = await getCurrentProfile();
  if (
    !isOnboardingComplete(profile) ||
    !profile?.plan ||
    profile.review_weekday == null ||
    !profile.timezone
  ) {
    redirect(ONBOARDING_PATH);
  }

  const focuses = await listFocuses();
  const occupied = countOccupied(focuses);

  return (
    <main className="min-h-screen flex flex-col items-center p-6 gap-6">
      <div className="text-center space-y-1 pt-4">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm opacity-70">Account preferences</p>
      </div>
      <PlanSettings currentPlan={profile.plan} occupied={occupied} />
      <ScheduleSettings
        reviewWeekday={profile.review_weekday}
        timezone={profile.timezone}
      />
      <AccountSettings />
      <p className="text-xs opacity-60 text-center space-x-3">
        <Link href={PRIVACY_PATH} className="link link-hover">
          Privacy Policy
        </Link>
        <Link href={TERMS_PATH} className="link link-hover">
          Terms of Service
        </Link>
      </p>
      <Link href="/" className="link link-hover text-sm opacity-70">
        Back home
      </Link>
    </main>
  );
}
