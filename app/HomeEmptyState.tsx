"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EXAMPLE_FOCUSES } from "@/lib/domain/focusExamples";
import { HOME_EMPTY_BLURB } from "@/lib/domain/homeEmpty";

export function HomeEmptyState() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState<string | null>(null);

  async function createExample(example: (typeof EXAMPLE_FOCUSES)[number]) {
    setError(null);
    setPendingName(example.name);
    try {
      const res = await fetch("/api/focuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: example.name, why: example.why }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not create focus");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create focus");
    } finally {
      setPendingName(null);
    }
  }

  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5 px-1">
      <p className="text-center text-base opacity-80 leading-relaxed">
        {HOME_EMPTY_BLURB}
      </p>

      <Link href="/focuses/new" className="btn btn-primary w-full">
        Create a focus
      </Link>

      <div className="w-full space-y-2">
        <p className="text-sm opacity-60 text-center">Try an example</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          {EXAMPLE_FOCUSES.map((example) => (
            <button
              key={example.name}
              type="button"
              className="btn btn-outline btn-sm w-full sm:w-auto"
              disabled={pendingName != null}
              onClick={() => void createExample(example)}
            >
              {pendingName === example.name ? "Creating…" : example.name}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-error text-sm text-center" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
