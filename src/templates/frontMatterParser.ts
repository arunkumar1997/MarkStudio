// Pure YAML front-matter parser for MarkStudio templates (M5.1, ADR-0025).
//
// This module imports nothing from `vscode` or the DOM so it can be unit-tested
// directly. It is deliberately NOT a general YAML parser — it recognises only
// the fixed template schema (`kind`, `description`, `output`, `cursor`) as a
// flat `key: value` block. No nesting, no flow style (`{a: 1}`), no block
// scalars (`|`, `>`), no anchors. Anything richer than the fixed schema is out
// of scope; a ~30-line line-by-line reader is enough (ADR-0025 §1, §3).

// The "kind" of a template. `"file"` produces a new note; `"snippet"` is
// recognised so Sprint 8 can hand it the CodeMirror tab-stop path, but is not
// expanded this sprint.
export type TemplateKind = "file" | "snippet";

// The parsed, fixed-schema front-matter of a template. Every field is optional
// at the parser level; the command layer applies the documented defaults
// (no front-matter → `kind: file`, `output: "{{filename}}.md"`).
export interface TemplateMeta {
  readonly kind: TemplateKind;
  readonly description?: string;
  readonly output?: string;
  // 0-based line where the cursor should land after the note opens. Absent
  // when not specified or not a valid integer.
  readonly cursor?: number;
  // Unknown keys are kept verbatim for forward-compatibility (ADR-0025 §3) but
  // are read by nothing this sprint.
  readonly extras: Readonly<Record<string, string>>;
}

// The result of parsing a template file: the fixed-schema `meta` (or `null`
// when there is no front-matter block, or the block is malformed) and the
// `body` (the file with the front-matter block removed; the whole file when
// `meta` is `null`).
export interface ParsedTemplate {
  readonly meta: TemplateMeta | null;
  readonly body: string;
}

const FENCE = "---";

// Parse a template file's optional leading YAML front-matter block.
//
// A front-matter block must start with `---` on the very first line and end
// with a `---` line. The lines between are read as flat `key: value` pairs.
// When the file does not open with a fence, or the closing fence is missing,
// `meta` is `null` and `body` is the original text.
export function parseFrontMatter(text: string): ParsedTemplate {
  const lines = text.split(/\r\n|\r|\n/);
  if (lines.length === 0 || lines[0].trim() !== FENCE) {
    return { meta: null, body: text };
  }

  // Find the closing fence.
  let closing = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === FENCE) {
      closing = i;
      break;
    }
  }
  if (closing === -1) {
    // No closing fence — treat the whole file as body (malformed → meta null).
    return { meta: null, body: text };
  }

  let kind: TemplateKind = "file";
  let description: string | undefined;
  let output: string | undefined;
  let cursor: number | undefined;
  const extras: Record<string, string> = {};

  for (let i = 1; i < closing; i++) {
    const pair = parseLine(lines[i]);
    if (pair === null) {
      continue;
    }
    const { key, value } = pair;
    switch (key) {
      case "kind":
        kind = value === "snippet" ? "snippet" : "file";
        break;
      case "description":
        description = value;
        break;
      case "output":
        output = value;
        break;
      case "cursor": {
        const n = parseCursor(value);
        if (n !== null) {
          cursor = n;
        }
        break;
      }
      default:
        extras[key] = value;
        break;
    }
  }

  const meta: TemplateMeta = { kind, extras };
  const withOptionals: TemplateMeta = {
    ...meta,
    ...(description !== undefined ? { description } : {}),
    ...(output !== undefined ? { output } : {}),
    ...(cursor !== undefined ? { cursor } : {})
  };

  // The body is everything after the closing fence, with one leading blank
  // line removed (the conventional gap after the front-matter block).
  const bodyLines = lines.slice(closing + 1);
  if (bodyLines.length > 0 && bodyLines[0].trim() === "") {
    bodyLines.shift();
  }
  return { meta: withOptionals, body: bodyLines.join("\n") };
}

// Split a single front-matter line into `{ key, value }`, or `null` when the
// line is blank, a comment, or has no `key:` shape. The value is trimmed,
// unwrapped from a single pair of surrounding quotes, and has an unquoted
// trailing ` # comment` removed.
function parseLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return null;
  }
  const colon = line.indexOf(":");
  if (colon === -1) {
    return null;
  }
  const key = line.slice(0, colon).trim();
  if (key === "") {
    return null;
  }
  let value = line.slice(colon + 1).trim();
  value = unwrapQuotes(value);
  return { key, value };
}

// Strip one matching pair of surrounding quotes, or a trailing unquoted
// `# comment` from an unquoted value.
function unwrapQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' || first === "'") && last === first) {
      return value.slice(1, -1);
    }
  }
  // Unquoted: a `#` preceded by whitespace begins a trailing comment.
  const comment = value.search(/\s#/);
  if (comment !== -1) {
    return value.slice(0, comment).trimEnd();
  }
  return value;
}

// Parse a `cursor:` value as a non-negative integer; `null` for anything else.
function parseCursor(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  return Number.parseInt(value, 10);
}
