// Pure standard-Markdown-link target extraction for the backlinks index
// (T-4.1a, Sprint 6 — ADR-0024).
//
// This module is the Markdown counterpart of `parseWikiTargets.ts`: it walks
// note text and emits one entry per inline Markdown link `[text](destination)`
// whose destination resolves to another `.md`/`.markdown` note. Reference-style
// links (`[text][id]` + `[id]: …`) and bare same-document anchors
// (`[text](#section)`) are skipped in v1 (ADR-0024 §"Decision" / §"Follow-Ups").
//
// Imports nothing from `vscode`, the DOM, or markdown-it so it runs in the pure
// unit-test layer and can be reused on the host side. Mirrors `parseWikiTargets`
// in shape (same skipped regions, same return record) so the diff between the
// two parsers reads as one diff against the other (maintainability per plan §3:
// "the diff between the two parsers is visually small").
//
// Resolution rules implemented here (ADR-0024 §"Decision" / plan §4.1):
//   * Strip wrapping `<…>` from the destination (CommonMark angle-bracket form).
//   * Strip an optional `"title"` (or `'title'`, `(title)`) after the destination.
//   * Strip any `?query` and `#anchor` from the destination, capturing the
//     `#anchor` as the heading.
//   * Skip an absolute URL (any `scheme:` prefix or a leading `//`).
//   * Skip an empty destination or a bare-anchor link (`#…` after `<>`/title
//     stripping).
//   * Skip workspace-absolute paths (a destination starting with `/`) — ambiguous
//     in multi-root workspaces, deferred to a future sprint.
//   * Skip destinations whose final segment does not end in `.md` / `.markdown`.
//     Path resolution itself (relative-to-source + existence check) happens in
//     `linkIndex.ts`'s `resolveMarkdownTarget`; this extractor only emits
//     plausibly-note-pointing relative paths.

// A single Markdown-link occurrence pointing at another note. Same shape as
// `WikiTarget` from `parseWikiTargets.ts` so the two extractors can feed one
// merger upstream.
export interface MarkdownTarget {
  // The destination path **as written** in the source (with `?query` /
  // `#anchor` already stripped and `<…>` already unwrapped). Resolution to a
  // workspace path is done in `linkIndex.ts`.
  readonly target: string;
  // The heading anchor after `#`, trimmed, or `null` when absent. Captured for
  // heading-level promotion (T-4.1c).
  readonly heading: string | null;
  // 0-based line index of the source line that contains the link.
  readonly line: number;
}

// Up to three leading spaces of indentation are allowed before a fence marker
// (CommonMark); mirrors `parseWikiTargets.ts` / `src/outline/headings.ts`.
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;

const OPEN_BRACKET = 0x5b; // "["
const CLOSE_BRACKET = 0x5d; // "]"
const OPEN_PAREN = 0x28; // "("
const CLOSE_PAREN = 0x29; // ")"
const OPEN_ANGLE = 0x3c; // "<"
const CLOSE_ANGLE = 0x3e; // ">"
const BACKTICK = 0x60; // "`"
const BACKSLASH = 0x5c; // "\"
const SPACE = 0x20;
const TAB = 0x09;
const QUOTE = 0x22; // '"'
const APOSTROPHE = 0x27; // "'"

const MD_EXTENSION = /\.(md|markdown)$/i;
// Any URL scheme (RFC 3986 reserved start; we only need to detect "scheme:").
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// Extract every inline-Markdown-link target from `text`, in document order.
// Only links whose destination plausibly points at a workspace `.md` note (a
// relative path with a `.md`/`.markdown` extension) are returned.
export function parseMarkdownTargets(text: string): MarkdownTarget[] {
  const lines = text.split(/\r\n|\r|\n/);
  const targets: MarkdownTarget[] = [];

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

    collectMarkdownLinks(line, index, targets);
  }

  return targets;
}

// Scan a single content line for inline Markdown links, appending each to
// `out`. Inline code spans are skipped so a `` `[label](note.md)` `` example is
// not indexed.
function collectMarkdownLinks(
  line: string,
  lineIndex: number,
  out: MarkdownTarget[]
): void {
  let pos = 0;
  while (pos < line.length) {
    const code = line.charCodeAt(pos);

    if (code === BACKTICK) {
      pos = skipInlineCode(line, pos);
      continue;
    }

    if (code === BACKSLASH) {
      // Backslash-escaped `[` is not a link opener.
      pos += 2;
      continue;
    }

    // Reject a wiki-link's `[[…]]` so we never double-index it as a Markdown
    // link; `parseWikiTargets` owns that grammar.
    if (code === OPEN_BRACKET && line.charCodeAt(pos + 1) === OPEN_BRACKET) {
      const close = line.indexOf("]]", pos + 2);
      pos = close === -1 ? pos + 2 : close + 2;
      continue;
    }

    if (code === OPEN_BRACKET) {
      const consumed = tryConsumeLink(line, pos, lineIndex, out);
      if (consumed > pos) {
        pos = consumed;
        continue;
      }
    }

    pos++;
  }
}

// Try to consume a `[text](destination …)` link starting at `start` (which
// points at `[`). Returns the position just after `)` when a link is consumed
// (regardless of whether it was emitted to `out`); returns `start` when the
// position is not a link opener so the outer scanner can advance one character.
function tryConsumeLink(
  line: string,
  start: number,
  lineIndex: number,
  out: MarkdownTarget[]
): number {
  const labelEnd = findLabelEnd(line, start + 1);
  if (labelEnd === -1) {
    return start;
  }
  // Must be immediately followed by `(` for an inline link. Reference-style
  // (`[text][id]`, `[text]:`) is out of scope for v1 (ADR-0024).
  if (line.charCodeAt(labelEnd + 1) !== OPEN_PAREN) {
    return start;
  }

  const destStart = labelEnd + 2;
  const parsed = parseDestinationAndTitle(line, destStart);
  if (parsed === null) {
    return start;
  }

  const { destination, end } = parsed;
  const target = resolveTargetField(destination);
  if (target !== null) {
    out.push({
      target: target.target,
      heading: target.heading,
      line: lineIndex
    });
  }
  return end;
}

// Walk forward from `from` (the char after `[`) to the matching `]`. Brackets
// nest one level (CommonMark allows balanced `[…]` inside a link label); a
// backslash escapes the next character. Returns the index of the matching `]`
// or `-1` when the label is unclosed on this line.
function findLabelEnd(line: string, from: number): number {
  let depth = 1;
  let i = from;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code === BACKSLASH) {
      i += 2;
      continue;
    }
    if (code === BACKTICK) {
      i = skipInlineCode(line, i);
      continue;
    }
    if (code === OPEN_BRACKET) {
      depth++;
    } else if (code === CLOSE_BRACKET) {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
    i++;
  }
  return -1;
}

// Parse a Markdown link's destination + optional title starting at `from`
// (just after the opening `(`). Returns the parsed destination (unwrapped,
// untrimmed of `?query`/`#anchor`) and the index just past the closing `)`,
// or `null` when the destination/title is malformed or unclosed on this line.
function parseDestinationAndTitle(
  line: string,
  from: number
): { destination: string; end: number } | null {
  let i = skipSpaces(line, from);
  if (i >= line.length) {
    return null;
  }

  let destination: string;

  if (line.charCodeAt(i) === OPEN_ANGLE) {
    // Angle-bracket form: `<dest>` — may not contain `<` / `>` / line breaks.
    const close = findAngleClose(line, i + 1);
    if (close === -1) {
      return null;
    }
    destination = line.slice(i + 1, close);
    i = close + 1;
  } else {
    // Plain form: read until the next space, tab, or `(`/`)` that is not part
    // of a balanced parenthesis run inside the destination.
    const end = findPlainDestEnd(line, i);
    if (end === i) {
      return null;
    }
    destination = line.slice(i, end);
    i = end;
  }

  i = skipSpaces(line, i);
  if (i >= line.length) {
    return null;
  }

  const next = line.charCodeAt(i);

  if (next === QUOTE || next === APOSTROPHE || next === OPEN_PAREN) {
    // Optional `"title"` / `'title'` / `(title)` — skipped over, not surfaced.
    const titleEnd = findTitleEnd(line, i);
    if (titleEnd === -1) {
      return null;
    }
    i = skipSpaces(line, titleEnd);
    if (i >= line.length) {
      return null;
    }
  }

  if (line.charCodeAt(i) !== CLOSE_PAREN) {
    return null;
  }
  return { destination, end: i + 1 };
}

// Find the closing `>` for an angle-bracket destination starting at `from`
// (the char after the `<`). `<` / `>` may not appear inside. A backslash
// escapes the next character.
function findAngleClose(line: string, from: number): number {
  let i = from;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code === BACKSLASH) {
      i += 2;
      continue;
    }
    if (code === OPEN_ANGLE) {
      return -1;
    }
    if (code === CLOSE_ANGLE) {
      return i;
    }
    i++;
  }
  return -1;
}

// Find the end of a plain (non-angle-bracket) destination. The destination
// runs from `from` until the first space/tab or a closing `)` not balanced by
// a preceding `(` within the destination itself. CommonMark allows balanced
// parens inside the destination — we honour that so `[t](note(1).md)` parses
// as destination `note(1).md`. Mirrors the markdown-it inline-link rule.
function findPlainDestEnd(line: string, from: number): number {
  let depth = 0;
  let i = from;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code === BACKSLASH) {
      i += 2;
      continue;
    }
    if (code === SPACE || code === TAB) {
      return i;
    }
    if (code === OPEN_PAREN) {
      depth++;
    } else if (code === CLOSE_PAREN) {
      if (depth === 0) {
        return i;
      }
      depth--;
    }
    i++;
  }
  return i;
}

// Find the end of an optional title starting at `from` (a `"`, `'`, or `(`).
// Returns the index just past the closing delimiter, or `-1` when unclosed
// on this line. Titles may not contain line breaks (single-line scan).
function findTitleEnd(line: string, from: number): number {
  const open = line.charCodeAt(from);
  const close = open === OPEN_PAREN ? CLOSE_PAREN : open;
  let i = from + 1;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code === BACKSLASH) {
      i += 2;
      continue;
    }
    if (code === close) {
      return i + 1;
    }
    i++;
  }
  return -1;
}

function skipSpaces(line: string, from: number): number {
  let i = from;
  while (i < line.length) {
    const code = line.charCodeAt(i);
    if (code !== SPACE && code !== TAB) {
      return i;
    }
    i++;
  }
  return i;
}

// Apply the v1 Markdown-link resolution filter to a raw destination string
// (`destination` is already unwrapped of `<…>` but may still carry `?query`
// and `#anchor`). Returns `{ target, heading }` for a relative `.md` /
// `.markdown` destination, or `null` when the link is out of scope (external
// URL, bare anchor, workspace-absolute, non-`.md` file, …).
function resolveTargetField(
  destination: string
): { target: string; heading: string | null } | null {
  if (destination.length === 0) {
    return null;
  }

  // Strip `?query` and capture `#anchor` (anchor wins as the heading).
  let path = destination;
  let heading: string | null = null;

  const hashIdx = path.indexOf("#");
  if (hashIdx !== -1) {
    heading = path.slice(hashIdx + 1).trim() || null;
    path = path.slice(0, hashIdx);
  }
  const queryIdx = path.indexOf("?");
  if (queryIdx !== -1) {
    path = path.slice(0, queryIdx);
  }

  path = path.trim();

  // Empty after stripping = bare anchor like `[text](#section)`. Same-document
  // links are out of scope for cross-note backlinks.
  if (path.length === 0) {
    return null;
  }

  // Absolute URL (any `scheme:` prefix) or protocol-relative (`//host/…`).
  if (SCHEME.test(path) || path.startsWith("//")) {
    return null;
  }

  // Workspace-absolute (`/docs/x.md`) is ambiguous across multi-root workspaces
  // — deferred per ADR-0024.
  if (path.startsWith("/")) {
    return null;
  }

  // Only `.md` / `.markdown` files are notes.
  if (!MD_EXTENSION.test(path)) {
    return null;
  }

  return { target: path, heading };
}

// Skip an inline code span starting at `start` (a backtick). A span opened by
// a run of N backticks closes at the next run of exactly N backticks
// (CommonMark). When there is no matching closing run the backticks are
// literal and we resume just after the opening run. Mirrors
// `parseWikiTargets.ts`.
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

// A leading YAML front-matter block (`---` on the very first line, closed by a
// later `---`) is metadata, not content. Mirrors `parseWikiTargets.ts`.
function skipFrontMatter(lines: ReadonlyArray<string>): number {
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return 0;
  }
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return i + 1;
    }
  }
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
