// Pure wiki-link target extraction for the backlinks index (T-4.1, M4.1).
//
// This module imports nothing from `vscode`, the DOM, or markdown-it, so it can
// be unit-tested directly and reused on the host side. `parseWikiTargets` scans
// note text for wiki-style links — `[[target]]`, `[[target|alias]]`,
// `[[target#heading]]`, `[[target#heading|alias]]` — and returns each link's
// resolved target, optional heading anchor, and 0-based source line.
//
// It mirrors the preview's inline rule (T-3.4 / ADR-0018): a link must close on
// the same line and may not contain a nested `[`/`]`, so ordinary
// `[link](url)` / `[ref][id]` syntax is never mistaken for a wiki-link. Links
// inside fenced code blocks, leading YAML front matter, and inline code spans
// are skipped so documentation *of* the syntax does not pollute the index.

// A single wiki-link occurrence pointing at another note.
export interface WikiTarget {
  // The note target (the part before `#` and `|`), trimmed. Never empty — a
  // same-document heading link (`[[#heading]]`) does not point at another note
  // and so is not returned.
  readonly target: string;
  // The heading anchor after `#`, trimmed, or `null` when absent. Captured for
  // a future heading-level backlink; resolution is to the file this sprint.
  readonly heading: string | null;
  // 0-based line index of the source line that contains the link.
  readonly line: number;
}

// Up to three leading spaces of indentation are allowed before a fence marker
// (CommonMark); the pattern honours that. Mirrors `src/outline/headings.ts`.
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

const OPEN_BRACKET = 0x5b; // "["
const BACKTICK = 0x60; // "`"

// Extract every wiki-link target from `text`, in document order.
export function parseWikiTargets(text: string): WikiTarget[] {
  const lines = text.split(/\r\n|\r|\n/);
  const targets: WikiTarget[] = [];

  let index = skipFrontMatter(lines);
  // The opening fence marker run while inside a fenced code block; `null` when
  // outside one.
  let openFence: string | null = null;

  for (; index < lines.length; index++) {
    const line = lines[index];

    if (openFence !== null) {
      if (isClosingFence(line, openFence)) {
        openFence = null;
      }
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      openFence = fence[1];
      continue;
    }

    collectWikiLinks(line, index, targets);
  }

  return targets;
}

// Scan a single content line for wiki-links, appending each to `out`. Inline
// code spans are skipped so a `` `[[note]]` `` example is not indexed.
function collectWikiLinks(
  line: string,
  lineIndex: number,
  out: WikiTarget[]
): void {
  let pos = 0;
  while (pos < line.length) {
    const code = line.charCodeAt(pos);

    if (code === BACKTICK) {
      pos = skipInlineCode(line, pos);
      continue;
    }

    if (code === OPEN_BRACKET && line.charCodeAt(pos + 1) === OPEN_BRACKET) {
      const close = line.indexOf("]]", pos + 2);
      if (close !== -1) {
        const inner = line.slice(pos + 2, close);
        // Reject a nested `[`/`]` so ordinary `[...]` link syntax is never
        // swallowed (newlines cannot occur — we scan within one line).
        if (!/[[\]]/.test(inner)) {
          const parsed = parseTarget(inner);
          if (parsed) {
            out.push({ ...parsed, line: lineIndex });
          }
          pos = close + 2;
          continue;
        }
      }
    }

    pos++;
  }
}

// Skip an inline code span starting at `start` (a backtick). A span opened by a
// run of N backticks closes at the next run of exactly N backticks
// (CommonMark). When there is no matching closing run the backticks are literal
// and we resume just after the opening run.
function skipInlineCode(line: string, start: number): number {
  let runEnd = start;
  while (runEnd < line.length && line.charCodeAt(runEnd) === BACKTICK) {
    runEnd++;
  }
  const runLength = runEnd - start;

  let i = runEnd;
  while (i < line.length) {
    if (line.charCodeAt(i) === BACKTICK) {
      let j = i;
      while (j < line.length && line.charCodeAt(j) === BACKTICK) {
        j++;
      }
      if (j - i === runLength) {
        return j;
      }
      i = j;
    } else {
      i++;
    }
  }

  return runEnd;
}

// Parse the inner text of a `[[…]]` into its target and heading. Returns `null`
// for an empty target (e.g. a same-document `[[#heading]]` link), which is not
// a backlink to another note.
function parseTarget(
  inner: string
): { target: string; heading: string | null } | null {
  if (inner.trim().length === 0) {
    return null;
  }

  const pipeIdx = inner.indexOf("|");
  const linkPart = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);

  const hashIdx = linkPart.indexOf("#");
  const target = (
    hashIdx === -1 ? linkPart : linkPart.slice(0, hashIdx)
  ).trim();
  const heading =
    hashIdx === -1 ? null : linkPart.slice(hashIdx + 1).trim() || null;

  if (target.length === 0) {
    return null;
  }

  return { target, heading };
}

// A leading YAML front-matter block (`---` on the very first line, closed by a
// later `---`) is metadata, not content. Return the index of the first line
// after it, or 0 when there is no front matter. Mirrors `headings.ts`.
function skipFrontMatter(lines: ReadonlyArray<string>): number {
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return 0;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return i + 1;
    }
  }
  // Unterminated front matter: treat the whole document as front matter rather
  // than guessing; there are no links to surface in that degenerate case.
  return lines.length;
}

function isClosingFence(line: string, openFence: string): boolean {
  const fence = FENCE.exec(line);
  return (
    fence !== null &&
    fence[1][0] === openFence[0] &&
    fence[1].length >= openFence.length &&
    fence[2].trim() === ""
  );
}
