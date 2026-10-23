"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActiveSessionRow, FocusRow } from "@/lib/db/types";
import { sessionFingerprint } from "@/lib/domain/sessionFingerprint";
import { ActiveTimerBanner } from "./ActiveTimerBanner";
import { FocusList } from "./FocusList";
import { RecentFocusShortcuts } from "./RecentFocusShortcuts";

/** How often to pull the shared timer from the server. */
const POLL_MS = 2500;

type Props = {
  initialSession: ActiveSessionRow | null;
  focuses: FocusRow[];
  recentShortcuts: FocusRow[];
};

type SessionsGetResponse = {
  ok?: boolean;
  session?: ActiveSessionRow | null;
};

/**
 * Owns the live active-session UI so phone/desktop stay aligned.
 * Polling updates React state directly (not only router.refresh).
 */
export function HomeTimingSection({
  initialSession,
  focuses,
  recentShortcuts,
}: Props) {
  const router = useRouter();
  const [liveSession, setLiveSession] = useState<ActiveSessionRow | null>(
    initialSession,
  );
  const knownRef = useRef(sessionFingerprint(initialSession));
  const localActionAtRef = useRef(0);

  // If a full navigation remounts with newer server props, adopt them —
  // but ignore stale RSC payloads that lag behind a newer poll/local action.
  useEffect(() => {
    const incoming = sessionFingerprint(initialSession);
    if (incoming === knownRef.current) {
      return;
    }
    // Within 2s of a local start/stop, prefer local/poll truth over possibly-stale SSR.
    if (Date.now() - localActionAtRef.current < 2000) {
      return;
    }
    knownRef.current = incoming;
    setLiveSession(initialSession);
  }, [initialSession]);

  const applyRemoteSession = useCallback(
    (session: ActiveSessionRow | null, { refreshLists }: { refreshLists: boolean }) => {
      const next = sessionFingerprint(session);
      if (next === knownRef.current) {
        return;
      }
      knownRef.current = next;
      setLiveSession(session);
      if (refreshLists) {
        router.refresh();
      }
    },
    [router],
  );

  const markLocalAction = useCallback(() => {
    localActionAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    let intervalId: number | undefined;
    let cancelled = false;

    async function check() {
      if (document.visibilityState === "hidden") {
        return;
      }
      try {
        const res = await fetch(`/api/sessions?t=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as SessionsGetResponse;
        if (!data.ok || cancelled) {
          return;
        }
        applyRemoteSession(data.session ?? null, { refreshLists: true });
      } catch {
        // Ignore transient network errors.
      }
    }

    function armInterval() {
      window.clearInterval(intervalId);
      if (document.visibilityState === "visible") {
        void check();
        intervalId = window.setInterval(() => void check(), POLL_MS);
      }
    }

    const onVisibility = () => armInterval();
    const onFocus = () => void check();

    armInterval();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
    };
  }, [applyRemoteSession]);

  return (
    <>
      {liveSession ? (
        <ActiveTimerBanner
          key={`${liveSession.focus_id}:${liveSession.start_at}`}
          session={liveSession}
          focuses={focuses}
        />
      ) : null}
      <RecentFocusShortcuts
        focuses={recentShortcuts}
        activeSession={liveSession}
        onSessionLocalChange={(session) => {
          markLocalAction();
          knownRef.current = sessionFingerprint(session);
          setLiveSession(session);
        }}
      />
      <FocusList
        focuses={focuses}
        activeSession={liveSession}
        onSessionLocalChange={(session) => {
          markLocalAction();
          knownRef.current = sessionFingerprint(session);
          setLiveSession(session);
        }}
      />
    </>
  );
}
