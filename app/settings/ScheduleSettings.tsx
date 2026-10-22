"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAY_LABELS } from "@/lib/domain/onboarding";
import { getWeekRange } from "@/lib/domain/week";

type Props = {
  reviewWeekday: number;
  timezone: string;
};

function formatWeekRangeLabel(
  start: Date,
  end: Date,
  timeZone: string,
): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endDisplay = new Date(end.getTime() - 1);
  return `${fmt.format(start)} – ${fmt.format(endDisplay)}`;
}

function listTimezones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "UTC",
      "America/New_York",
      "America/Los_Angeles",
      "Europe/London",
      "Asia/Shanghai",
      "Asia/Tokyo",
    ];
  }
}

export function ScheduleSettings({ reviewWeekday, timezone }: Props) {
  const router = useRouter();
  const [weekday, setWeekday] = useState(reviewWeekday);
  const [tz, setTz] = useState(timezone);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const timezones = useMemo(() => {
    const all = listTimezones();
    if (tz && !all.includes(tz)) {
      return [tz, ...all];
    }
    return all;
  }, [tz]);

  const weekPreview = useMemo(() => {
    try {
      const { start, end } = getWeekRange(new Date(), weekday, tz);
      return formatWeekRangeLabel(start, end, tz);
    } catch {
      return null;
    }
  }, [weekday, tz]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/settings/schedule", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewWeekday: weekday, timezone: tz }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not update schedule");
        return;
      }
      setMessage("Schedule saved");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update schedule",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="w-full max-w-md space-y-3 border border-base-300 rounded-lg p-4">
      <h2 className="text-lg font-semibold text-center">
        Weekly review day & timezone
      </h2>
      <p className="text-xs opacity-60 text-center">
        Changing timezone recalculates this week&apos;s range immediately.
      </p>

      <form onSubmit={(e) => void save(e)} className="space-y-3">
        <label className="form-control w-full">
          <span className="label-text mb-1">Review day</span>
          <select
            className="select select-bordered w-full"
            value={weekday}
            onChange={(e) => setWeekday(Number(e.target.value))}
            disabled={pending}
          >
            {WEEKDAY_LABELS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-control w-full">
          <span className="label-text mb-1">Timezone</span>
          <select
            className="select select-bordered w-full"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            disabled={pending}
          >
            {timezones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>

        {weekPreview ? (
          <p className="text-sm text-center opacity-70" data-testid="week-preview">
            This week: {weekPreview}
          </p>
        ) : null}

        {error ? (
          <p className="text-error text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-success text-sm" role="status">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary w-full"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save schedule"}
        </button>
      </form>
    </section>
  );
}
