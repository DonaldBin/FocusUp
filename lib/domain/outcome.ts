/**
 * Outcome field rules (PRD §4.4 / Task 6.1).
 * Text, number, and URL are all optional — but at least one must be present.
 * Time-only logging needs no Outcome row.
 */

export type OutcomeFields = {
  bodyText: string | null;
  numberValue: number | null;
  url: string | null;
};

export function normalizeOutcomeText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeOutcomeNumber(
  value: number | string | null | undefined,
): number | null | { error: string } {
  if (value == null || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return { error: "Number must be a finite value" };
  }
  return n;
}

export function normalizeOutcomeUrl(
  value: string | null | undefined,
): string | null | { error: string } {
  const text = normalizeOutcomeText(value);
  if (text == null) {
    return null;
  }
  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { error: "URL must start with http:// or https://" };
    }
    return parsed.toString();
  } catch {
    return { error: "Invalid URL" };
  }
}

export function normalizeOutcomeFields(input: {
  bodyText?: string | null;
  numberValue?: number | string | null;
  url?: string | null;
}): OutcomeFields | { error: string } {
  const bodyText = normalizeOutcomeText(input.bodyText);
  const numberValue = normalizeOutcomeNumber(input.numberValue);
  if (numberValue && typeof numberValue === "object" && "error" in numberValue) {
    return numberValue;
  }
  const url = normalizeOutcomeUrl(input.url);
  if (url && typeof url === "object" && "error" in url) {
    return url;
  }

  const fields: OutcomeFields = {
    bodyText,
    numberValue: numberValue as number | null,
    url: url as string | null,
  };

  if (
    fields.bodyText == null &&
    fields.numberValue == null &&
    fields.url == null
  ) {
    return {
      error: "Add a process & result summary — or skip outcome and keep time only",
    };
  }

  return fields;
}
