// Pure date formatter for MarkStudio templates (M5.1, ADR-0025).
//
// Supports ONLY the tokens `YYYY`, `MM`, `DD`, `HH`, `mm`. Any other character
// in the pattern passes through verbatim, so `YYYY-MM-DD` and
// `YYYY/MM/DD HH:mm` both work. Built on `Intl.DateTimeFormat` *parts* (never
// hand-rolled timezone math) so DST and multi-timezone machines stay correct.
// Imports nothing from `vscode` or the DOM.

// Tokens are matched longest-first so `MM`/`mm` never partially consume into a
// neighbouring literal. The matcher is anchored on the four supported widths.
const TOKEN = /YYYY|MM|DD|HH|mm/g;

// Format `date` with `pattern`, optionally in IANA timezone `tz` (defaults to
// the runtime's effective timezone). Unsupported characters in the pattern are
// emitted verbatim.
export function format(date: Date, pattern: string, tz?: string): string {
  const parts = extractParts(date, tz);
  return pattern.replace(TOKEN, (token) => {
    switch (token) {
      case "YYYY":
        return parts.year;
      case "MM":
        return parts.month;
      case "DD":
        return parts.day;
      case "HH":
        return parts.hour;
      case "mm":
        return parts.minute;
      default:
        return token;
    }
  });
}

interface DateParts {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly hour: string;
  readonly minute: string;
}

// Pull zero-padded year/month/day/hour/minute out of `Intl.DateTimeFormat`.
// `hourCycle: "h23"` gives 00–23 so `HH` is unambiguous; 2-digit widths give
// the zero padding the tokens expect.
function extractParts(date: Date, tz?: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    ...(tz ? { timeZone: tz } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });

  const lookup: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  return {
    // `year: "numeric"` is not padded by Intl; pad to four digits for `YYYY`.
    year: (lookup.year ?? "").padStart(4, "0"),
    month: lookup.month ?? "",
    day: lookup.day ?? "",
    // `h23` can render hour 24 as "24"; normalise to "00".
    hour: lookup.hour === "24" ? "00" : (lookup.hour ?? ""),
    minute: lookup.minute ?? ""
  };
}
