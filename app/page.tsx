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
import { SessionLiveSync } from "./SessionLiveSync";

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

  const signedInBusy = Boolean(user && !empty);

  return (
    <main
      className={`min-h-dvh w-full flex flex-col items-center px-4 sm:px-6 gap-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] ${
        signedInBusy ? "justify-start py-6 sm:py-8" : "justify-center py-8"
      }`}
    >
      <div className="w-full max-w-md mx-auto flex flex-col items-center gap-4">
        <h1 className="text-3xl font-bold">FocusUp</h1>
        <p className="text-base opacity-70 text-center">
          Focus areas + weekly decide
        </p>
        {user ? (
          empty ? (
            <HomeEmptyState />
          ) : (
            <>
              <p className="text-sm opacity-80 text-center break-all">
                Signed in as {user.email ?? user.id}
              </p>
              <OfflineSyncBoot />
              <SessionLiveSync session={activeSession} />
              {activeSession ? (
                <ActiveTimerBanner
                  key={`${activeSession.focus_id}:${activeSession.start_at}`}
                  session={activeSession}
                  focuses={focuses}
                />
              ) : null}
              <RecentFocusShortcuts
                focuses={recentShortcuts}
                activeSession={activeSession}
              />
              <FocusList focuses={focuses} activeSession={activeSession} />
              <ManualEntryForm focuses={focuses} />
              {reviewPrompt ? (
                <PendingReviewBanner prompt={reviewPrompt} />
              ) : null}
              <OutcomeForm focuses={focuses} />
              <RecentEntries entries={recentEntries} focuses={focuses} />
              <RecentOutcomes outcomes={recentOutcomes} focuses={focuses} />
              <div className="flex flex-wrap justify-center gap-2 w-full">
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
      </div>
    </main>
  );
}
