// Pure Markdown heading extraction for the document outline (T-2.2, M2.2).
//
// This module imports nothing from `vscode` or the DOM so it can be unit-tested
// directly and reused on either side of the bus. `parseHeadings` scans the
// document text for ATX (`#`) and setext (`===` / `---` underline) headings,
// skips fenced code blocks and YAML front matter so `#` inside them is not
// mistaken for a heading, and returns a flat, document-ordered list.
// `buildHeadingTree` nests that flat list by heading level for the tree view.

// A single heading occurrence in the document.
export interface Heading {
  // 1–6, matching the number of leading `#`s (or 1/2 for setext `=`/`-`).
  readonly level: number;
  // The heading text with the markers stripped and trimmed. Inline Markdown
  // (e.g. `**bold**`) is left as-is; the outline shows the source text.
  readonly text: string;
  // 0-based line index of the heading in the document. For setext headings
  // this is the text line, not the underline line.
  readonly line: number;
}

// A heading plus the headings nested beneath it (a deeper level that follows
// it before the next same-or-shallower heading).
export interface OutlineNode {
  readonly heading: Heading;
  readonly children: OutlineNode[];
}

// Up to three leading spaces of indentation are allowed before a block marker
// (CommonMark). The patterns below all honour that.
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const SETEXT_UNDERLINE = /^ {0,3}(=+|-+)[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const BLOCKQUOTE = /^ {0,3}>/;
const LIST_ITEM = /^ {0,3}(?:[-*+]|\d{1,9}[.)])[ \t]/;
// A trailing closing sequence of `#`s on an ATX heading must be preceded by
// at least one space; that whole run is decorative and not part of the text.
const ATX_CLOSING = /[ \t]+#+[ \t]*$/;

// Extract every heading from `text`, in document order.
export function parseHeadings(text: string): Heading[] {
  const lines = text.split(/\r\n|\r|\n/);
  const headings: Heading[] = [];

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

    const atx = ATX.exec(line);
    if (atx) {
      headings.push({
        level: atx[1].length,
        text: (atx[2] ?? "").replace(ATX_CLOSING, "").trim(),
        line: index
      });
      continue;
    }

    const setext = SETEXT_UNDERLINE.exec(line);
    if (setext && index > 0 && isParagraphLine(lines[index - 1])) {
      headings.push({
        level: setext[1][0] === "=" ? 1 : 2,
        text: lines[index - 1].trim(),
        line: index - 1
      });
    }
  }

  return headings;
}

// Nest a flat, document-ordered heading list by level. A heading becomes a
// child of the nearest preceding heading with a strictly smaller level; a
// heading with no shallower ancestor is a root. Levels need not be contiguous
// (an `h1` followed by an `h3` still nests the `h3` under the `h1`).
export function buildHeadingTree(
  headings: ReadonlyArray<Heading>
): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: OutlineNode[] = [];

  for (const heading of headings) {
    const node: OutlineNode = { heading, children: [] };
    while (
      stack.length > 0 &&
      stack[stack.length - 1].heading.level >= heading.level
    ) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

// A leading YAML front-matter block (`---` on the very first line, closed by a
// later `---`) is metadata, not content. Return the index of the first line
// after it, or 0 when there is no front matter.
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
  // than guessing; there are no headings to surface in that degenerate case.
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

// Whether `line` can serve as the text of a setext heading: a non-blank line
// that is not itself another block structure. This keeps a `---` that follows
// a list item, blockquote, fence, or another underline from being read as a
// setext heading.
function isParagraphLine(line: string): boolean {
  if (line.trim() === "") {
    return false;
  }
  return !(
    ATX.test(line) ||
    FENCE.test(line) ||
    SETEXT_UNDERLINE.test(line) ||
    BLOCKQUOTE.test(line) ||
    LIST_ITEM.test(line)
  );
}
