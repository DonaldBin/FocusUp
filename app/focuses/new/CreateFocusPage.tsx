"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EXAMPLE_FOCUSES,
  FOCUS_LIMIT_REACHED_MESSAGE,
} from "@/lib/domain/focusExamples";

type Props = {
  canCreate: boolean;
  occupied: number;
  limit: number;
};

export function CreateFocusPage({ canCreate, occupied, limit }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const [error, setError] = useState<string | null>(
    canCreate ? null : FOCUS_LIMIT_REACHED_MESSAGE,
  );
  const [pending, setPending] = useState(false);
  const disabled = !canCreate || pending;

  async function createOne(nextName: string, nextWhy: string) {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/focuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, why: nextWhy }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!data.ok) {
        setError(data.error ?? "Could not create focus");
        setPending(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create focus");
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) {
      return;
    }
    await createOne(name, why);
  }

  async function onExampleClick(example: (typeof EXAMPLE_FOCUSES)[number]) {
    if (disabled) {
      return;
    }
    setName(example.name);
    setWhy(example.why);
    await createOne(example.name, example.why);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold">Create a focus</h1>
        <p className="text-sm opacity-70">
          {occupied} of {limit} slots used
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm opacity-70 text-center">Try an example</p>
        <div className="flex flex-wrap justify-center gap-2">
          {EXAMPLE_FOCUSES.map((example) => (
            <button
              key={example.name}
              type="button"
              className="btn btn-outline btn-sm"
              disabled={disabled}
              onClick={() => void onExampleClick(example)}
            >
              {example.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="form-control w-full">
          <span className="label-text">Name</span>
          <input
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            disabled={disabled}
          />
        </label>
        <label className="form-control w-full">
          <span className="label-text">Why</span>
          <input
            className="input input-bordered w-full"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            required
            maxLength={200}
            disabled={disabled}
          />
        </label>
        <p className="text-xs opacity-60">
          Paused focuses still count toward your limit.
        </p>
        {error ? (
          <p className="text-error text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={disabled}>
          {pending ? "Creating…" : "Create focus"}
        </button>
      </form>
    </div>
  );
}
