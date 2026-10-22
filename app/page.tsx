import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/db/server";
import { getCurrentProfile } from "@/lib/db/profile";
import { listFocuses } from "@/lib/db/focuses";
import {
  getActiveSessionForUser,
  listRecentTimeEntries,
} from "@/lib/db/sessions";
import { listRecentOutcomes } from "@/lib/db/outcomes";
import { getHomeReviewPrompt } from "@/lib/db/reviews";
import { isOnboardingComplete } from "@/lib/domain/onboarding";
import { isHomeEmpty } from "@/lib/domain/homeEmpty";
import { pickRecentFocuses } from "@/lib/domain/recentFocuses";
import { LOGIN_PATH, ONBOARDING_PATH, SETTINGS_PATH } from "@/lib/auth/paths";
import { ActiveTimerBanner } from "./ActiveTimerBanner";
import { FocusList } from "./FocusList";
import { HomeEmptyState } from "./HomeEmptyState";
import { ManualEntryForm } from "./ManualEntryForm";
import { OfflineSyncBoot } from "./OfflineSyncBoot";
import { OutcomeForm } from "./OutcomeForm";
import { PendingReviewBanner } from "./PendingReviewBanner";
import { RecentEntries } from "./RecentEntries";
import { RecentFocusShortcuts } from "./RecentFocusShortcuts";
import { RecentOutcomes } from "./RecentOutcomes";

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const profile = await getCurrentProfile();
    if (!isOnboardingComplete(profile)) {
      redirect(ONBOARDING_PATH);
    }
  }

  const focuses = user ? await listFocuses() : [];
  const empty = user ? isHomeEmpty(focuses) : false;
  const activeSession = user && !empty ? await getActiveSessionForUser() : null;
  const recentEntries =
    user && !empty ? await listRecentTimeEntries(5) : [];
  const recentOutcomes =
    user && !empty ? await listRecentOutcomes(5) : [];
  const recentShortcuts =
    user && !empty ? pickRecentFocuses(focuses) : [];
  const reviewPrompt =
    user && !empty ? await getHomeReviewPrompt() : null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-3xl font-bold">FocusUp</h1>
      <p className="text-base opacity-70 text-center max-w-sm">
        Focus areas + weekly decide
      </p>
      {user ? (
        empty ? (
          <HomeEmptyState />
        ) : (
          <>
            <p className="text-sm opacity-80 text-center">
              Signed in as {user.email ?? user.id}
            </p>
            <OfflineSyncBoot />
            {reviewPrompt ? (
              <PendingReviewBanner prompt={reviewPrompt} />
            ) : null}
            {activeSession ? (
              <ActiveTimerBanner session={activeSession} focuses={focuses} />
            ) : null}
            <RecentFocusShortcuts
              focuses={recentShortcuts}
              activeSession={activeSession}
            />
            <FocusList focuses={focuses} activeSession={activeSession} />
            <ManualEntryForm focuses={focuses} />
            <OutcomeForm focuses={focuses} recentEntries={recentEntries} />
            <RecentEntries entries={recentEntries} focuses={focuses} />
            <RecentOutcomes outcomes={recentOutcomes} focuses={focuses} />
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/focuses/new" className="btn btn-primary">
                Create a focus
              </Link>
              <Link href={SETTINGS_PATH} className="btn btn-outline">
                Settings
              </Link>
            </div>
          </>
        )
      ) : (
        <Link href={LOGIN_PATH} className="btn btn-primary btn-sm">
          Sign in with Google
        </Link>
      )}
    </main>
  );
}
