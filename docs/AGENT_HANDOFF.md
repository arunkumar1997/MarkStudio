# AGENT HANDOFF — T-3.5 Footnotes & GFM completeness (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-3.5 session (Dev team — Nova + Milo)
* **Working branch:** `feature/sprint-1` (off `main` at `d79a58f`; **not yet pushed/merged** — awaits QA sign-off + Producer merge)
* **Last commit on `main`:** `d79a58f` — *fix: correct indentation and formatting in multiple files* (the earlier Phase 2.5/3 batch T-2.2/3.1/3.2/3.3/3.4 is now committed + pushed to `origin/main` at `b5546d7`, so the Sprint-1 step-0 blocker is cleared)
* **Prompt used:** ai-team-dev mode (Sprint 1 spec: [sprint-1/plan.md](sprint-1/plan.md))

---

## 1. What Was Completed

Implemented **T-3.5 — Footnotes & GFM completeness** (Phase 3 milestone M3.5), which **closes Phase 3 — Modern Markdown**. Footnotes (`[^1]` references + `[^1]:` definitions), GFM task lists (`- [ ]` / `- [x]`), GFM tables, and strikethrough (`~~text~~`) now render in the live preview, **each individually toggleable** via its own `markstudio.preview.*` setting (all default on) and degrading gracefully when off.

* **`src/webview/preview/taskLists.ts` (new).** `applyTaskLists(md)` registers a dependency-free markdown-it **core rule** `after("inline")`: it finds a list item whose first paragraph opens with `[ ]` / `[x]` / `[X]`, prepends a **disabled** read-only `html_inline` checkbox, strips the marker from the inline content + first text child, and stamps `markstudio-task-list` (on the `ul`/`ol`) and `markstudio-task-list-item` (on the `li`) classes so the bullet can be removed in CSS. Same algorithm as `markdown-it-task-lists`, kept in-tree. **No `import` of any new package.**
* **`src/webview/preview/PreviewRenderer.ts` (edited).** `createMarkdownIt(math, mermaid, callouts, wikiLinks, footnotes, taskLists, tables, strikethrough)` now also applies `md.use(markdownItFootnote)` and `applyTaskLists(md)` when on, and **disables** the built-in `table` / `strikethrough` rulers when those flags are off (both ship in markdown-it's default preset, so they need no dependency). `setConfig` rebuilds the single markdown-it instance when **any** preview flag flips (ADR-0008). The block-diff DOM patcher is untouched.
* **`src/messaging/messages.ts` (edited).** `MarkStudioConfig` gained `footnotes` / `taskLists` / `tables` / `strikethrough`; the `isMarkStudioConfig` boundary guard validates all four.
* **`src/services/ConfigurationService.ts` (edited).** `read` resolves `preview.footnotes` / `preview.taskLists` / `preview.tables` / `preview.strikethrough` (default `true`).
* **`src/webview/main.ts` (edited, Milo).** Themed footnote refs/backrefs (`.footnote-ref a`, `.footnote-backref`, `.footnotes-sep`, `.footnotes`, `.footnotes-list`, `.footnote-item`), the task-list checkbox (`accent-color` + stripped bullets), and strikethrough (`del, s` → `line-through`) — **entirely** via `--vscode-*` variables. Tables were already themed.
* **`package.json` (edited).** Contributes the four `markstudio.preview.*` settings (boolean, default `true`, `resource` scope). Adds **`markdown-it-footnote`** (runtime) + **`@types/markdown-it-footnote`** (dev).
* **Tests (edited).** 13 new integration tests in `test/integration/previewRenderer.test.ts` (footnotes 3, task lists 4, tables 3, strikethrough 3 — each: renders when on, degrades when off, live `setConfig` toggle) + 8 new `ConfigurationService` cases; config fixtures updated for the four new fields across all four config-bearing test files. Unit 85 → 93, integration 26 → 39.
* **Documentation pass:** [design/gfm.md](design/gfm.md) (new), **ADR-0019** in [DECISIONS.md](DECISIONS.md), [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M3.5 → Done **and Phase 3 → Done** with exit criteria checked), [TODO.md](TODO.md) (T-3.5 → Done), [PROJECT_STATUS.md](PROJECT_STATUS.md), [sprint-1/progress.md](sprint-1/progress.md), and this handoff.
* **Housekeeping:** `src/webview/preview/callouts.ts` and `wikiLinks.ts` were reformatted from 4-space → 2-space indent to satisfy `prettier --check` (they had drifted in local commit `d79a58f`). Whitespace-only; no behavioural change.

---

## 2. Current Work In Progress

* **Item:** None. T-3.5 is complete and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (93 unit + 39 integration); `npm run test:exthost` (4) also passes.
* **Note on verification:** The one outstanding item is the **manual EDH (F5) matrix** in dark / light / high-contrast (see §9) — automation cannot assert pixel/theme behaviour under jsdom.
* **Note on git:** All T-3.5 work is on `feature/sprint-1`. It is committed on the branch (see §8) but **not merged to `main`** — merge is the Producer's job after QA sign-off.

---

## 3. Remaining Work for This Initiative

**Phase 3 — Modern Markdown is COMPLETE** (M3.1 math, M3.2 Mermaid, M3.3 callouts, M3.4 wiki links, M3.5 footnotes/GFM). There is no remaining Phase 3 work.

The next phase is **Phase 4 — Knowledge Management** ([ROADMAP.md](ROADMAP.md)): M4.1 backlinks panel, M4.2 hover preview for links, M4.3 transclusion, M4.4 graph view. A natural first step is the wiki-link **resolver** (T-3.4 already emits `data-wikilink-target` / `data-wikilink-heading` on each anchor with no `href`) so `[[note]]` links resolve to real files and navigate.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/webview/preview/taskLists.ts` | New | `applyTaskLists(md)` — dependency-free task-list core rule (disabled checkboxes) |
| `src/webview/preview/PreviewRenderer.ts` | Edited | footnote plugin + task-list rule wired; `table` / `strikethrough` rulers toggled via `md.disable`; `setConfig` rebuilds on any flag flip |
| `src/messaging/messages.ts` | Edited | `MarkStudioConfig` + `isMarkStudioConfig` gain `footnotes` / `taskLists` / `tables` / `strikethrough` |
| `src/services/ConfigurationService.ts` | Edited | `read` resolves the four new `preview.*` keys |
| `src/webview/main.ts` | Edited | Themed footnotes, task-list checkbox, strikethrough via `--vscode-*` |
| `package.json` | Edited | Four new settings; adds `markdown-it-footnote` + `@types/markdown-it-footnote` |
| `package-lock.json` | Edited | Lockfile for the new deps |
| `src/webview/preview/callouts.ts` | Edited | Reformat 4→2-space (prettier); no behaviour change |
| `src/webview/preview/wikiLinks.ts` | Edited | Reformat 4→2-space (prettier); no behaviour change |
| `test/integration/previewRenderer.test.ts` | Edited | +13 integration tests; `CONFIG` gains the four fields |
| `test/services/ConfigurationService.test.ts` | Edited | +8 cases; fixtures updated |
| `test/messaging/messages.test.ts` | Edited | `VALID_CONFIG` gains the four fields |
| `test/integration/createEditor.test.ts` | Edited | `CONFIG` gains the four fields |
| `docs/design/gfm.md` | New | Design note for footnotes & GFM |
| `docs/DECISIONS.md` | Edited | ADR-0019 + index row |
| `docs/api/message-protocol.md` | Edited | `MarkStudioConfig` now lists all ten fields |
| `docs/CHANGELOG.md` | Edited | New T-3.5 Added entry |
| `docs/FEATURES.md` | Edited | Footnotes & full GFM → Shipped; config row extended |
| `docs/ROADMAP.md` | Edited | M3.5 → Done; **Phase 3 → Done** (exit criteria checked) |
| `docs/TODO.md` | Edited | T-3.5 → Done; focus moves to Phase 4 |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-3.5 |
| `docs/sprint-1/progress.md` | Edited | Phases marked done |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Per-feature sourcing (ADR-0019), not one blanket policy.** Tables + strikethrough use markdown-it's **built-in** rulers (toggled via `md.disable`, no dependency); task lists are a **dependency-free** in-tree core rule; footnotes use the canonical **`markdown-it-footnote`** plugin (the one genuinely non-trivial, two-pass feature).
  * **Recorded as ADR?** Yes → **ADR-0019**.
* **One `markstudio.preview.*` toggle per feature** (not a combined `gfm`), all default `true`, `resource` scope — Producer decision; resolves the AGENT_HANDOFF §11 open question.
  * **Recorded as ADR?** Covered by ADR-0019 + the feature entry.
* **Task-list checkboxes render disabled (read-only).** No source write-back this sprint — Producer decision. Interactive toggling is a Phase 4-style follow-up.
  * **Recorded as ADR?** Covered by ADR-0019.

---

## 6. Assumptions Made

* **The block-diff renderer's discarded parse-env is safe for footnotes.** `markdown-it-footnote`'s `footnote_tail` core rule appends the footnote section during `md.parse` (same env), and the renderer rules read each token's `meta`, so rendering each block group with a fresh `env` still produces correct numbering/back-links. Verified by the integration tests; re-check if a future plugin relies on a shared render-time `env`.
* **`html_inline` / `html_block` injection is unaffected by `html: false`.** markdown-it's renderer emits these token types verbatim regardless of the parser's `html` option (same pattern callouts already use), so the disabled checkbox markup is injected without enabling raw HTML anywhere else.
* **The four added required config fields are safe.** `MarkStudioConfig` is built host-side by `ConfigurationService.read` (never a partial literal); `isMarkStudioConfig` now enforces all four, so a malformed payload is dropped at the boundary.

---

## 7. Technical Debt Introduced

* **Task-list checkboxes do not write back to the source.** They are rendered `disabled`; clicking does nothing. Interactive toggling (preview → source edit) is a Phase 4-style follow-up. Intentional, recorded in ADR-0019.
* **`markdown-it-footnote` ships no types**, so `@types/markdown-it-footnote` is a devDependency that must track the plugin version.
* **Carried over from earlier sessions:** wiki links don't navigate yet (T-3.4, Phase 4); the wiki-link / callout-title labels aren't re-parsed as inline Markdown; Mermaid live re-theme (T-3.2); always-bundled KaTeX cost (T-3.1); `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None for development.** The Sprint-1 step-0 blocker (the uncommitted Phase 2.5/3 batch) is **cleared** — T-2.2/3.1/3.2/3.3/3.4 are committed and pushed to `origin/main` (`b5546d7`), and the formatting fix `d79a58f` is the local `main` HEAD this branch is based on.
* **Awaiting QA + Producer:** T-3.5 is on `feature/sprint-1` and must be **QA-signed-off** (`docs/qa/sprint-1-signoff.md`) and **merged by the Producer** (regular merge, never squash/rebase). The dev team does **not** merge.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — production webview **2,025.3 KB → 2,041.4 KB (+16.1 KB)** for the footnote plugin + task-list rule + CSS (KaTeX still dominates; Mermaid stays in its own lazy bundle), host ≈ unchanged
* [x] `npm test` passes — **132 tests** (93 unit + 39 integration, `node:test`)
* [x] `npm run test:exthost` passes — 4 Extension Host lifecycle tests
* [ ] **Manual verification in an Extension Development Host (F5)** — **not yet done.** Verify in **dark / light / high-contrast**: a footnote ref + back-linked definitions section; task-list items render as **disabled** checkboxes with correct checked/unchecked state and aligned text; GFM tables render bordered; `~~text~~` renders struck through; and toggling each of `markstudio.preview.{footnotes,taskLists,tables,strikethrough}` off degrades live (literal `[^1]` / `[ ]` / `~~` text, plain-text table) without a reload.
* [ ] Manual verification done in dark theme — pending the F5 run above
* [ ] Manual verification done in light theme — pending the F5 run above
* [ ] Manual verification done in high-contrast theme — pending the F5 run above
* [x] Webview is not recreated on tab switch (unchanged this session; `retainContextWhenHidden`)
* [x] CodeMirror state preserved on tab switch (unchanged this session)
* [x] Preview patches DOM (block-diff patching unchanged; all four features ride the same render path)
* [ ] **CI run on GitHub — pending** (branch not pushed yet; CI runs on push/PR)

---

## 10. Recommended Next Task

* **Task:** After T-3.5 is merged, begin **Phase 4 — Knowledge Management** with **M4.1 — Backlinks panel**, or first wire the wiki-link **resolver** (navigation for the `[[…]]` anchors T-3.4 already emits).
* **Why this one:** Phase 3 is complete; Phase 4 is next per [ROADMAP.md](ROADMAP.md).
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) — Phase 4 scope
  * `src/webview/preview/wikiLinks.ts` — the anchors + `data-*` the resolver will consume
* **Definition of done for the wiki-link resolver:** `[[note]]` anchors resolve to workspace `.md` files and navigate on click; unresolved links are visibly distinct; tests added; pipeline + CI green.

---

## 11. Open Questions for the Next Agent

* **Should the task-list checkboxes become interactive (write-back to source)?** Currently read-only (ADR-0019). This is the natural Phase 4-style follow-up if users expect to toggle from the preview.
* **Should the wiki-link / callout-title / task-item labels render inline Markdown?** They are currently plain/escaped text. Small follow-ups if desired.
* **A preview toolbar/Codicon control for the Phase 3 toggles?** All Phase 3 features are settings-only; a discoverability follow-up, consistent with "less UI is better."
* **Base for the PR:** `feature/sprint-1` is off local `main` `d79a58f` (one commit ahead of `origin/main` `b5546d7`). The PR diff includes the whitespace-only reformat of `callouts.ts` / `wikiLinks.ts` (§1 housekeeping) — flag for QA if a clean diff is preferred.
