import Link from "next/link";
import type { HomeReviewPrompt } from "@/lib/db/reviews";

type Props = {
  prompt: HomeReviewPrompt;
};

export function PendingReviewBanner({ prompt }: Props) {
  if (prompt.status === "upcoming") {
    return (
      <div className="w-full border border-base-300 rounded-lg p-3 space-y-2 text-center">
        <p className="text-sm font-medium">Next weekly review</p>
        <p className="text-xs opacity-70">
          {prompt.weekdayLabel} · {prompt.whenLabel}
        </p>
        <p className="text-xs opacity-50">
          Nothing due yet — your first review appears after this date.
        </p>
        <Link href="/review" className="btn btn-outline btn-sm">
          Open review early
        </Link>
      </div>
    );
  }

  const href = `/review?start=${encodeURIComponent(prompt.start.toISOString())}&end=${encodeURIComponent(prompt.end.toISOString())}${prompt.merged ? "&merged=1" : ""}`;

  return (
    <div className="w-full border border-warning/40 bg-warning/10 rounded-lg p-3 space-y-2 text-center">
      <p className="text-sm font-medium">Weekly review due</p>
      <p className="text-xs opacity-70">{prompt.label}</p>
      <Link href={href} className="btn btn-warning btn-sm">
        Review now
      </Link>
    </div>
  );
}
