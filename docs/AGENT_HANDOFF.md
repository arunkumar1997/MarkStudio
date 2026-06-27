# AGENT HANDOFF — T-2.4 Word count & reading-time indicator (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-2.4 session
* **Working branch:** `main` (repository is under git; changes from this session are uncommitted)
* **Last commit on this branch:** *(changes are uncommitted)*
* **Prompt used:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md) (Feature)

---

## 1. What Was Completed

**Began Phase 2 — Editing Quality** by implementing **T-2.4 — Word count & reading-time indicator** (milestone M2.4). A native VS Code status-bar item now shows the live word count for the active MarkStudio editor, with a tooltip that adds character count and an estimated reading time. The whole feature is **host-side** — it reads the document the provider already owns (ADR-0001), so there is no webview message, DOM work, or custom chrome. This follows the project philosophy "prefer VS Code integration; less UI is better."

* **`src/status/wordCount.ts` (new, pure).** `computeDocumentStats(text)` → `{ words, characters, readingMinutes }`. A "word" is a run matching `/[\p{L}\p{N}\p{M}]+(?:['’-][\p{L}\p{N}\p{M}]+)*/gu` — Unicode letters/numbers/marks with internal apostrophes or hyphens — so Markdown punctuation (`#`, `*`, `[`, backticks, …) is naturally excluded. `characters` is the raw string length; `readingMinutes` is `ceil(words / 200)`, clamped to ≥ 1 for any prose and 0 for empty text. No `vscode`/DOM import, so it is unit-tested directly (ADR-0011).
* **`src/status/WordCountStatusBar.ts` (new, VS Code glue).** Owns a right-aligned `StatusBarItem` (`vscode.window.createStatusBarItem("markstudio.wordCount", Right, 100)`). `setActiveDocument(doc | null)` switches the document it reflects and renders immediately; `null` hides the item. It listens to `workspace.onDidChangeTextDocument` and re-renders (250 ms debounce) only when the **active** document changes, so typing never blocks on the count for a large file. Text is `$(book) <n> words`; tooltip is `<words> words · <chars> characters · <mins> min read`.
* **`src/editor/MarkStudioEditorProvider.ts` (edited).** Added active-**document** tracking parallel to the existing active-**controller** tracking: a private `activeDocument` field, a private `activeDocumentEmitter` (`vscode.EventEmitter<vscode.TextDocument | null>`), a public `onDidChangeActiveDocument` event, a public `getActiveDocument()`, and a private `setActiveDocument()` that fires only on change. `resolveCustomTextEditor` now sets/clears both the controller and the document through local `activate()` / `deactivateIfCurrent()` helpers (wired into `webviewPanel.active`, `onDidChangeViewState`, and `onDidDispose`). `register()` now combines the custom-editor registration and the emitter into one disposable via `vscode.Disposable.from`.
* **`src/extension.ts` (edited).** Constructs `WordCountStatusBar`, seeds it with `provider.getActiveDocument()`, and subscribes it to `provider.onDidChangeActiveDocument`; the item and the subscription join `context.subscriptions`.
* **`test/status/wordCount.test.ts` (new).** 11 unit tests covering empty/whitespace, space- and newline-separated words, contractions/hyphenated words, Markdown-punctuation exclusion, numbers-as-words, character count, and reading-time rounding/scaling.
* **Documentation pass:** [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md) (word count → Shipped), [ROADMAP.md](ROADMAP.md) (Phase 2 → In progress; M2.1 + M2.4 → Done), [ARCHITECTURE.md](ARCHITECTURE.md) (new `src/status/` module + host-component row), [TODO.md](TODO.md) (Phase 2 backlog seeded with T-2.2 / T-2.3 / T-2.5; T-2.4 → Done), [PROJECT_STATUS.md](PROJECT_STATUS.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-2.4 is complete and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (53 unit + 8 integration).
* **Note on verification:** The CI pipeline (incl. the `lint` step) has not run on a real GitHub runner because this session's changes are uncommitted/unpushed; it invokes the same locally-green commands. **A manual run in an Extension Development Host (F5) to eyeball the status-bar item is the one outstanding verification** (see §9).

---

## 3. Remaining Work for This Initiative

Phase 2 — Editing Quality is **in progress**. Done so far: M2.1 scroll sync (T-2.1, early) and M2.4 word count (T-2.4). Remaining milestones, seeded as tasks in [TODO.md](TODO.md):

* **T-2.2 — Document outline (M2.2).** The headline Phase 2 exit criterion. **Needs a design decision first:** VS Code's native Outline view / breadcrumbs are driven by `vscode.window.activeTextEditor`, which is `undefined` while a custom editor is focused, so a plain `DocumentSymbolProvider` likely won't surface for MarkStudio. Choose a host-side `TreeDataProvider` (view container) or an in-webview outline pane.
* **T-2.3 — In-editor search & replace (M2.3).** Built on the already-bundled `@codemirror/search`; webview-contained; theme to `--vscode-*`.
* **T-2.5 — Word-wrap toggle and multiple cursors (M2.5).** A wrap toggle (likely a new `markstudio.*` setting via the `Compartment` pattern from T-111) plus confirmed multi-cursor support.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/status/wordCount.ts` | **Added** | Pure `computeDocumentStats` (no `vscode`/DOM) |
| `src/status/WordCountStatusBar.ts` | **Added** | `StatusBarItem` glue; debounced re-count; show/hide on active doc |
| `src/editor/MarkStudioEditorProvider.ts` | Edited | Active-document tracking + `onDidChangeActiveDocument` event; emitter disposed via `register()` |
| `src/extension.ts` | Edited | Constructs + wires the status-bar indicator |
| `test/status/wordCount.test.ts` | **Added** | 11 unit tests for `computeDocumentStats` |
| `docs/CHANGELOG.md` | Edited | New T-2.4 Added entry |
| `docs/FEATURES.md` | Edited | Word count → Shipped |
| `docs/ROADMAP.md` | Edited | Phase 2 → In progress; M2.1 + M2.4 → Done |
| `docs/ARCHITECTURE.md` | Edited | New `src/status/` module + host-component row |
| `docs/TODO.md` | Edited | Phase 2 backlog seeded; T-2.4 → Done |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-2.4; Phase 2 started |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Status-bar item over a webview indicator.** A native `StatusBarItem` is the most VS Code-integrated surface for ambient document stats and adds no custom chrome — directly serving "less UI is better" and "native beats custom."
* **Host-side computation.** The host already owns the document text, so the count is computed there; no new message crosses the bus. This keeps the protocol unchanged and the webview untouched (bundle size unchanged).
* **No ADR.** This is a feature using existing APIs with no new dependency and no structural rule change — consistent with how earlier tooling/feature-only steps were handled. The active-document event is a small, natural extension of the provider's existing active-controller tracking.
* **Word definition.** A Unicode letter/number/mark run (with internal apostrophes/hyphens). This excludes Markdown punctuation cleanly and is simple/predictable. The known trade-off: scripts without spaces (e.g. CJK) count as one word per run — documented as a low-severity known issue.
* **Debounce on re-count, immediate on focus change.** Re-counting on every keystroke for a large file is wasteful, so edits debounce at 250 ms (matching the cursor/scroll snapshot debounce from T-109); switching the active document renders immediately so the count is correct the moment focus lands.

---

## 6. Assumptions Made

* **VS Code ≥ 1.85** (per `engines`) supports the id-overload of `createStatusBarItem` — true.
* **The provider's active-editor tracking is the right signal.** The status bar should reflect exactly the MarkStudio editor that has focus; when none is active, it hides. Normal (non-MarkStudio) text editors have no MarkStudio word-count item, which is intentional.
* **`text.length` is an acceptable "characters" metric.** It counts UTF-16 units including whitespace/newlines, matching typical editor counters; astral characters count as 2. Acceptable for an estimate.

---

## 7. Technical Debt Introduced

* **`WordCountStatusBar` is not unit-tested directly** (only its pure `computeDocumentStats` is). It is thin glue over `vscode.window.createStatusBarItem`; covering it would require extending the `vscode` mock with a `StatusBarItem`. Deferred — the Extension Host layer (T-113b) is the natural place to assert host-observable status-bar behaviour if needed.
* **CJK / space-less scripts undercount** (one "word" per unbroken run) — low-severity known issue.
* **Carried over from earlier sessions:** `applyEdit` / `error` / `StateStore.update` failures are still console-only; layout / toggle / focus commands and the word-count indicator target only the active webview; `Open in MarkStudio` not on the `editor/title` context menu; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); Extension Host CI is Linux-only (`xvfb`); the CI pipeline has not yet run on GitHub.

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* None.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run test:unit` — **53 unit tests pass** on `node:test` (11 new for `computeDocumentStats`)
* [x] `npm run test:integration` — **8 integration tests pass** on `node:test` under jsdom
* [x] `npm test` — type-check + **61 tests** green end-to-end
* [x] `npm run build` is green; host bundle +~0.3 KB, **webview bundle unchanged** (host-only feature)
* [ ] **Manual run in an Extension Development Host (F5) — not yet done.** Eyeball: the `$(book) N words` item appears at the bottom-right when a MarkStudio editor is focused, updates as you type, shows the tooltip on hover, and **hides** when you switch to a non-MarkStudio editor or close the MarkStudio tab.
* [ ] **CI run on GitHub — not yet executed** (changes uncommitted/unpushed).

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 2 — Editing Quality** with **T-2.3 — In-editor search & replace** (M2.3) as the lowest-risk high-value next step, or **T-2.2 — Document outline** (M2.2) if you first write the design note it needs.
* **Why T-2.3 first:** `@codemirror/search` is already a dependency and partly wired (T-104), the work is fully webview-contained, and it is a daily-writing comfort win with no host/protocol changes. **Why T-2.2 needs care:** VS Code's native Outline view does not surface for custom editors, so it requires a design decision (host `TreeDataProvider` vs. in-webview pane) before coding — capture it in [design/](design/) and likely an ADR.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) — Phase 2 scope and exit criteria
  * [TODO.md](TODO.md) — T-2.2 / T-2.3 / T-2.5 details
  * [ARCHITECTURE.md](ARCHITECTURE.md) — the webview/editor seams (`webview/editor/extensions.ts`) and host services
* **Definition of done:** depends on the chosen task; keep `npm run lint` + `npm test` + CI green as the standing bar.

---

## 11. Open Questions for the Next Agent

* **Outline surface (T-2.2):** host-side `TreeDataProvider` in a view container, or an in-webview outline pane? This is the key design call before implementing M2.2.
* **A `markstudio.statusBar.wordCount` toggle?** The indicator is always-on while a MarkStudio editor is active. If users want it off, add a boolean setting via the `MarkStudioConfig` + `ConfigurationService` pattern (T-111). Deferred to keep T-2.4 focused.
* **Surface inbound `error` / `applyEdit` / `StateStore.update` failures via `vscode.window.showErrorMessage`?** Still a small follow-up carried from T-103…T-113.
* **Next `markstudio.*` settings?** Word-wrap toggle (T-2.5), font size/family overrides, and preview options remain natural extensions of `MarkStudioConfig` + the compartment pattern.
* **Cross-OS CI matrix?** `extension-host-tests` is Linux-only (needs `xvfb`); add a Windows/macOS matrix entry if host behaviour ever diverges by OS.
