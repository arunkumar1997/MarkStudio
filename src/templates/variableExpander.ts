// Pure variable expander for MarkStudio templates (M5.1, ADR-0025).
//
// Substitutes a CLOSED allowlist of tokens; anything not on the list — most
// importantly snippet placeholders `${1}` / `${1:default}` / `${0}` — passes
// through verbatim so Sprint 8's CodeMirror tab-stop path can consume them.
// No expression evaluator, no shell-out, no clipboard access (the *service*
// reads `vscode.env.clipboard` and passes it in `ctx.clipboard`). Imports
// nothing from `vscode` or the DOM.

import { format } from "./dateFormatter";

// Everything the expander needs to resolve the allowlist. The service builds
// this from the live VS Code environment; the pure expander never reaches out.
export interface ExpandContext {
  // The moment the command ran. All date/time tokens derive from this single
  // instant so `{{date}}` and `{{time}}` in one template agree.
  readonly now: Date;
  // The format used for `{{date}}` and `$CURRENT_*` (default `YYYY-MM-DD`).
  readonly dateFormat: string;
  // IANA timezone for date formatting; omit for the runtime's effective zone.
  readonly tz?: string;
  // The title the user typed (already defaulted to the template basename when
  // the user submitted empty — never the empty string for a `kind: file`).
  readonly title: string;
  // The resolved output filename with no directory and no extension.
  readonly filename: string;
  // The workspace name (`$WORKSPACE_NAME`); empty string when none.
  readonly workspaceName: string;
  // The system clipboard text (`$CLIPBOARD`); empty string on a failed/empty
  // read (the service swallows the error, ADR-0025 §10).
  readonly clipboard: string;
}

// The curly-brace marker (alternative to a `cursor:` front-matter line) where
// the cursor should land. Recognised by `findCursorMarker`, removed by
// `expand`.
const CURSOR_MARKER = "{{cursor}}";

// Expand every allowlisted token in `template`. Unknown `{{…}}` and `$…`
// tokens, and all `${…}` snippet placeholders, are left intact.
export function expand(template: string, ctx: ExpandContext): string {
  const values = buildValues(ctx);

  // Curly tokens: `{{name}}` where `name` is on the allowlist. The cursor
  // marker collapses to the empty string (its *position* is read separately
  // by `findCursorMarker`).
  let out = template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    if (name === "cursor") {
      return "";
    }
    return name in values ? values[name] : match;
  });

  // Dollar tokens: `$CURRENT_YEAR`, `$TM_FILENAME_BASE`, … Longest names first
  // is guaranteed by anchoring on word boundaries and matching the full run of
  // `[A-Z_]`. A `${…}` snippet placeholder is never matched here (it starts
  // with `${`, not `$LETTER`).
  out = out.replace(/\$([A-Z][A-Z_]*)/g, (match, name: string) => {
    return name in values ? values[name] : match;
  });

  return out;
}

// The 0-based line of the `{{cursor}}` marker in `template`, or `null` when
// absent. Read before `expand` removes the marker so the command layer can
// place the cursor. The first occurrence wins.
export function findCursorMarker(template: string): number | null {
  const index = template.indexOf(CURSOR_MARKER);
  if (index === -1) {
    return null;
  }
  // Count newlines before the marker.
  let line = 0;
  for (let i = 0; i < index; i++) {
    if (template[i] === "\n") {
      line++;
    }
  }
  return line;
}

// `kebab-case` a string deterministically: lowercase, every run of
// non-alphanumeric characters becomes a single `-`, leading/trailing `-`
// trimmed. Exported so the service and tests share one definition.
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Resolve every allowlist token to its substitution string.
function buildValues(ctx: ExpandContext): Record<string, string> {
  const dateStr = format(ctx.now, ctx.dateFormat, ctx.tz);
  const timeStr = format(ctx.now, "HH:mm", ctx.tz);
  const dateTimeStr = format(ctx.now, "YYYY-MM-DD HH:mm", ctx.tz);

  return {
    // MarkStudio-style (curly).
    date: dateStr,
    time: timeStr,
    datetime: dateTimeStr,
    title: ctx.title,
    slug: slugify(ctx.title),
    filename: ctx.filename,

    // VS Code-style (dollar).
    CURRENT_YEAR: format(ctx.now, "YYYY", ctx.tz),
    CURRENT_MONTH: format(ctx.now, "MM", ctx.tz),
    CURRENT_DATE: format(ctx.now, "DD", ctx.tz),
    CURRENT_HOUR: format(ctx.now, "HH", ctx.tz),
    CURRENT_MINUTE: format(ctx.now, "mm", ctx.tz),
    TM_FILENAME: `${ctx.filename}.md`,
    TM_FILENAME_BASE: ctx.filename,
    WORKSPACE_NAME: ctx.workspaceName,
    CLIPBOARD: ctx.clipboard
  };
}
