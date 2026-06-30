// Pure excerpt extraction for the link hover preview (T-4.2, M4.2).
//
// Given a note's full text and an optional `#heading`, return the slice of
// Markdown the hover card should preview. With no heading we take the top of
// the note; with a heading we slice that heading's section (from its line up to
// the next same-or-higher heading), falling back to the top of the note when
// the heading is not found. The result is capped to keep the preview message
// small (see the cap constants below).
//
// This module imports nothing from `vscode`, the file system, or the DOM — it
// only reuses the pure heading scanner (`parseHeadings` / `findHeadingLine`) —
// so it is unit-testable directly and runs on either side of the bus.

import { parseHeadings, findHeadingLine } from "../outline/headings";

// Excerpt cap: at most this many lines OR this many characters, whichever comes
// first (plan §4). Keeps the `linkPreviewContent` message small and the card a
// preview rather than a full transclusion (that is M4.3).
export const MAX_EXCERPT_LINES = 60;
export const MAX_EXCERPT_CHARS = 2000;

// Extract a capped Markdown excerpt from `text`. When `heading` is non-empty,
// slice that heading's section; otherwise take the top of the note. Falls back
// to the top of the note when the heading is not found.
export function extractExcerpt(text: string, heading: string | null): string {
  const lines = text.split(/\r\n|\r|\n/);

  let startLine = 0;
  let endLine = lines.length;

  if (heading !== null && heading.trim().length > 0) {
    const headingLine = findHeadingLine(text, heading);
    if (headingLine >= 0) {
      startLine = headingLine;
      endLine = sectionEndLine(text, headingLine);
    }
    // Heading not found → leave the top-of-note window.
  }

  return cap(lines.slice(startLine, endLine));
}

// The exclusive end line of the section that opens at `headingLine`: the line
// of the next heading at the same or a higher (shallower) level, or the end of
// the document when there is none.
function sectionEndLine(text: string, headingLine: number): number {
  const headings = parseHeadings(text);
  const current = headings.find((heading) => heading.line === headingLine);
  if (current === undefined) {
    return text.split(/\r\n|\r|\n/).length;
  }
  for (const heading of headings) {
    if (heading.line > headingLine && heading.level <= current.level) {
      return heading.line;
    }
  }
  return text.split(/\r\n|\r|\n/).length;
}

// Apply the line cap then the character cap (whichever bites first), trimming
// trailing blank lines so the card has no empty tail.
function cap(lines: ReadonlyArray<string>): string {
  const limited = lines.slice(0, MAX_EXCERPT_LINES).join("\n");
  const capped =
    limited.length > MAX_EXCERPT_CHARS
      ? limited.slice(0, MAX_EXCERPT_CHARS)
      : limited;
  return capped.replace(/\s+$/, "");
}
