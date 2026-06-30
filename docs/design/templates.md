# Design — Templates Engine + Daily Notes (M5.1 + M5.3, Phase 5)

> Pre-implementation design for the Templates engine — the foundation under all of Phase 5 — Authoring Workflows — and its first consumer, Daily Notes. Status: **implemented (Sprint 7)**. The durable decision is recorded as [ADR-0025](../DECISIONS.md#adr-0025-templates-engine-in-tree-front-matter--variable-expansion-native-quickpick-zero-new-deps). Sprint plan: [sprint-7/plan.md](../sprint-7/plan.md).

## Problem

Phase 5 opens the **Authoring Workflows** layer. The first user need is *starting a note from a reusable template* — a daily journal, a meeting note, a literature note — without retyping the same scaffold and without leaving MarkStudio. The engine must:

* Read templates from two roots (per-workspace + per-user) with a clear precedence.
* Expand a **closed, predictable** set of variables (date, title, slug, …) so a template author knows exactly what will be substituted.
* Create the new note at a template-defined path and **open it in MarkStudio**, never the built-in text editor.
* **Never** overwrite an existing file.
* Stay native: a VS Code QuickPick + InputBox, no custom webview chrome.

**Daily Notes** is the proof that the engine generalises: "open today's note" is *just* the engine resolving a configured template, expanding `{{date}}`, and creating-or-opening the target. Zero special-case logic.

VS Code has no built-in "new note from template" surface, and a custom-editor file-creation flow has the same PR #4 hazard the graph view hit (ADR-0023): a naïve `showTextDocument` would open the new note in the **built-in** text editor, not MarkStudio. So file creation must route through `vscode.openWith` → `markstudio.editor`.

## Options considered

1. **In-tree pure engine + a vscode-aware service + native QuickPick** — pure modules (parser, expander, formatter, resolver) mirroring `src/links/`'s pure/service split, one `TemplateService` owning the watchers + async scan, and a thin command layer driving a native QuickPick / InputBox. **Chosen.**
2. **A templating library** (Handlebars / Mustache) + a YAML library (`gray-matter`) + a date library (`dayjs` / `date-fns`) — rejected: violates ADR-0005 (zero new runtime dependencies). The variable set is a *closed allowlist* of ~16 tokens and the date format is a 5-token subset; both are a few dozen lines in-tree.
3. **A template gallery / preview webview** — rejected at brainstorm: violates "no fake chrome / less UI is better." Users author templates as plain `.md` files; the picker is a native QuickPick.
4. **Auto-bootstrap `.markstudio/templates/` on activation** — rejected at brainstorm: an empty folder is a teaching opportunity, not a bug. The opt-in `MarkStudio: Create Example Template` is the on-ramp.

**Chosen: option 1**, mirroring `LinkIndexService` (ADR-0020). See [ADR-0025](../DECISIONS.md#adr-0025-templates-engine-in-tree-front-matter--variable-expansion-native-quickpick-zero-new-deps) for the full rationale.

## Architecture

```
                          src/templates/  (host-side only — no webview, no protocol change)

  ┌─ pure ─────────────────────────────────────────────────────────────┐
  │  frontMatterParser.ts   parseFrontMatter(text) → { meta, body }      │
  │  variableExpander.ts    expand(template, ctx)  → string              │
  │  dateFormatter.ts       format(date, pattern, tz?) → string          │
  │  templateResolver.ts    resolve(ws[], user[])  → ResolvedTemplate[]  │
  └─────────────────────────────────────────────────────────────────────┘
                          ▲                        ▲
                          │ (pure calls)           │
  ┌─ vscode-aware ────────┴────────────────────────┴──────────────────────┐
  │  TemplateService.ts                                                     │
  │   • 2× FileSystemWatcher (ws .markstudio/templates, user globalStorage) │
  │   • async scan (NOT awaited at activation), debounced 250 ms rebuild    │
  │   • onDidChangeTemplates                                                │
  │   • getTemplates(kind?) / getTemplate(basename)                         │
  │   • createFromTemplate(template, title) / openOrCreateDailyNote()       │
  └────────────────────────────────────────────────────────────────────────┘
                          ▲
                          │
  ┌─ commands ────────────┴───────────────────────────────────────────────┐
  │  registerTemplates.ts                                                   │
  │   • markstudio.templates.create     → QuickPick → InputBox → create     │
  │   • markstudio.templates.openExample → write example (create-if-missing)│
  │   • markstudio.dailyNotes.openToday → resolve "daily" template → create │
  │   all opens route through vscode.openWith → markstudio.editor           │
  └────────────────────────────────────────────────────────────────────────┘
```

The shape deliberately mirrors `LinkIndexService` (ADR-0020): a pure core that imports nothing from `vscode`, a single service owning all the I/O (watchers, scan, debounce), and a thin command layer. No webview change, no message-protocol change, no `esbuild.js` change.

## Front-matter schema (fixed)

A template is a `.md` file with an **optional** YAML front-matter block. Only these keys are consumed:

```yaml
---
kind: file                 # "file" (default) | "snippet" (Sprint 8 — recognised, not yet expanded)
description: A short one-liner   # shown in the QuickPick detail slot
output: daily/{{date}}.md  # required when kind: file — the target path (variables expanded)
cursor: 5                  # optional 0-based line where to leave the cursor after open
---
Body text with {{variables}}…
```

* **A template with no front-matter** is treated as `kind: file`, no `description`, `output: "{{filename}}.md"`.
* **Unknown keys round-trip** into `meta.extras` for forward-compatibility but are not read this sprint.
* **Malformed YAML** → `meta = null`, `body = text` (the whole file is treated as a bodyless template; the command layer falls back to the no-front-matter defaults).

### In-tree YAML parser shape

The parser is a ~30-line line-by-line reader for the fixed `key: value` shape only:

* No nesting, no flow style (`{a: 1}`), no multi-line / block scalars (`|`, `>`), no anchors.
* The block is the leading `---` … `---` fence (the file must start with `---` on line 0).
* Values are trimmed; surrounding single or double quotes are stripped; `#` starts a trailing comment **only** when preceded by whitespace.
* `cursor` is parsed as an integer; a non-numeric value is dropped (treated as absent).

Anything richer (a real YAML document) is out of scope; the parser supports exactly the subset the schema needs.

## Variable allowlist v1 (closed)

Only these tokens are substituted. **Anything else passes through verbatim — no error, no warning.** This matters because snippet placeholders must survive Sprint 7 untouched so Sprint 8 can hand them to CodeMirror.

### MarkStudio-style (curly)

| Token | Expands to |
| ----- | ---------- |
| `{{date}}` | today, formatted with `markstudio.dailyNotes.dateFormat` (default `YYYY-MM-DD`) |
| `{{time}}` | now, `HH:mm` |
| `{{datetime}}` | `YYYY-MM-DD HH:mm` |
| `{{title}}` | the title the user typed (or the template basename if empty) |
| `{{slug}}` | `kebab-case({{title}})` — lowercase, non-alphanumeric → `-`, runs collapsed, trimmed |
| `{{filename}}` | the resolved output filename (no directory, no extension) |
| `{{cursor}}` | removed from the body; its line becomes the cursor target (alternative to `cursor:` front-matter) |

### VS Code-style (dollar)

`$CURRENT_YEAR`, `$CURRENT_MONTH`, `$CURRENT_DATE`, `$CURRENT_HOUR`, `$CURRENT_MINUTE`, `$TM_FILENAME`, `$TM_FILENAME_BASE`, `$WORKSPACE_NAME`, `$CLIPBOARD`.

`$CLIPBOARD` reads the system clipboard asynchronously at command time (the **service** calls `vscode.env.clipboard.readText()` and passes the value into `ctx.clipboard`; the pure expander never touches the clipboard). A failed or empty read substitutes the empty string and continues silently — no dialog.

### Snippet placeholders (recognised, left intact)

`${1}`, `${1:default}`, `${0}` are recognised by the parser but **passed through verbatim** in Sprint 7. They belong to Sprint 8's CodeMirror tab-stop path. In a `kind: file` template they land in the file as literal text (F5-verified; revisit in Sprint 8 if it surprises users).

## Date formatter (in-tree)

`format(date, pattern, tz?)` supports **only** `YYYY`, `MM`, `DD`, `HH`, `mm`. Any other character in the pattern passes through verbatim (so `YYYY-MM-DD` and `YYYY/MM/DD HH:mm` both work). It is built on `Intl.DateTimeFormat` *parts* (year / month / day / hour / minute) concatenated by token — never hand-rolled TZ math — so DST and multi-TZ machines stay correct. It defaults to the runtime's effective timezone; tests pass a fixed `Date` so they are TZ-agnostic.

## Two-root precedence

Templates are merged from two roots, **workspace wins** by basename (case-insensitive, the same identity convention the link index uses for notes):

| Root | Default location | Scope |
| ---- | ---------------- | ----- |
| Workspace | `<workspaceFolder>/.markstudio/templates/**/*.md` | `markstudio.templates.workspaceFolder` (`resource`) |
| User | `<globalStorageUri>/templates/**/*.md` | `markstudio.templates.userFolder` (`application`, `""` → resolved default) |

* **Multi-root workspaces:** workspace lookup walks `vscode.workspace.workspaceFolders` in order; the **first** folder with a matching `.markstudio/templates/<basename>.md` wins (first-root-wins, not active-root-wins — simpler to reason about; active-root-wins is a deferred refinement).
* **User templates** fill in any basename not present in any workspace folder.
* The QuickPick `detail` slot surfaces the source root so a collision is visible to the user.

## Data flow — `templates.create`

```
markstudio.templates.create
  │
  ▼
TemplateService.getTemplates("file")  ──▶ ResolvedTemplate[]  (empty → hint item)
  │
  ▼
QuickPick (flat; Codicon + label + description + detail)  ──▶ chosen template
  │
  ▼
InputBox (title; empty → template basename)  ──▶ title
  │
  ▼
TemplateService.createFromTemplate(template, title)
  │   parseFrontMatter → expand(output, ctx) → resolve target Uri
  │   target exists?  ── yes ──▶ status "Template target exists — opening." ─┐
  │                   └─ no ──▶ expand(body, ctx) → fs.writeFile           │
  ▼                                                                         ▼
vscode.openWith(targetUri, "markstudio.editor")  ◀───────────────────────────┘
  │
  ▼
reveal cursor at `cursor:` line (if set)
```

## Conflict policy (no overwrite, ever)

When a template's `output:` expands to a path that **already exists**, the engine does **not** overwrite. It opens the existing file and surfaces a status-bar info message `Template target exists — opening.` This is the same create-if-missing / open-if-exists rule Daily Notes uses, applied across the board. `openExample` follows it too: if `daily.md` already exists it just opens the existing one.

## Empty-state UX

When both roots resolve to zero templates, the QuickPick shows a single **non-selectable** hint item:

> `No templates found. Create one in .markstudio/templates/ or run "MarkStudio: Create Example Template".`

Selecting it does nothing (it is a hint). The picker never silently dismisses.

## Daily Notes (M5.3) — engine consumer, zero special logic

`markstudio.dailyNotes.openToday`:

1. Resolve the template named in `markstudio.dailyNotes.template` (default `"daily"`).
2. Set `{{title}}` to `format(today, markstudio.dailyNotes.dateFormat)` so the title and filename match by default.
3. Expand the template's `output:` (or, absent a `daily` template, fall back to `<dailyNotes.folder>/<formatted-date>.md`).
4. Create-if-missing / open-if-exists, opening in MarkStudio.

No InputBox — daily notes is one-key. No template picker — everything is preconfigured. A user who wants to override picks `daily` via `markstudio.templates.create`.

## Settings (5)

| Setting | Default | Scope | Purpose |
| ------- | ------- | ----- | ------- |
| `markstudio.templates.workspaceFolder` | `.markstudio/templates` | `resource` | Per-workspace template root |
| `markstudio.templates.userFolder` | `""` (→ `<globalStorageUri>/templates`) | `application` | Per-machine template root |
| `markstudio.dailyNotes.template` | `daily` | `resource` | Template basename for "today's note" |
| `markstudio.dailyNotes.folder` | `daily` | `resource` | Fallback folder when no `daily` template exists |
| `markstudio.dailyNotes.dateFormat` | `YYYY-MM-DD` | `resource` | Format for `{{date}}` and the daily-note filename |

## Performance

The initial scan is `O(template files)` — typically < 100 for any realistic vault — runs **asynchronously and is not awaited** at activation, so the feature adds no measurable startup cost. Watcher-driven rebuilds are debounced 250 ms (the same window the link index uses) and front-matter parsing is trivial, so a rebuild is < 50 ms wall-clock even for 100 templates.

## Examples

### A daily-note template (`.markstudio/templates/daily.md`)

```markdown
---
kind: file
description: Daily journal entry
output: daily/{{date}}.md
cursor: 6
---
# {{date}}

## Tasks

## Notes
{{cursor}}
```

### A meeting-note template (`.markstudio/templates/meeting.md`)

```markdown
---
kind: file
description: Meeting notes
output: meetings/{{slug}}.md
---
# {{title}}

**Date:** {{datetime}}
**Attendees:**

## Agenda

## Actions
```

## Deferred follow-ups

* **M5.2 Snippets** (Sprint 8) — cursor-insert with CodeMirror tab-stops. The engine already ships `kind: snippet` in the schema and `getTemplates("snippet")`; only the CM6 expansion path is deferred.
* **Full VS Code snippet grammar** — `${1|a,b,c|}` choices, `${1/regex/replace/}` transforms, nested placeholders.
* **Template categories / nested-folder picker** — the QuickPick stays flat in v1.
* **Active-root-wins** multi-root precedence — v1 is first-root-wins.
* **More date tokens** — only `YYYY/MM/DD/HH/mm` in v1; extend the in-tree formatter on a user signal.
* **Per-template keybindings**, **`/template-name` autocompletion**, **usage stats** — all deferred.
* **M5.4 Workspace note features** — deferred until Sprint 7 + 8 adoption data exists.
