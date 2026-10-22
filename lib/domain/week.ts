/**
 * Weekly review window helpers (FocusUp PRD §4.5).
 * reviewWeekday uses JS convention: 0 = Sunday … 6 = Saturday.
 * "This week" = [previous review-day 00:00, next review-day 00:00) in `timeZone`.
 */

export type WeekRange = {
  start: Date;
  end: Date;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0–6, Sunday–Saturday
};

const WEEKDAY_TO_JS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const map: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: WEEKDAY_TO_JS[map.weekday] ?? 0,
  };
}

/** UTC instant that is local Y-M-D 00:00:00 in `timeZone`. */
function zonedMidnightUtc(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  let utc = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let i = 0; i < 4; i += 1) {
    const parts = getZonedParts(new Date(utc), timeZone);
    const asIfUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const desired = Date.UTC(year, month - 1, day, 0, 0, 0);
    utc += desired - asIfUtc;
  }
  return new Date(utc);
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  deltaDays: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + deltaDays));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/**
 * Returns the current review week containing `now` for the given review weekday
 * and IANA timezone. Changing `timeZone` recalculates bounds immediately.
 */
export function getWeekRange(
  now: Date,
  reviewWeekday: number,
  timeZone: string,
): WeekRange {
  if (!Number.isInteger(reviewWeekday) || reviewWeekday < 0 || reviewWeekday > 6) {
    throw new RangeError("reviewWeekday must be an integer 0–6 (Sun–Sat)");
  }

  const parts = getZonedParts(now, timeZone);
  const daysSinceReview = (parts.weekday - reviewWeekday + 7) % 7;
  const startYmd = addCalendarDays(
    parts.year,
    parts.month,
    parts.day,
    -daysSinceReview,
  );
  const endYmd = addCalendarDays(startYmd.year, startYmd.month, startYmd.day, 7);

  const start = zonedMidnightUtc(
    startYmd.year,
    startYmd.month,
    startYmd.day,
    timeZone,
  );
  const end = zonedMidnightUtc(endYmd.year, endYmd.month, endYmd.day, timeZone);

  return { start, end };
}
