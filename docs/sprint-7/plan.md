# Sprint 7 — M5.1 Templates + M5.3 Daily Notes

> Producer: **Remy**. Created 2026-06-30. **First Phase 5 — Authoring Workflows sprint**, kicked off by the brainstorm in [docs/research/phase-5-authoring-brainstorm.md](../research/phase-5-authoring-brainstorm.md) (unanimous 6/6 for Concept A).
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).
> Branch: `feature/sprint-7` off `main` (`397c7df`, post-Sprint-6).

---

## 1. Sprint Goal

Ship the **Templates engine** — the foundation under all of Phase 5 — and prove it end-to-end by lighting up **Daily Notes** as its first consumer.

After this sprint a user can:

* Create a new note from a template via `MarkStudio: New Note from Template` — a native QuickPick of every workspace and user template, then an InputBox for the title, then the new file opens **in MarkStudio**.
* Open today's daily note with one command via `MarkStudio: Open Today's Note` — the engine looks up the configured daily template, expands `{{date}}`, creates the file at the configured folder if missing, opens it if it exists.
* Drop a starter template into the workspace with `MarkStudio: Create Example Template` — the opt-in on-ramp from an empty `.markstudio/templates/` folder.

Sprint 8 will reuse the same engine for **M5.2 Snippets** (cursor-insert with CM6 tab-stops). **M5.4 Workspace features** stays deferred.

## 2. Scope (Producer decisions)

**In scope**

* **Pure host-side engine modules** (`src/templates/`, mirrors `src/links/`'s pure/service split):
  * `frontMatterParser.ts` — single-purpose YAML front-matter parser for the **fixed schema** below (~30 LOC, no `gray-matter` dependency).
  * `variableExpander.ts` — pure string substitution over the **fixed allowlist** below; no expression evaluator, no shell-out.
  * `dateFormatter.ts` — pure formatter for **only** these tokens: `YYYY`, `MM`, `DD`, `HH`, `mm`. Workspace TZ via `Intl.DateTimeFormat` for stability.
  * `templateResolver.ts` — pure two-root merge with **workspace > user** precedence by basename; deterministic ordering.
* **`TemplateService`** (`src/templates/TemplateService.ts`) — the vscode-aware seam:
  * Scans both roots (workspace `.markstudio/templates/**/*.md` + user `<globalStorageUri>/templates/**/*.md`) on activation, asynchronously, **not awaited** (mirrors `LinkIndexService.start()`).
  * `FileSystemWatcher` on both roots, debounced 250 ms (same window the link index uses).
  * Exposes `getTemplates(kind?: "file" | "snippet")` and `getTemplate(basename)` and `onDidChangeTemplates`.
  * **Path identity is the canonical basename** (case-insensitive) — same convention the link index uses for notes.
* **Three commands** contributed in `package.json`:
  * `markstudio.templates.create` — primary entry point.
  * `markstudio.templates.openExample` — opt-in example creator.
  * `markstudio.dailyNotes.openToday` — one-key today's note.
* **Five settings** contributed in `package.json`:
  * `markstudio.templates.workspaceFolder` (default `".markstudio/templates"`, `resource` scope).
  * `markstudio.templates.userFolder` (default `""` → resolved to `<globalStorageUri>/templates`, `application` scope).
  * `markstudio.dailyNotes.template` (default `"daily"`, `resource` scope).
  * `markstudio.dailyNotes.folder` (default `"daily"`, `resource` scope).
  * `markstudio.dailyNotes.dateFormat` (default `"YYYY-MM-DD"`, `resource` scope).
* **Front-matter schema** (YAML, fixed):
  ```yaml
  ---
  kind: file                            # "file" (default) | "snippet" (Sprint 8)
  description: A short one-liner
  output: daily/{{date}}.md             # required when kind: file
  cursor: 5                             # optional 0-based line where to leave the cursor
  ---
  ```
* **Variable allowlist v1** — *only* these are substituted; anything else passes through verbatim:
  * Host MarkStudio-style (curly): `{{date}}`, `{{time}}`, `{{datetime}}`, `{{title}}`, `{{slug}}`, `{{filename}}`, `{{cursor}}`.
  * VS Code-style (dollar): `$CURRENT_YEAR`, `$CURRENT_MONTH`, `$CURRENT_DATE`, `$CURRENT_HOUR`, `$CURRENT_MINUTE`, `$TM_FILENAME`, `$TM_FILENAME_BASE`, `$WORKSPACE_NAME`, `$CLIPBOARD`.
  * Snippet placeholders `${N}`, `${N:default}`, `${0}` are recognised by the parser but **left intact** in Sprint 7 — they belong to Sprint 8's CM6 expansion path. For a `kind: file` template they're treated as literal text (and the dev team should F5-verify that this matches user expectation; revisit in Sprint 8 if it surprises).
* **Empty-state UX** — when both template roots resolve empty, the QuickPick shows a single non-selectable item `No templates found. Create one in .markstudio/templates/ or run "MarkStudio: Create Example Template".` Clicking it does nothing (it's a hint). The picker never silently dismisses.
* **Conflict policy** — when a template's `output:` expands to a path that **already exists**, **do not overwrite**: open the existing file. This matches the daily-notes "create-if-missing, open-if-exists" pattern across the board, surfacing a status-bar info message `Template target exists — opening.`
* **Multi-root precedence** — workspace template lookup walks workspace folders in `vscode.workspace.workspaceFolders` order; the first matching `.markstudio/templates/<basename>.md` wins. User templates fill in any basename not present in any workspace folder.
* **Opens in MarkStudio.** New files open through `vscode.commands.executeCommand("vscode.openWith", uri, "markstudio.editor")` so the created note lands in MarkStudio, **never** the built-in text editor. This is the lesson from ADR-0021 / PR #4 applied to a new code path.
* **Pipeline gate:** lint clean, both typechecks clean, build clean, all three test layers green; target ~25–35 new unit + ~5–8 integration + ~2–3 exthost.

**Out of scope (explicit follow-ups)**

* **M5.2 Snippets** — Sprint 8. The engine ships in Sprint 7 ready for snippets (`kind: snippet` is already in the front-matter shape; `templateResolver.getTemplates("snippet")` works), but no cursor-insert path, no webview message, no CM6 helper.
* **Full VS Code snippet grammar** — `${1|a,b,c|}` choices, `${1/regex/replace/}` transforms, nested placeholders `${1:${VAR}}`. Defer; v1 grammar is the deliberate subset above.
* **Template categories / nested-folder picker** — keep the QuickPick flat in v1; the brainstorm flagged this as a defer.
* **A template editor / preview pane / gallery webview** — explicitly rejected at brainstorm (violates "no fake chrome"). Users edit templates as plain `.md` files.
* **Auto-create the templates folder** — explicitly rejected at brainstorm. Empty state is a teaching opportunity; `openExample` is the opt-in.
* **M5.4 Workspace note features** — deferred until Sprint 7 + 8 adoption data exists.
* **Custom date format library** (`dayjs`, `date-fns`) — rejected. In-tree formatter supports `YYYY`, `MM`, `DD`, `HH`, `mm` only. If a user signal asks for more, extend the in-tree formatter.
* **Per-template keybindings** (e.g. `Ctrl+K T 1`). Defer.
* **Markdown-aware autocompletion** (e.g. `/template-name` triggers a snippet). That's a Sprint 8+ idea; not in scope.
* **Tracking-per-template usage stats**. Not in scope.

## 3. Architecture

Touches one new module + the existing command/extension wiring + `package.json`. **No webview change, no message protocol change, no `src/links/` change, no `src/graph/` change.** Mirrors the host-side-only shape of M2.2 (Outline) and T-2.4 (Word count).

| File | Responsibility | Must NOT |
|---|---|---|
| `src/templates/frontMatterParser.ts` (new, **pure**) | `parseFrontMatter(text): { meta, body }`. Recognises only the fixed schema (`kind`, `description`, `output`, `cursor`). Unknown keys are kept verbatim in `meta.extras` (forward-compat) but not consumed. Malformed YAML → `meta = null`, body = `text`. | Import `vscode`; do I/O; pull in a YAML library |
| `src/templates/variableExpander.ts` (new, **pure**) | `expand(template, ctx): string`. Pure substitution over the allowlist. Unknown `{{…}}` / `$…` tokens pass through verbatim. Handles `{{slug}}` as `kebab-case({{title}})` deterministically (lowercase, non-alphanumeric → `-`, collapse runs, trim). | Eval; touch the clipboard itself (the **service** fetches `vscode.env.clipboard` and passes it in `ctx.clipboard`) |
| `src/templates/dateFormatter.ts` (new, **pure**) | `format(date, pattern, tz?): string` over `YYYY`/`MM`/`DD`/`HH`/`mm`. Any other character in the pattern passes through verbatim. Defaults to the workspace's effective TZ via `Intl.DateTimeFormat` for stability. | Add a date library |
| `src/templates/templateResolver.ts` (new, **pure**) | `resolve(workspaceTemplates, userTemplates): ResolvedTemplate[]` — merge by basename, workspace wins, stable sort by display name. | Touch the FS |
| `src/templates/TemplateService.ts` (new) | Owns the two `FileSystemWatcher`s, the async scan, the debounced rebuild, the `onDidChangeTemplates` event, and the `vscode.env.clipboard.readText()` shim. Exposes `getTemplates(kind?)`, `getTemplate(basename)`, `createFromTemplate(template, title)`, `openOrCreateDailyNote()`. | Render UI; expose the QuickPick |
| `src/commands/registerTemplates.ts` (new) | Registers the three commands. Owns the QuickPick / InputBox flow. Calls into `TemplateService` for the business logic. Routes file opens through `vscode.openWith` → `markstudio.editor`. | Re-implement engine logic; hardcode strings |
| `src/extension.ts` | Construct `TemplateService` once (singleton, pushed to `context.subscriptions`); pass to `registerTemplates(context, service)`. | Construct two services; start a watcher elsewhere |
| `package.json` | Three new commands, five new settings, three new command-palette entries. **No new view, no new menu, no new keybinding** (keybindings deferred until F5 shows discoverability is a gap). | Contribute a tree view; ship a default keybinding |
| `esbuild.js` | **No change.** | Add a fourth bundle |
| `src/webview/**` | **No change.** | Touch the webview at all in Sprint 7 |
| `docs/DECISIONS.md` | Append **ADR-0025**: Templates engine — front-matter schema, variable allowlist, two-root precedence, no auto-bootstrap, native QuickPick only, zero new dependency. | — |
| `docs/design/templates.md` (new) | Spec doc: front-matter, variables, precedence, conflict policy, examples, deferred follow-ups. | — |

**Reuse, don't duplicate.**

* The watcher / debounced rebuild / async scan pattern is `LinkIndexService` — `TemplateService` follows the same shape (constructor + `start()` + private `scheduleRebuild()` + `onDidChangeTemplates` event).
* The "open in MarkStudio, never `showTextDocument`" rule is ADR-0021 / PR #4 — applied to the new file-creation path with `vscode.commands.executeCommand("vscode.openWith", uri, "markstudio.editor")`.
* The "host bundle config seam" is `ConfigurationService` — Sprint 7's settings flow through it; the values land in `MarkStudioConfig` only if we need them on the webview (we **don't**, so they stay direct `vscode.workspace.getConfiguration("markstudio")` reads in the service).

## 4. Producer decisions (pre-empt scope creep)

1. **Zero new runtime dependencies.** In-tree front-matter parser, in-tree date formatter. `gray-matter`, `dayjs`, `date-fns`, Handlebars, Mustache all rejected at brainstorm.
2. **YAML schema is fixed.** Only `kind`, `description`, `output`, `cursor` are consumed. Unknown keys round-trip into `meta.extras` for forward compatibility, but nothing reads them this sprint. **A template with no front-matter** is treated as `kind: file` with no `description` and `output: "{{filename}}.md"`.
3. **Variable allowlist is closed.** Anything not on the allowlist is passed through verbatim — no error, no warning. This matters because snippet placeholders (`${1}`, `${0}`) must survive Sprint 7 untouched so Sprint 8 can hand them to CM6.
4. **No overwrite, ever.** A template whose `output:` resolves to an existing file → open the existing file, surface `Template target exists — opening.` status-bar message. Same rule for daily notes.
5. **All file creation routes through `vscode.openWith` → `markstudio.editor`.** Never `showTextDocument`. (PR #4 / ADR-0021 lesson.)
6. **Empty templates folder is a teaching opportunity, not a bug.** No auto-bootstrap. Picker shows a hint item. `openExample` is opt-in. (Brainstorm Disagreement 4.)
7. **Title InputBox is always shown for `kind: file`.** Even if the template body doesn't reference `{{title}}`. The user always gets a chance to set the file name component. (`{{title}}` defaults to the chosen template's basename if the user submits empty — never the empty string.)
8. **Daily notes uses the engine.** Zero special logic. `dailyNotes.openToday` resolves the template named in `markstudio.dailyNotes.template` (default `"daily"`), sets `{{title}}` to the formatted date, expands, opens or creates.
9. **Multi-root precedence is first-root-wins, not active-root-wins.** Simpler to reason about; matches `findFiles` default ordering. Active-root-wins is a deferred refinement.
10. **`$CLIPBOARD` reads the system clipboard async at command time.** If the read fails or returns empty, substitute the empty string and continue silently. No error dialog.
11. **No new VS Code Memento usage.** Template selection is one-shot (palette → QuickPick → done); we do not need to remember "your last picked template" in v1.
12. **Workspace settings beat user settings**, per VS Code default `resource` scope. The `application`-scoped `userFolder` setting is the one exception (it's a per-machine convenience).
13. **Performance budget.** Initial scan: O(template files) — typically < 100 for any realistic vault. Watcher rebuild: < 50 ms wall-clock for a vault of 100 templates (no parser is doing real work — front-matter parsing is trivial). The whole feature should add **no measurable startup cost** because the scan is async and not awaited.

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| **A** | **Design + ADR-0025 + `docs/design/templates.md`** (commit before code) | **Remy / Sage** |
| 1 | `frontMatterParser.ts` (pure) + unit tests | **Sage** |
| 2 | `variableExpander.ts` (pure) + unit tests | **Sage** |
| 3 | `dateFormatter.ts` (pure) + unit tests | **Sage** |
| 4 | `templateResolver.ts` (pure) + unit tests | **Sage** |
| 5 | `TemplateService.ts` — watchers, async scan, debounced rebuild, `onDidChangeTemplates`, `getTemplates` / `getTemplate` / `createFromTemplate` / `openOrCreateDailyNote` | **Sage** |
| 6 | `registerTemplates.ts` — three commands + QuickPick / InputBox flow + `vscode.openWith` route | **Sage** + **Milo** (QuickPick item formatting: Codicon, description, detail) |
| 7 | `extension.ts` — construct + register | **Sage** |
| 8 | `package.json` — three commands, five settings, three palette entries | **Sage** |
| 9 | Unit tests: parser (front-matter shapes), expander (allowlist, slug, unknown pass-through), date formatter (TZ + token coverage), resolver (precedence, ordering, basename collisions) | **Ivy** |
| 10 | Integration tests: mocked `FileSystemWatcher` round-trip on `TemplateService`; conflict policy ("open existing"); openExample idempotent | **Ivy** |
| 11 | Exthost tests: commands registered; `markstudio.dailyNotes.openToday` end-to-end (create-if-missing then open-if-exists); `vscode.openWith` routes through MarkStudio (assert via the existing exthost API surface) | **Ivy** |
| 12 | Docs pass: ADR-0025, design/templates.md, CHANGELOG, FEATURES, ROADMAP (M5.1 + M5.3 → Done), TODO (M5.1 + M5.3 → Done), ARCHITECTURE (§Templates), PROJECT_STATUS, AGENT_HANDOFF, sprint-7 done.md, qa/sprint-7-signoff.md | **Sage + Remy** |
| 13 | Manual F5 matrix: empty folder hint; workspace template; user template; basename collision (workspace wins); InputBox title; `{{date}}` / `{{slug}}` / `$CURRENT_YEAR` / `$CLIPBOARD` substitution; cursor lands on `cursor: N`; daily note create then open; openExample idempotent; opens in MarkStudio (not text editor); theme matrix on QuickPick (dark/light/HC) | **Ivy** + human |

## 6. Phases

| Phase | Scope | Exit |
|---|---|---|
| **A — Design** | This plan + ADR-0025 + `design/templates.md` | All three committed on `feature/sprint-7` |
| **B — Pure modules** | Tasks 1–4 (parser, expander, formatter, resolver) with unit tests | All pure modules green; ~20 new unit tests |
| **C — Service + commands** | Tasks 5–8 (`TemplateService`, `registerTemplates`, `extension.ts`, `package.json`) | F5: all three commands work end-to-end on a small fixture vault |
| **D — Tests + F5 matrix** | Tasks 9–11 + manual matrix sweep | All gate-green; F5 matrix table in `progress.md` ticked |
| **E — Docs + QA sign-off** | Task 12 + push + PR | Branch pushed, PR opened, QA sign-off written, ready for Producer `--no-ff` merge |

## 7. Verification (sprint exit criteria)

* [ ] `npm run lint` clean (`--max-warnings 0` + `prettier --check .`).
* [ ] `npm run typecheck` and `npm run typecheck:test` clean.
* [ ] `npm run build` clean — host bundle delta **target +6–10 kB** for the new module; **zero** webview bundle delta; no Mermaid / graph bundle change.
* [ ] `npm test` green — unit baseline 316 → ~345 (+~25–30); integration 65 → ~70 (+~5).
* [ ] `npm run test:exthost` green — exthost 13 → ~16 (+~3).
* [ ] **Backwards compatibility:** every existing test (M4.1 / T-4.1a / T-4.1b / T-4.1c / M4.2 / M4.4) passes without modification. Sprint 7 is **additive only**.
* [ ] **Manual F5** matrix (§5 task 13) all green; new notes open **in MarkStudio**, not the built-in text editor.
* [ ] ADR-0025 written + accepted; `design/templates.md` written; all stat docs updated.
* [ ] QA sign-off written in `docs/qa/sprint-7-signoff.md`.
* [ ] Brainstorm doc ([../research/phase-5-authoring-brainstorm.md](../research/phase-5-authoring-brainstorm.md)) is on `main` *before* this PR is merged (separate PR #7).

## 8. Risks + mitigations

| Risk | Mitigation |
|---|---|
| `{{title}}` empty submission yields a weird filename | Default `{{title}}` to the template's basename when the InputBox is empty; document the rule in `design/templates.md` |
| Date formatting across DST boundaries / multi-TZ machines | Use `Intl.DateTimeFormat` with the runtime's effective TZ; do not roll our own TZ math; unit-test on a fixed `Date` so tests are TZ-agnostic |
| Multi-root precedence surprises the user | Surface the source root in the QuickPick `detail` slot (e.g. `notes/` (workspace 1) · 1 KB); document in `design/templates.md` |
| Snippet placeholders `${N}` in a `kind: file` template leak into the file as literal `${1}` text | Confirm in F5; the brainstorm flagged this. If it surprises users we add a warning surface in Sprint 8 (which owns the snippet path anyway). |
| User has thousands of templates → QuickPick lag | Out of scope for v1 (no real-world vault has thousands of templates); if reported, sort/limit becomes a Sprint 8 follow-up |
| `vscode.workspace.fs.writeFile` race against the `FileSystemWatcher` (`onDidCreate` fires before the editor opens, triggers a rebuild, debounce window briefly suppresses the next command) | Acceptable — the debounce window is 250 ms; no user-visible effect. Watcher-driven rebuilds idempotent. |
| Phase B can grow if Sage reaches for a YAML library "just for one file" | Producer rule: **in-tree only**, ~30 LOC parser for the fixed schema. Reject the dependency in code review. |
| `openExample` could overwrite a user-customised `daily.md` | Hard rule: `openExample` is **create-if-missing**; if the file exists it just opens the existing one. Same conflict policy as everywhere else. |
| Multi-root workspace with the active editor's root different from workspace-folder index 0 | Documented as "first-root-wins" in v1; active-root-wins is an ADR-0025 follow-up if a user signal lands. |

## 9. Open questions (resolve during the sprint)

* **In-tree YAML parser shape.** Producer leaning: a ~30-line line-by-line parser for the fixed `key: value` shape (no nesting, no multi-line strings, no flow style). Document the supported subset in `design/templates.md`. Reject anything richer.
* **`Intl.DateTimeFormat` ergonomics for `YYYY-MM-DD`.** Native gives locale-formatted output; we want a deterministic format. Build the formatter on `Intl.DateTimeFormat` parts (year/month/day/hour/minute) and concatenate by token — that gives us the right behaviour with no library.
* **Daily-notes title default.** Producer leaning: `{{title}}` defaults to `format(today, dailyNotes.dateFormat)` so the title and the filename are the same string by default. Override per-template if needed.
* **InputBox for the daily-notes command?** Producer leaning: **no** — daily notes is one-key. The user does not pick a template, does not name the file; everything is preconfigured. If they want to override, they use `markstudio.templates.create` and pick `daily`.
* **Column for new note?** Producer leaning: `Active` for `templates.create`, `Active` for `dailyNotes.openToday`. No setting in v1; revisit if QA finds it intrusive.
* **`markstudio.templates.userFolder` default value.** Producer leaning: empty string `""` → service resolves to `<context.globalStorageUri>/templates`. The setting is the escape hatch for users who want a portable folder.

## 10. Non-goals (just say no)

* No new runtime dependency.
* No webview / no preview / no CodeMirror change.
* No new host → webview message; no new webview → host message.
* No tree view; no custom UI surface; no decoration; no status-bar item that isn't already there.
* No keybinding contribution.
* No second `FileSystemWatcher` outside of `TemplateService`.
* No refactor of `LinkIndexService`, `MarkStudioEditorProvider`, or any existing module beyond a one-line registration in `extension.ts`.
* No snippet expansion (Sprint 8 owns it).
* No template gallery, no template preview pane (rejected at brainstorm).
* No auto-bootstrap of `.markstudio/templates/` (rejected at brainstorm).

## 11. Definition of Done

* [ ] M5.1 + M5.3 land in **one** PR off `feature/sprint-7`.
* [ ] All exit-criteria boxes in §7 ticked.
* [ ] ADR-0025 accepted; `design/templates.md` published.
* [ ] [ROADMAP.md](../ROADMAP.md) updated: M5.1 + M5.3 → **Done**; M5.2 = **Next**; M5.4 = **Deferred**.
* [ ] [TODO.md](../TODO.md): backlog updated for Sprint 8 (M5.2 Snippets) + M5.4 follow-ups.
* [ ] [docs/sprint-7/done.md](done.md) written; [docs/qa/sprint-7-signoff.md](../qa/sprint-7-signoff.md) written.
* [ ] [PROJECT_STATUS.md](../PROJECT_STATUS.md) snapshot rewritten.
* [ ] [AGENT_HANDOFF.md](../AGENT_HANDOFF.md) rewritten.

---

## Links

* Brainstorm (source-of-truth for *why* this scope): [../research/phase-5-authoring-brainstorm.md](../research/phase-5-authoring-brainstorm.md)
* Plan source-of-truth: this file.
* Live progress: [progress.md](progress.md).
* Sprint-end handoff (written at close): [done.md](done.md).
* Underpinning ADRs: ADR-0020 (link index pattern), ADR-0021 (PR #4 / open-in-MarkStudio), ADR-0024 (Sprint 6 — backlinks v2).
* Future: ADR-0025 (this sprint) + ADR-0026 (Sprint 8 — snippets).
