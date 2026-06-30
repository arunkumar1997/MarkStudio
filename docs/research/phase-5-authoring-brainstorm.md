# Phase 5 — Authoring Workflows: Team Brainstorm

> Pre-design exploration. Run 2026-06-30 by Remy (Producer) ahead of Sprint 7 planning. Not a decision record — feeds the Sprint 7 plan + a future ADR.
> Participants: **Kira** (Product Designer), **Milo** (Visual Director), **Nova** (Frontend), **Sage** (Backend), **Ivy** (QA), **Remy** (Producer).
> Scope: how the four Phase 5 milestones (Templates / Snippets / Daily notes / Workspace features) should compose, given MarkStudio's "feels like a first-party VS Code feature" rule.

---

## Phase 0 — The Constraint Wall (Remy)

Before ideation: the rails this brainstorm runs on, so nobody pitches an Obsidian clone.

1. **Native VS Code feel.** No fake chrome. QuickPick, InputBox, status-bar items, tree views, the standard `WorkspaceEdit` insert path — all fair game. A custom webview gallery for picking a template is **not**.
2. **Zero new heavy dependencies.** A template engine like Handlebars / Mustache is rejected on sight — the wins do not justify the surface. VS Code's built-in snippet syntax is already in users' fingers; reuse it where possible.
3. **CodeMirror in the editor pane.** Inserts land in a CodeMirror 6 `EditorView`, not a `TextEditor`. That has real consequences for snippet tab-stops (CM6 has `@codemirror/autocomplete`'s `snippet` helper; VS Code's `SnippetString` only works on `TextEditor`).
4. **Phase 5 sequencing in the roadmap is `M5.1 → M5.2 → M5.3 → M5.4`** but the milestones share an engine. We should brainstorm the engine first, then decide where to slice.
5. **One sprint = one mergeable PR.** If a milestone is too big it gets split. If two are small enough to share infrastructure (cf. Sprint 6 = T-4.1a + T-4.1c), they can ride together.

---

## Phase 1 — Free Ideation

### Kira (Product Designer)

* **"New from template" should feel like Cmd-N + a one-line prompt.** Not a dialog. Not a webview. `Ctrl+Shift+P` → `MarkStudio: New Note from Template` → QuickPick of templates → InputBox for the new note's title → done. The whole thing is muscle memory in five seconds.
* **Daily notes are a one-key feature.** A single command `MarkStudio: Open Today's Note` that creates `notes/daily/2026-06-30.md` from the daily template if missing, opens it if it exists, and parks the cursor on the first empty `{{cursor}}` slot. No second dialog. No "are you sure".
* **Templates should *show* you what they make.** Hovering a template in the QuickPick should show a description line (read from front-matter `description:` or the first comment in the template) so users aren't picking blindly.
* **Snippets and templates are the same idea at different scales.** A *template* is a snippet that creates a file; a *snippet* is a template that lands at the cursor. One engine, two commands. If we split the model we're going to explain the split forever.

### Milo (Visual Director)

* **Restraint on UI.** Templates folder convention + Codicon for the QuickPick item (`$(file)`, `$(notebook-template)`, `$(symbol-snippet)`). No custom views, no decoration overlays in the explorer. Native VS Code feel rule applies hardest here.
* **Daily-note default folder visualization.** A subtle Codicon on the active daily-note status bar item (`$(calendar) 2026-06-30`) when the active editor *is* today's note — makes it discoverable without a UI.
* **One thing I do want:** when you pick a template, the QuickPick row could show its first-heading text on the right side (the standard `description`/`detail` slot QuickPickItem already supports). Free, native, gives users a peek.
* **Push back on Kira:** "snippets and templates are the same idea" is true conceptually but their UI surface is different — a snippet is **completion in a flow**, a template is **picker first, write second**. Same engine, two surfaces, fine. But don't pretend they're one UX.

### Nova (Frontend Engineer)

* **CodeMirror snippet tab-stops are a real thing.** `@codemirror/autocomplete` ships a `snippet(template)` function that handles `${1:placeholder}` jumps natively in CM6. We already bundle `@codemirror/autocomplete`'s search facility — adding the snippet helper is ~free.
* **VS Code's `SnippetString` does NOT work in our editor.** Our pane is a webview-hosted CodeMirror, not a `TextEditor`. So we cannot just call `editor.insertSnippet(snippetString)`. Inserts need to flow over our existing `edit { changes }` message protocol, with the snippet expansion happening **inside** the webview using CM6's helper.
* **Variable expansion is two layers:**
  * **Host-side** — `{{date}}`, `{{title}}`, `{{filename}}`, `{{cursor}}` (the simple things that don't need user input or live editor state). These are pure text replacement before the document is created.
  * **Webview-side** — `${1:name}` style tab-stops that the user then jumps through with Tab/Shift-Tab. These need CM6's snippet helper.
* **Concern:** if we adopt full VS Code snippet syntax (which we'd want for compatibility with users' existing snippet muscle memory) the parser has to handle `${1:default}`, `${2|one,two,three|}`, `$CURRENT_YEAR`, `$TM_FILENAME`, etc. That parser is non-trivial. Suggest **a deliberate subset** in v1.
* **Pragmatic split:** v1 = host-side variables + CM6 tab-stops via `@codemirror/autocomplete`. No completion-provider snippet integration in v1.

### Sage (Backend Engineer)

* **Storage:** two scopes, with workspace beating user:
  * **Workspace** templates: `<workspace>/.markstudio/templates/*.md`. Discovered via `workspace.findFiles`; watched via `FileSystemWatcher` for live updates (same pattern as the link index).
  * **User** templates: `context.globalStorageUri/templates/*.md`. Discovered via the same scan helper on a different root.
  * **Precedence**: workspace > user, by basename. A workspace template named the same as a user template wins.
* **Template front-matter:** YAML at the top of the template file with `description:`, `cursor: line N`, `output: <relative-path-pattern>`. The output pattern is the killer: `output: notes/daily/{{date}}.md` for the daily template, `output: meetings/{{date}}-{{slug}}.md` for a meeting template. Then daily-notes is just "run the template named `daily`" with **no special engine**.
* **Discovery surface:** one host-side `TemplateService` (mirrors `LinkIndexService`) that owns the two roots, the watcher, and the merged-by-precedence list. Pure `TemplateResolver` underneath for testing.
* **Security:** template files are user-authored Markdown read from disk — no code execution, no shell-out, no `{{exec(…)}}` shenanigans. Variable expansion is **pure string substitution** with a fixed allowlist of substitutions. This is a real concern only because templates *feel* like a place where "make it powerful" creeps in.
* **Daily notes:** a *zero-code* feature once Templates land. The `MarkStudio: Open Today's Note` command takes a setting `markstudio.dailyNotes.template` (default `"daily"`) and `markstudio.dailyNotes.folder` (default `"daily"`), resolves the template, expands `{{date}}` from `new Date()` in workspace TZ, computes the output path, creates if missing, opens.
* **Snippets** are the same engine pointed at the cursor instead of a new file. The command `MarkStudio: Insert Snippet` opens a QuickPick over the same template store filtered to `kind: snippet` (front-matter), and posts an `insertSnippet { text }` message to the webview; the webview runs CM6's `snippet()` helper.

### Ivy (QA Engineer)

* **What breaks when:**
  * The templates folder doesn't exist. (Default empty list; do **not** auto-create the folder — that's intrusive.)
  * A template has malformed front-matter. (Surface a status-bar message; skip the template; never crash the picker.)
  * `output:` resolves to an existing file. (Don't overwrite — open the existing file. Match the daily-note "create-if-missing, open-if-exists" pattern across the board.)
  * `output:` resolves outside the workspace root. (Reject; status-bar message.)
  * `{{date}}` across timezone boundaries — DST, midnight, multi-root workspace where each root has a different daily-notes folder. (Single workspace TZ; `Intl.DateTimeFormat` for stable formatting; in multi-root, use the first folder unless a setting points elsewhere.)
  * Tab-stops in a snippet whose first `${1}` is on a line the user has already typed past. (Defined CM6 behaviour; document it.)
  * The user has both a workspace and a user template named `daily.md`. (Workspace wins; surface the source in the QuickPick `detail`.)
* **Testability:** if the variable expander, the front-matter parser, and the template resolver are all **pure functions** in `src/templates/`, this whole thing is straightforward to unit-test. The `TemplateService` is the only piece that touches `vscode`.
* **Worry:** I want to see one integration test that picks a template through a mocked QuickPick and asserts the resulting file content. The host-only path is easy to test; the CM6 snippet expansion has to be jsdom-integration-tested separately.

### Remy (Producer)

* **The whole of Phase 5 is a single engine plus four command surfaces.** Sage nailed it. The question is sequencing.
* **My instinct: Sprint 7 = Templates + Daily Notes, together** — they share 100% of the engine, splitting them forces a second sprint to re-touch the same files (same logic that drove Sprint 6 combining T-4.1a + T-4.1c).
* **Sprint 8 = Snippets** — same engine pointed at the cursor, but the CM6 snippet-helper integration is a real piece of work and deserves its own scope.
* **M5.4 Workspace features** — defer until we see what Phase 5's adoption looks like. Could end up being two small follow-ups instead of a milestone.

---

## Phase 2 — Discussion & Refinement

### Disagreement 1 — "Are snippets and templates one feature or two?" (Kira vs Milo)

* **Kira:** "One engine, two commands. Same picker UX. Same front-matter. Same variable expansion. If we tell users 'this is a template, but if you want it at the cursor you need to know it's actually a *snippet* with different rules' we've already lost."
* **Milo:** "I agree on the engine. I disagree on collapsing the surface. The QuickPick for templates needs `output:` paths in the detail line; the QuickPick for snippets needs the snippet body preview. Different signals. Different command IDs. Different keybindings."
* **Sage (resolving):** "Both. One `TemplateService` reads everything; templates have `kind: file` (default), snippets have `kind: snippet`. Two commands filter the same store on `kind`. The QuickPick `detail` slot differs per kind. Kira gets a unified engine, Milo gets distinct surfaces."
* **Settles to:** unified engine, two commands. One file-system root for both.

### Disagreement 2 — "Reuse VS Code snippet syntax or invent our own?" (Sage vs Nova)

* **Sage:** "Reuse. `${1:default}`, `$CURRENT_YEAR`, `$TM_FILENAME` — users already type these. Inventing a new syntax forces them to learn ours."
* **Nova:** "Reuse the *surface*, but understand we cannot reuse the *engine*. VS Code's snippet engine lives in `TextEditor`. We're in a webview-hosted CodeMirror. The parser is non-trivial — `${1|opt1,opt2|}` choice syntax, nested placeholders, transform expressions `${1/regex/replacement/}`. Implementing the full grammar is multi-sprint work."
* **Ivy:** "We don't need the full grammar. The 80/20 is `${N}`, `${N:default}`, `$CURRENT_YEAR`, `$CURRENT_MONTH`, `$CURRENT_DATE`, `$TM_FILENAME`, `$TM_FILENAME_BASE`, `$WORKSPACE_NAME`, `$CLIPBOARD`. Choice syntax + transforms are deferrable."
* **Remy:** "Subset, documented in the design doc as 'v1 grammar', deferred items called out. Future-compatible — if we add transforms later it's additive."
* **Settles to:** **VS Code snippet syntax, deliberate v1 subset**. No choice / transform / nested placeholder grammar in v1. CM6's `@codemirror/autocomplete` `snippet()` helper handles the basic placeholder set we need; we layer a host-side preprocessor on top of it for the `$CURRENT_*` and `$TM_*` and `$CLIPBOARD` substitutions (those expand to plain text before CM6 sees the snippet).

### Disagreement 3 — "Scope of Sprint 7" (Remy vs Kira)

* **Remy:** "Sprint 7 = Templates + Daily Notes. Snippets in Sprint 8."
* **Kira:** "Users don't experience Phase 5 in milestones — they experience it as 'authoring is now powerful'. Shipping Templates + Daily Notes without Snippets means the first user demo doesn't include the thing many writers use ten times a day."
* **Milo:** "I'd rather ship something polished and complete in its slice than three things at half quality."
* **Sage:** "If we do Templates + Daily Notes + Snippets in one sprint we're juggling the CM6 snippet helper, the front-matter parser, the watcher, two commands, **and** the daily-notes command. That's a 2× Sprint-5-sized PR. We pay for that in review burden and bug surface."
* **Ivy:** "Three command surfaces in one sprint also means three F5 matrices and three integration test sets. I'd rather two clean sprints than one heroic one."
* **Settles to:** **Sprint 7 = Templates + Daily Notes** (one engine, two surfaces, both file-creation). **Sprint 8 = Snippets** (same engine reused, plus the CM6 snippet helper integration). **M5.4 deferred until adoption data**.

### Disagreement 4 — "Should the templates folder auto-bootstrap with an example?" (Kira vs Ivy)

* **Kira:** "Zero-state is bleak. A first-time user runs the command, sees an empty picker, doesn't know what to do. Ship one example template (a daily note) on first run so the picker is never empty and the user has something to riff on."
* **Ivy:** "Auto-creating files in the user's workspace without asking is intrusive. We're not Obsidian. Show a status-bar message 'No templates found — create one in `.markstudio/templates/`' and link to the docs. Empty state is a teaching opportunity, not a bug."
* **Sage:** "If we auto-create, we have to handle the case where the user *deleted* our example because they didn't want it. Re-creating it on next run is hostile."
* **Settles to:** **No auto-bootstrap.** Empty picker shows a single non-selectable QuickPickItem `No templates found. Click for docs.` that opens the design doc / FEATURES entry. **Plus** we ship a `MarkStudio: Create Example Template` command (opt-in) that drops one starter template into `.markstudio/templates/daily.md` if the file doesn't exist. Kira gets an on-ramp; Ivy gets opt-in.

### Cross-cutting agreements

* **One engine, two roots, four+ command surfaces.** `TemplateService` (host) + pure `templateResolver` / `frontMatterParser` / `variableExpander` modules.
* **Front-matter shape** (YAML):
  ```yaml
  ---
  kind: file              # "file" (default) | "snippet"
  description: A daily journal entry
  output: daily/{{date}}.md     # required for kind:file
  cursor: 5                     # optional 0-based line where to land the cursor after expansion
  ---
  ```
  Snippets omit `output:` and `cursor:`; their `${1}` placeholder is the implicit cursor target.
* **Variable allowlist v1 (host-side, expanded before the body reaches the editor):**
  * `{{date}}` — `YYYY-MM-DD` in workspace TZ (configurable format via `markstudio.templates.dateFormat` later)
  * `{{time}}` — `HH:mm`
  * `{{datetime}}` — `YYYY-MM-DD HH:mm`
  * `{{title}}` — value of the InputBox prompt for kind:file (always asked)
  * `{{slug}}` — kebab-case of `{{title}}`
  * `{{filename}}` — basename of the created file, without extension
  * `{{cursor}}` — alias for `${0}` (CM6 final cursor)
* **Snippet placeholders v1** (passed through to CM6's `snippet()`):
  * `${1}`, `${2}`, … — tab-stops
  * `${1:default}` — tab-stop with default text
  * `${0}` — final cursor (or `{{cursor}}` alias)
* **VS Code variables v1** (host-side substitution):
  * `$CURRENT_YEAR`, `$CURRENT_MONTH`, `$CURRENT_DATE`, `$CURRENT_HOUR`, `$CURRENT_MINUTE`
  * `$TM_FILENAME`, `$TM_FILENAME_BASE`
  * `$WORKSPACE_NAME`
  * `$CLIPBOARD` (read via `vscode.env.clipboard.readText()`)
  * Deferred: `${TM_SELECTED_TEXT}`, `${1|a,b,c|}` (choices), `${1/regex/replace/}` (transforms), `${1:${VAR}}` (nested).
* **Settings (new):**
  * `markstudio.templates.workspaceFolder` (default `".markstudio/templates"`)
  * `markstudio.templates.userFolder` (default: global storage)
  * `markstudio.dailyNotes.template` (default `"daily"`)
  * `markstudio.dailyNotes.folder` (default `"daily"`)
  * `markstudio.dailyNotes.dateFormat` (default `"YYYY-MM-DD"`) — same format used by `{{date}}`
* **Commands (new):**
  * `markstudio.templates.create` — Templates QuickPick → InputBox title → file
  * `markstudio.templates.openExample` — opt-in example template creator
  * `markstudio.dailyNotes.openToday` — one-key today's note
  * **Sprint 8:** `markstudio.snippets.insert` — Snippets QuickPick → CM6 snippet expansion at cursor
* **Webview message protocol additions (Sprint 8):**
  * `insertSnippet { template: string, cursorLine?: number, cursorColumn?: number }` (host → webview)
* **No new runtime dependency.** YAML front-matter parsing reuses whatever lightweight approach we already have (or a ~5-line in-tree split-on-`---` parser; the front-matter is fixed-shape and shallow).

---

## Phase 3 — Final Pitches

### Concept A — "Templates engine in Sprint 7, Snippets in Sprint 8" (RECOMMENDED)

* **Description.** Sprint 7 ships the templates engine (`TemplateService` + pure resolver/parser/expander) and two command surfaces: `markstudio.templates.create` (general new-from-template) and `markstudio.dailyNotes.openToday` (daily notes as the canonical first consumer of the engine). Sprint 8 reuses the same engine plus a new `insertSnippet` webview message and the `@codemirror/autocomplete` snippet helper.
* **Pros.** Clean engine-first delivery. Daily notes proves the engine works end-to-end immediately. Sprint 8 is "add cursor-insert + CM6 helper" — small. M5.4 stays deferred. Each PR is reviewable.
* **Cons.** Users who only care about snippets wait a sprint. The first demo of Phase 5 doesn't include snippets.
* **Effort.** Sprint 7 ≈ Sprint 5 size (new module, new service, two commands, ~30–40 new tests, +6–10 kB host, no webview change). Sprint 8 ≈ Sprint 4 size (one new message, one webview integration, ~15–20 tests).

### Concept B — "Everything in one Sprint 7"

* **Description.** Templates + Daily Notes + Snippets in one PR.
* **Pros.** Full Phase 5 in one demo. Single doc pass.
* **Cons.** 2× Sprint-5-sized PR; three F5 surfaces in one go; review burden; the CM6 snippet helper bug risk lands the same week as the front-matter parser bug risk. Three things at half quality vs two at full quality. Failed in spirit by every Sprint 5/6 lesson.
* **Effort.** Probably 1.5× a normal sprint with elevated bug risk.

### Concept C — "Snippets first, Templates second"

* **Description.** Ship the cursor-insert flow first (Sprint 7 = Snippets), defer file-creation to Sprint 8.
* **Pros.** Snippets are the higher-frequency user surface; some users may never use templates.
* **Cons.** Snippets need the harder CM6 integration; templates are the simpler "host-side string substitution + `WorkspaceEdit.createFile`". Doing the hard thing first risks scope creep and slows the demo. The daily-notes feature blocks on templates anyway and is the most-asked-for Phase 5 deliverable.
* **Effort.** Comparable to Concept A but front-loaded with risk.

---

## Phase 4 — Team Vote

| Voter | Vote | Reasoning |
|---|---|---|
| **Remy** | A | Clean sequencing; engine first; risk minimised; each sprint is one merged PR; matches the Sprint 5/6 cadence the team has proven. |
| **Sage** | A | "Build the engine, then build on it." Daily notes is the engine's acceptance test; snippets stress-test the message protocol later. |
| **Nova** | A | The CM6 snippet helper integration deserves its own sprint with its own jsdom integration suite — putting it next to front-matter parser bugs would mask both. |
| **Kira** | A (with reservation) | I wanted snippets in the first demo, but Ivy and Sage are right that quality across two clean sprints beats heroic one-sprint scope. Reserved: please cut the example-template gap in Sprint 7 with the opt-in `MarkStudio: Create Example Template` command so the empty state isn't a brick wall. |
| **Milo** | A | Two distinct command surfaces deserve two distinct sprints of visual polish. QuickPick `detail`/`description` choices for templates differ from snippets; thinking about both at once dilutes both. |
| **Ivy** | A | Three integration suites in one sprint is a recipe for one suite getting half-tested. Two sprints, two tight test sets, each F5 matrix is honest. |

**Vote outcome: 6 / 6 for Concept A.** Unanimous, with Kira's amendment baked in (ship the opt-in example-template command in Sprint 7).

---

## Phase 5 — Recommendation for Sprint 7

* **Title.** Sprint 7 — M5.1 Templates + M5.3 Daily Notes (Phase 5 engine + first two consumers).
* **Scope.**
  * `src/templates/` — new module: `TemplateService.ts` (vscode-aware), `templateResolver.ts` (pure), `frontMatterParser.ts` (pure), `variableExpander.ts` (pure).
  * Two new commands: `markstudio.templates.create`, `markstudio.dailyNotes.openToday`.
  * One opt-in helper command: `markstudio.templates.openExample`.
  * Five new settings (see "Cross-cutting agreements" above).
  * Watcher on both template roots (workspace + user-global), debounced rebuild — same shape as `LinkIndexService`.
  * Empty-state QuickPick item that opens the design doc.
  * **No webview / no message protocol change in Sprint 7** — files are created via the host's `vscode.workspace.fs.writeFile` + `vscode.window.showTextDocument`, which opens through the existing MarkStudio custom-editor registration (so the new note opens *in MarkStudio*, not the built-in editor — verify in F5).
* **Out of scope (Sprint 7).** Snippets (Sprint 8), workspace-level note features (M5.4 — deferred), full VS Code snippet grammar (choice syntax, transforms, nested placeholders — deferred), template categories / folders (deferred), template gallery webview (rejected — native QuickPick only).
* **New ADR.** ADR-0025 — Templates engine: front-matter shape, variable allowlist, two-root precedence, no-auto-bootstrap, native-QuickPick-only surface.
* **New design doc.** `docs/design/templates.md` (front-matter spec, variable allowlist, precedence rules, opt-in example).
* **Test target.** +25–35 unit (resolver / parser / expander), +5–8 integration (mocked workspace), +2–3 exthost (command registration + `vscode.workspace.fs.writeFile` round-trip).
* **Bundle delta target.** Host +6–10 kB (the new module). Webview unchanged.
* **Effort estimate.** Sprint-5-sized. One feature branch, one PR, one Producer `--no-ff` merge.

## Phase 5 — Recommendation for Sprint 8

* **Title.** Sprint 8 — M5.2 Snippets (Phase 5 engine reused at the cursor).
* **Scope.** New command `markstudio.snippets.insert`; new W ← H message `insertSnippet`; webview integration with `@codemirror/autocomplete`'s `snippet()` helper; host-side variable preprocess **before** sending the body to the webview; jsdom integration test for tab-stop progression.
* **New ADR.** ADR-0026 — Snippet insertion in CM6 (host-preprocess + CM6 `snippet()` helper; deliberate v1 grammar subset).
* **Test target.** +15–20 unit, +3–5 integration (jsdom CM6), +1 exthost.
* **Effort estimate.** Smaller than Sprint 7 (engine reuse).

## Deferred (no current sprint home)

* **M5.4 Workspace features.** Revisit once Sprint 7 + 8 are merged and we see adoption signals. Possible follow-ups: "create note in folder of active editor", "quick-rename a note + update backlinks", "register a template as a snippet too" (single-source-of-truth dual surface).
* **Full VS Code snippet grammar.** `${1|a,b|}` choices, `${1/regex/replace/}` transforms, nested placeholders. Additive; ship if a user signal arrives.
* **Template categories / nested folders in the picker.** Defer until the flat list gets unwieldy on real vaults.
* **A template editor / preview pane.** Rejected at brainstorm — violates the "no fake chrome" rule. Users edit templates as plain `.md` files.

---

## Open questions to resolve in Sprint 7's plan

1. Exact front-matter parser strategy — in-tree micro-parser (probably ~30 LOC for the closed schema) vs adding `gray-matter` (a small, ubiquitous dependency). Producer leaning: in-tree, **zero new dep** rule wins.
2. Date format library: native `Intl.DateTimeFormat` (zero dep, awkward for custom format strings like `YYYY-MM-DD`) vs a tiny formatter (`date-fns/format` is overkill, `dayjs` is the lightweight option). Producer leaning: write a ~10-line formatter that supports the four tokens users actually use (`YYYY`, `MM`, `DD`, `HH`, `mm`) — zero new dep.
3. `$CLIPBOARD` — does it block on the user's clipboard read? Async; resolves before the file is created. Need to handle the user denying clipboard access gracefully.
4. Multi-root workspace — which root owns `.markstudio/templates/`? Probably each root has its own; merge with precedence (workspace root of active editor wins, then other roots in workspace-folder order). Pin in ADR-0025.
5. Should `markstudio.dailyNotes.openToday` reveal the editor in a specific column (`Beside`, `Active`)? Default: `Active`. Setting deferred.

---

## Links

* Roadmap: [../ROADMAP.md](../ROADMAP.md) §5
* Architecture: [../ARCHITECTURE.md](../ARCHITECTURE.md)
* Native VS Code feel rule: [../../.ai/CONTEXT.md](../../.ai/CONTEXT.md) §3
* Prior brainstorm-led design (link index): [../design/backlinks.md](../design/backlinks.md), ADR-0020.
* Engine analogue (watcher + pure resolver pattern): `src/links/LinkIndexService.ts`, `src/links/linkIndex.ts`.
