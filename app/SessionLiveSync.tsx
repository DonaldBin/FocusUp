"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ActiveSessionRow } from "@/lib/db/types";
import { sessionFingerprint } from "@/lib/domain/sessionFingerprint";

/** Poll + refresh so phone/desktop share the same open timer. */
const POLL_MS = 4000;

type Props = {
  session: ActiveSessionRow | null;
};

/**
 * Keeps the home timer in sync across devices.
 * Server data is shared; without this, a tab only refreshes after local actions.
 */
export function SessionLiveSync({ session }: Props) {
  const router = useRouter();
  const knownRef = useRef(sessionFingerprint(session));
  const refreshingRef = useRef(false);

  useEffect(() => {
    knownRef.current = sessionFingerprint(session);
  }, [session]);

  useEffect(() => {
    let intervalId: number | undefined;

    async function check() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (refreshingRef.current) {
        return;
      }
      try {
        const res = await fetch("/api/sessions", { cache: "no-store" });
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          session?: ActiveSessionRow | null;
        };
        if (!data.ok) {
          return;
        }
        const next = sessionFingerprint(data.session ?? null);
        if (next === knownRef.current) {
          return;
        }
        knownRef.current = next;
        refreshingRef.current = true;
        router.refresh();
        window.setTimeout(() => {
          refreshingRef.current = false;
        }, 1500);
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
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onFocus);
    };
  }, [router]);

  return null;
}
