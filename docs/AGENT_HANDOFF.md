# AGENT HANDOFF — Sprint 7 / M5.1 Templates + M5.3 Daily notes shipped on `feature/sprint-7` (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Dev team (Nova — UI/QuickPick, Sage — host service + pure core, Milo — visual polish) — Sprint 7 close-out (Phases A → E)
* **Working branch:** `feature/sprint-7` (off `main` `397c7df`)
* **Last commit on branch (pre-handoff):** Phase E docs pass. Branch is ahead of `main`, plus the Phase E docs commit that will follow this handoff write.
* **Prompt used:** ai-team-dev (Nova + Sage + Milo as a single dev team)

---

## 1. What Was Completed

**Sprint 7 — M5.1 (Templates engine) + M5.3 (Daily notes) shipped on `feature/sprint-7` (pending PR + `--no-ff` merge to `main`). This opens Phase 5 — Authoring Workflows with one engine serving two consumers.**

Three native commands now ship:

* **`MarkStudio: New Note from Template`** (`markstudio.templates.create`) — a native QuickPick lists every resolved template (workspace + user), then a title `InputBox` (always shown for `kind: file`, empty → template basename) drives variable expansion; the new note is created and **opened in MarkStudio**.
* **`MarkStudio: Open Today's Note`** (`markstudio.dailyNotes.openToday`) — one keystroke, no InputBox: creates today's daily note from the configured daily template (or opens it if it already exists) and opens it in MarkStudio.
* **`MarkStudio: Create Example Template`** (`markstudio.templates.openExample`) — opt-in: writes a starter `daily` template into the workspace templates folder and opens it. No auto-bootstrap — nothing is written until the user asks.

**Architecture — pure core + one I/O service (mirrors `LinkIndexService`, ADR-0020).**

* **`src/templates/frontMatterParser.ts` (NEW, pure).** In-tree fixed-schema `---`-fenced front-matter reader → `{ meta, body }`. Recognises `kind` / `description` / `output` / `cursor`; unknown keys land in `meta.extras`; malformed front matter → `meta: null` (the whole file is treated as body). **No `gray-matter`, no YAML dependency.**
* **`src/templates/dateFormatter.ts` (NEW, pure).** `format(date, pattern, tz?)` over `YYYY` / `MM` / `DD` / `HH` / `mm` tokens, built on `Intl.DateTimeFormat` parts (no `dayjs` / `date-fns`).
* **`src/templates/variableExpander.ts` (NEW, pure).** `expand(template, ctx)` over a **closed allowlist** (`{{date}}`, `{{time}}`, `{{title}}`, `{{filename}}`, `{{workspace}}`, `{{clipboard}}`, …) plus `{{cursor}}` marker discovery (`findCursorMarker`) and `slugify`. **Snippet `${N}` placeholders and any unknown `{{token}}` pass through verbatim** — this is the seam M5.2 (Snippets) builds on.
* **`src/templates/templateResolver.ts` (NEW, pure).** `resolve(ws[], user[])` merges scanned workspace + user templates by basename — **workspace wins**, **first-root-wins** across multi-root, stable display-name sort. `filterByKind` narrows to `kind: file` etc.
* **`src/templates/TemplateService.ts` (NEW, vscode-aware).** Constructor `(context, provider)` (provider via `import type`). Async scan of both template roots + two `FileSystemWatcher`s (`RelativePattern` per workspace folder + user root) + 250 ms debounced rebuild + `onDidChangeTemplates`. **Two-pass create**: a provisional sanitized-title filename resolves `output:`, then the body is expanded against the final filename. **Never overwrites** — a collision opens the existing file with a status-bar notice (`STATUS_EXISTS`). **Every open routes through `provider.openInMarkStudio`** (lands as a `TabInputCustom`, never `showTextDocument`). User root = configured folder or `globalStorageUri/templates`.
* **`src/commands/registerTemplates.ts` (NEW).** Owns the three command IDs and the QuickPick → InputBox flow; all logic delegates to `TemplateService`. Empty-state shows a single inert `$(info) No templates found` item.
* **`src/extension.ts` (EDITED).** Constructs `new TemplateService(context, provider)`, calls `start()`, pushes the service + `registerTemplates(service)` into `context.subscriptions`, and exposes `templateService` on `MarkStudioExtensionApi`.
* **`package.json` (EDITED).** Three commands under `contributes.commands` (category "MarkStudio") + five settings under `contributes.configuration`: `markstudio.templates.workspaceFolder` (default `.markstudio/templates`), `markstudio.templates.userFolder` (default ``), `markstudio.dailyNotes.template` (default `daily`), `markstudio.dailyNotes.folder` (default `daily`), `markstudio.dailyNotes.dateFormat` (default `YYYY-MM-DD`). **No commandPalette menu entries (commands appear by default), no keybinding, no new view.**

**Tests.** Unit **316 → 374** (+58, four pure-module suites under `test/templates/`). Integration **65 → 71** (+6 — `test/integration/templateService.test.ts`: scans workspace on start; rebuilds on watcher create; workspace-wins over user; expands + creates + opens; never overwrites + notice + still opens; openExample idempotent). Exthost **13 → 16** (+3 — `test/exthost/suite/templates.test.ts`: three commands contributed; Create Example Template writes + opens as `TabInputCustom`; Open Today's Note creates `daily/<date>.md` + opens + idempotent re-open). **461 automated tests, 0 failures. Every prior assertion intact.** The `templates.create` command is never executed in exthost (it would block on the QuickPick).

**Mock widening (`test/_mocks/vscode.ts`).** Added an in-memory `vscode.workspace.fs` (`readFile` / `writeFile` / `stat` / `readDirectory`), `Uri.parse` / `Uri.joinPath`, `RelativePattern`, `FileType`, `WorkspaceFolder`, a `MockFileSystemWatcher` with `__fire`, `env.clipboard`, `window.setStatusBarMessage` / `showErrorMessage`, plus `__set*` / `__get*` / `__fireWatcher` test helpers and an extended `__reset`.

**Bundle.** `dist/extension.js` **~88 kB → 94.9 kB** (+~6.9 kB for the templates engine + commands). `dist/webview.js` ~2.0 MB unchanged. `dist/mermaid.js` ~7.5 MB unchanged. `dist/graph.js` 19.3 kB unchanged. **No webview / protocol / esbuild change.**

**Producer non-negotiables held.** **Zero new runtime dependency** (in-tree front-matter parser + date formatter). Closed variable allowlist (snippet `${N}` passes through). **No overwrite ever.** All opens via `provider.openInMarkStudio` → `markstudio.editor` (never `showTextDocument`). No auto-bootstrap. Native QuickPick only. No webview / protocol / esbuild change. No keybinding. No Memento. First-root-wins multi-root. Title InputBox always shown for `kind: file` (empty → basename); daily notes one-key, no InputBox.

**Docs.** New **ADR-0025** in [DECISIONS.md](DECISIONS.md) + new [design/templates.md](design/templates.md); [CHANGELOG.md](CHANGELOG.md) new `Added` entry; [ROADMAP.md](ROADMAP.md) Phase 5 → In progress (M5.1 + M5.3 Done, M5.2 Next, M5.4 Deferred); [FEATURES.md](FEATURES.md) Phase 5 section rewritten; [TODO.md](TODO.md) M5.1 + M5.3 moved to Done, M5.2 Snippets added to High Priority; [PROJECT_STATUS.md](PROJECT_STATUS.md) snapshot rewritten for Sprint 7; [ARCHITECTURE.md](ARCHITECTURE.md) §3 module layout + §4 component table gain the templates entries; [sprint-7/plan.md](sprint-7/plan.md), [sprint-7/progress.md](sprint-7/progress.md); [qa/sprint-7-signoff.md](qa/sprint-7-signoff.md); this handoff.

---

## 2. Current Work In Progress

* **None.** Sprint 7 is **code-complete and docs-complete on `feature/sprint-7`**. The only remaining steps are: this Phase-E docs commit, `git push`, the (already-open) PR, and the Producer `--no-ff` merge to `main`.

---

## 3. Remaining Work for This Initiative

**Phase 5 — Authoring Workflows is in progress.** M5.1 + M5.3 shipped this sprint. Remaining:

* **M5.2 — Snippets (next, Sprint 8).** Insertable Markdown snippets with `${1}` / `${1:default}` / `${0}` tab-stop placeholders, layered on the M5.1 expander (which already preserves `${N}` verbatim) + the CodeMirror 6 snippet session.
* **M5.4 — Workspace note features (deferred).**

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/templates/frontMatterParser.ts` | New | Pure in-tree fixed-schema `---` front-matter reader |
| `src/templates/dateFormatter.ts` | New | Pure `YYYY/MM/DD/HH/mm` formatter over `Intl.DateTimeFormat` |
| `src/templates/variableExpander.ts` | New | Pure closed-allowlist expander + `{{cursor}}` + `slugify`; snippet `${N}` passes through |
| `src/templates/templateResolver.ts` | New | Pure workspace+user merge by basename (workspace wins, first-root-wins, stable sort) |
| `src/templates/TemplateService.ts` | New | Two-root scan + 2 watchers + debounce + `onDidChangeTemplates`; two-pass create; never overwrite; opens via `provider.openInMarkStudio` |
| `src/commands/registerTemplates.ts` | New | Three command IDs + native QuickPick → InputBox flow; delegates to `TemplateService` |
| `src/extension.ts` | Edited | Constructs + starts `TemplateService`; registers commands; exposes `templateService` on the API |
| `package.json` | Edited | +3 commands, +5 settings (`markstudio.templates.*`, `markstudio.dailyNotes.*`) |
| `test/templates/*.test.ts` | New | +58 unit tests across the four pure modules |
| `test/integration/templateService.test.ts` | New | +6 integration tests (scan / rebuild / workspace-wins / create+open / never-overwrite / openExample idempotent) |
| `test/exthost/suite/templates.test.ts` | New | +3 exthost tests (commands contributed / Create Example / Open Today's Note + idempotent) |
| `test/exthost/index.ts` | Edited | Imports `./suite/templates.test` |
| `test/_mocks/vscode.ts` | Edited | Widened with `workspace.fs`, `Uri.parse`/`joinPath`, `RelativePattern`, `FileType`, watcher mock, `env.clipboard`, `window` status/error, `__set*`/`__get*`/`__fireWatcher` helpers |
| `docs/DECISIONS.md` | Edited | New **ADR-0025** appended |
| `docs/design/templates.md` | New | Templates engine design (schema, variables, resolution, two-pass create, non-negotiables) |
| `docs/CHANGELOG.md` | Edited | New `Added` entry at the top of `## [Unreleased]` |
| `docs/ROADMAP.md` | Edited | Phase 5 → In progress; M5.1 + M5.3 Done; M5.2 Next; M5.4 Deferred |
| `docs/FEATURES.md` | Edited | Phase 5 section rewritten |
| `docs/TODO.md` | Edited | M5.1 + M5.3 moved to Done; M5.2 Snippets added to High Priority |
| `docs/PROJECT_STATUS.md` | Edited | §1 snapshot + §2 focus + Completed Features + In Progress rewritten for Sprint 7 |
| `docs/ARCHITECTURE.md` | Edited | §3 module layout + §4 component table gain the templates entries |
| `docs/sprint-7/plan.md` | Existing | Sprint source of truth (unchanged this phase) |
| `docs/sprint-7/progress.md` | Edited | Phase-by-phase tracker with all commit hashes |
| `docs/qa/sprint-7-signoff.md` | New | QA sign-off (Ivy) — gate green, every prior test intact |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Zero new runtime dependency.** In-tree front-matter parser + date formatter; `gray-matter` / `dayjs` / `date-fns` / Handlebars all rejected. **Recorded as ADR?** Yes → **ADR-0025**.
* **Closed variable allowlist; snippet `${N}` and unknown tokens pass through verbatim.** This keeps expansion total and predictable and leaves the `${N}` seam open for M5.2. **Recorded as ADR?** Yes → **ADR-0025**.
* **Never overwrite.** A target collision opens the existing file with a status-bar notice — the engine never clobbers user content. **Recorded as ADR?** Yes → **ADR-0025**.
* **All opens route through `provider.openInMarkStudio`.** Created/opened notes land as `markstudio.editor` custom-editor tabs, never the plain text editor. **Recorded as ADR?** Yes → **ADR-0025**.
* **One engine, two consumers.** M5.3 daily notes is the M5.1 engine with a fixed template + date-driven `output:` — no parallel code path. **Recorded as ADR?** Yes → **ADR-0025**.
* **Two-pass create.** A provisional filename resolves `output:`, then the body expands against the final filename — resolves the `{{filename}}` ↔ `output:` chicken-and-egg. **Recorded as ADR?** Yes → **ADR-0025**.
* **No auto-bootstrap.** Nothing is written to disk until the user runs a command; `Create Example Template` is opt-in. **Recorded as ADR?** Yes → **ADR-0025**.

---

## 6. Assumptions Made

* **Fixed front-matter schema is sufficient for v1.** Only `kind` / `description` / `output` / `cursor` are interpreted; everything else is preserved in `meta.extras` but unused. A richer schema can come later without breaking files.
* **The five date/time tokens cover daily-note needs.** `YYYY` / `MM` / `DD` / `HH` / `mm` over `Intl.DateTimeFormat` are enough for the default `YYYY-MM-DD` and common variants; locale/era tokens are out of scope.
* **First-root-wins is the right multi-root policy.** When the same basename exists under multiple workspace roots, the first root wins — matching the existing link-index precedent.
* **`globalStorageUri/templates` is an acceptable default user root.** When `markstudio.templates.userFolder` is empty, user templates live under the extension's global storage; users who want a shared vault set the setting explicitly.

---

## 7. Technical Debt Introduced

* **Snippet `${N}` placeholders pass through but are not yet interactive.** That is by design — M5.2 wires them into a CM6 snippet session. Until then a created note may contain literal `${1}` text if the user authored a snippet-style template.
* **Front-matter parser is fixed-schema, not general YAML.** Intentional (zero-dep), but a template author expecting full YAML (nested maps, lists) will be surprised. Documented in `design/templates.md`.
* **No new debt elsewhere.** Carried-over debt is unchanged from the prior handoff.

---

## 8. Blockers

* **None.** All gates green; every prior assertion intact; QA signed off.
* **Next mechanical step:** `git push` (PR already open). The Producer (human) then performs the `--no-ff` merge to `main`. **The dev team does not merge its own PR** — that's the Producer's job. The manual F5 sweep is the Producer's sign-off step.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host `dist/extension.js` **~94.9 kB** (+~6.9 kB from Sprint 6), webview `dist/webview.js` ~2.0 MB (unchanged), Mermaid `dist/mermaid.js` ~7.5 MB (unchanged), `dist/graph.js` 19.3 kB (unchanged)
* [x] `npm test` passes — **445 tests** (374 unit + 71 integration, `node:test`)
* [x] `npm run test:exthost` passes — **16** Extension Host tests
* [ ] **Manual verification in an Extension Development Host (F5)** — Producer F5 sweep is the sign-off step per `sprint-7/plan.md` §6; pipeline gates above are the dev-team's deliverable. Test plan: create from a workspace + a user template; title-driven filename + `{{cursor}}` placement; daily note one-key create + idempotent re-open; collision → existing file opens with notice; opt-in Create Example Template; theme matrix (light, dark, high-contrast).
* [x] **QA sign-off** written: `docs/qa/sprint-7-signoff.md`.
* [x] Every prior test passes unchanged.

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-7` to `main` (PR already open + human `--no-ff` merge), the next focus is **M5.2 — Snippets (Sprint 8)** per [ROADMAP.md](ROADMAP.md) §5.
* **Why M5.2:** the M5.1 expander already recognises and preserves `${N}` placeholders verbatim — the engine seam is in place; M5.2 wires those placeholders into a CodeMirror 6 snippet session (tab-stops, default values, final `${0}`) and adds an insert-snippet command.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) §5 — Phase 5 milestones
  * [DECISIONS.md](DECISIONS.md) — ADR-0025 sets the templates contract M5.2 must honour
  * [docs/design/templates.md](design/templates.md) — the engine M5.2 layers on
  * `src/templates/variableExpander.ts` — the `${N}` pass-through seam

---

## 11. Open Questions for the Next Agent

* **Should the snippet session reuse the `variableExpander` allowlist** for `{{…}}` tokens inside a snippet body, or keep `{{…}}` (template-time) and `${…}` (snippet-time) strictly separate? ADR-0025 keeps them separate for now.
* **Should daily notes support a configurable folder hierarchy** (e.g. `daily/YYYY/MM/`) beyond the flat `markstudio.dailyNotes.folder`? Out of scope for v1; revisit if requested.
* **Should the front-matter parser ever grow to general YAML** (nested maps / lists)? That re-opens the zero-dependency question — a future ADR would need to weigh an in-tree mini-YAML vs a dependency.
* **Should `Create Example Template` offer more than the single `daily` starter** (e.g. a meeting-notes or weekly template)? v1 ships one; a small gallery could come later.
* **Should template variables expose `{{selection}}` / git author / front-matter fields**? The allowlist is intentionally closed for v1; each addition is an ADR-0025 amendment.
