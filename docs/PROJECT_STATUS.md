# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 2 — Editing Quality, started.** Phase 1 — Editing Core is complete.
* **Current milestone:** **T-2.4 — Word count & reading-time indicator (M2.4) Done.** A native VS Code status-bar item now shows the live word count for the active MarkStudio editor (e.g. `$(book) 1,234 words`), with a tooltip breaking out words · characters · estimated reading time (~200 wpm). The count is computed entirely host-side from the document the provider already owns (ADR-0001) — no webview message, DOM, or custom chrome, per "prefer VS Code integration; less UI is better." This is the first feature implemented as a Phase 2 item (scroll sync, M2.1, was delivered early during Phase 1 as T-2.1).
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: ~40% by milestone (M2.1 scroll sync + M2.4 word count done; M2.2 outline, M2.3 search & replace, M2.5 word-wrap toggle / multi-cursor remain).
* **Last updated:** 2026-06-27 by the T-2.4 session
* **Last commit on `main`:** *(repository is under git; changes from this session are uncommitted)*

---

## 2. Current Focus

* **Active initiative:** **Phase 2 — Editing Quality.** T-2.4 lands the word-count + reading-time status-bar indicator. New host-side `src/status/wordCount.ts` holds the pure `computeDocumentStats` (words/characters/reading minutes); new `src/status/WordCountStatusBar.ts` owns the `StatusBarItem`, shows it only while a MarkStudio editor is active, and re-counts on edits with a 250 ms debounce so typing never blocks on the count for a large file. `MarkStudioEditorProvider` gained active-document tracking (parallel to its existing active-controller tracking) and a new `onDidChangeActiveDocument` event; `src/extension.ts` wires the indicator to it. **No new dependency, no protocol change, no webview/bundle-size change.**
* **Owner (current agent):** T-2.4 session
* **Started:** 2026-06-27
* **Target outcome:** Begin Phase 2; the next milestone is in-editor search & replace (M2.3 / T-2.3) or the document outline (M2.2 / T-2.2) — see [TODO.md](TODO.md).

---

## 3. Completed Features

User-visible features that are shipped and stable.

| Feature | Phase | Shipped in |
| ------- | ----- | ---------- |
| MarkStudio registered as a custom editor for `.md` | 0 | Unreleased (T-101) |
| Two-way document editing via `WorkspaceEdit` (dirty state, undo/redo, save, revert) | 0 | Unreleased (T-102) |
| Typed message protocol with boundary validation | 0 | Unreleased (T-103) |
| CodeMirror 6 source editor — single long-lived `EditorView`, Markdown grammar, history, search, multi-cursor, line wrap, theme-aware highlighting, diff-based edits | 1 | Unreleased (T-104) |
| Live Markdown preview (markdown-it) — single long-lived renderer; block-level incremental DOM patching; debounced; theme-keyed to `--vscode-*` variables | 1 | Unreleased (T-105) |
| App Shell with resizable split + layout modes — draggable gutter, `split` / `editor-only` / `preview-only`, per-webview `splitRatio` + `layoutMode` persistence, three command-palette commands | 1 | Unreleased (T-106) |
| Codicon toolbar — three layout-mode buttons mounted inside the App Shell, themed through `--vscode-*` variables, keyboard-focusable | 1 | Unreleased (T-107) |
| Core commands and keybindings — **Open in MarkStudio**, **Toggle Preview**, **Toggle Split View**, **Focus Editor**, **Focus Preview**, with default keybindings scoped to MarkStudio editors | 1 | Unreleased (T-108) |
| View-state and layout persistence — CM6 cursor + scroll snapshot/restore via `vscode.setState()`; per-file last layout mode via a workspace `Memento` | 1 | Unreleased (T-109) |
| External file-change reconciliation — on-disk changes reconcile via the managed `TextDocument`; minimal-diff so the cursor is preserved (ADR-0009) | 1 | Unreleased (T-110) |
| Editor ⇄ preview scroll synchronisation (Phase 2 M2.1) | 1/2 | Unreleased (T-2.1) |
| Reactive configuration service — `markstudio.editor.lineNumbers` toggles the CM6 line-number gutter via a `Compartment` (ADR-0010) | 1 | Unreleased (T-111) |
| **Word count & reading-time status-bar indicator (Phase 2 M2.4)** — native status-bar item showing live word count for the active MarkStudio editor; tooltip adds characters + estimated reading time; computed host-side, debounced, no custom UI | 2 | Unreleased (T-2.4) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-2.4 closed)* | — | — | Phase 2 is underway; next is M2.3 (search & replace) or M2.2 (outline) |

---

## 5. Blockers

* **Blocker:** None.

---

## 6. Known Issues

| Issue | Severity | Workaround | Tracked in |
| ----- | -------- | ---------- | ---------- |
| Word count treats a run of script without spaces (e.g. CJK) as a single "word", so prose in those scripts is undercounted | Low | N/A — acceptable for an estimate; per-character CJK counting is a possible future refinement | T-2.4 follow-ups |
| Document outline (M2.2) is not yet implemented; VS Code's native Outline/breadcrumbs are driven by `activeTextEditor`, which is `undefined` for custom editors, so a plain `DocumentSymbolProvider` may not surface — needs a design decision | Expected | N/A — pending T-2.2 | T-2.2 |
| The Extension Host layer asserts only host-observable behaviour; webview-internal handshake, focus, and pixel/scroll geometry stay in the manual matrix | Expected | Manual verification in the EDH | T-113b / ADR-0013 follow-ups |
| Scroll sync anchors on per-block source lines; very tall blocks interpolate linearly, so panes can drift mid-block before re-aligning | Low | N/A — acceptable | T-2.1 follow-ups |
| `applyEdit` failure is silently logged on the host (no user-visible notification) | Low | N/A — a typed `error` message exists so a notification is a small follow-up | TODO (open question in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §11) |
| Markdown highlight in the source pane is intentionally minimal | Low | N/A — adequate for editing | T-104 ADR-0007 follow-ups |
| Preview disables raw HTML (`html: false`) | By design | Safer default; revisit only after an explicit Phase 3 security review | ADR-0008 follow-ups |

---

## 7. Technical Debt

* All three test layers (unit T-112, jsdom integration T-113, Extension Host T-113b), the CI pipeline (T-120), and the ESLint/Prettier gate (T-121) are in place.
* The `vscode` mock (`test/_mocks/vscode.ts`) must be kept in step with any new host API a unit under test starts using. `WordCountStatusBar` is glue over `vscode.window.createStatusBarItem` and is exercised manually / by the Extension Host layer rather than the mocked unit layer; only its pure `computeDocumentStats` is unit-tested.
* jsdom does no real layout, so the integration layer cannot assert pixel-measurement behaviour; those stay in the manual matrix / Extension Host layer.
* `applyEdit` failures are console-only; not surfaced as a VS Code notification.
* Layout / toggle / focus commands and the word-count indicator target only the **active** MarkStudio webview/document (tracked via `onDidChangeViewState`); a user with two side-by-side MarkStudio editors only drives the focused one. Acceptable for now.
* `StateStore` Memento entries accumulate forever (one key per opened file URI). Cheap individually; revisit at thousands of `.md` files.
* `editor` (the `MarkStudioEditor` from `createEditor`) is never `destroy()`-ed because the webview only ever has one editor for its lifetime. Acceptable today.

---

## 8. Health Checks

* [x] Build is green — `npm run build` produces `dist/extension.js` (18.4 KB dev / ~7 KB production-minified, +~0.3 KB for the status-bar wiring), `dist/webview.js` (~699.6 KB production-minified, **unchanged** — this feature is host-only), and the Codicons assets
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **61 tests** (53 unit + 8 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-2.4 — Word count & reading-time indicator** (first Phase 2 feature):
  * New pure `src/status/wordCount.ts` — `computeDocumentStats(text)` → `{ words, characters, readingMinutes }`; a "word" is a Unicode letter/number/mark run with internal apostrophes/hyphens, so Markdown punctuation is excluded; reading time is `ceil(words / 200)`, ≥ 1 min for any prose, 0 for empty.
  * New `src/status/WordCountStatusBar.ts` — owns a right-aligned `StatusBarItem`, shows it only while a MarkStudio editor is active, hides it otherwise, and re-counts on edits to the active document with a 250 ms debounce.
  * `MarkStudioEditorProvider` — added active-document tracking and a new `onDidChangeActiveDocument` event (the emitter is disposed via the registration disposable); `src/extension.ts` constructs the indicator and subscribes it to the event.
  * 11 new unit tests for `computeDocumentStats` (`test/status/wordCount.test.ts`).
  * Documentation pass: [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (Phase 2 → In progress; M2.1 + M2.4 → Done), [ARCHITECTURE.md](ARCHITECTURE.md) (new `src/status/` module), [TODO.md](TODO.md) (Phase 2 backlog seeded; T-2.4 → Done), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **No runtime dependency, no protocol change, no webview/bundle-size change.** `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (53 unit + 8 integration) are all green locally.

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 2 — Editing Quality**. The two strongest next candidates are **T-2.3 — In-editor search & replace** (M2.3; builds directly on the already-bundled `@codemirror/search`, fully webview-contained, low risk) or **T-2.2 — Document outline** (M2.2; higher value but needs an upfront design decision because VS Code's native Outline view does not surface for custom editors — see [TODO.md](TODO.md)).
* **Why:** Search & replace is the lowest-risk high-value next step; the outline is the headline Phase 2 exit criterion but warrants a design note first.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).

---

## 11. Links

* Vision: [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md)
* Philosophy: [.ai/CONTEXT.md](../.ai/CONTEXT.md)
* Workflow: [.ai/WORKFLOW.md](../.ai/WORKFLOW.md)
* Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
* Decisions: [DECISIONS.md](DECISIONS.md)
* Roadmap: [ROADMAP.md](ROADMAP.md)
* Features: [FEATURES.md](FEATURES.md)
* TODO: [TODO.md](TODO.md)
* Changelog: [CHANGELOG.md](CHANGELOG.md)
* Handoff: [AGENT_HANDOFF.md](AGENT_HANDOFF.md)
