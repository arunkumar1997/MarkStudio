# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 2 — Editing Quality, in progress.** Phase 1 — Editing Core is complete.
* **Current milestone:** **T-2.3 — In-editor search & replace (M2.3) Done.** CodeMirror's find/replace panel is now wired into the source editor (`search({ top: true })`) and themed to the VS Code find widget entirely through `--vscode-*` variables. `Ctrl/Cmd+F` opens find; the panel's replace field and checkboxes drive replace, match-case, regexp, and whole-word; `Enter`/`F3` step through matches. The feature is fully webview-contained — no host code, no protocol change, no new dependency (`@codemirror/search` has been bundled since T-104).
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: ~60% by milestone (M2.1 scroll sync + M2.3 search & replace + M2.4 word count done; M2.2 outline and M2.5 word-wrap toggle / multi-cursor remain).
* **Last updated:** 2026-06-27 by the T-2.3 session
* **Last commit on `main`:** *(repository is under git; changes from this session are uncommitted)*

---

## 2. Current Focus

* **Active initiative:** **Phase 2 — Editing Quality.** T-2.3 lands in-editor search & replace. `src/webview/editor/extensions.ts` adds the `search({ top: true })` extension (the panel mounts at the top, mirroring VS Code's find widget) alongside the already-bound `searchKeymap`, and extends the editor theme with find-panel selectors (`.cm-panels`, `.cm-panel.cm-search` inputs/buttons/close) keyed to `--vscode-editorWidget-*`, `--vscode-input-*`, `--vscode-button-secondary*`, and `--vscode-focusBorder`. **No new dependency, no protocol change, no host change.**
* **Owner (current agent):** T-2.3 session
* **Started:** 2026-06-27
* **Target outcome:** The remaining Phase 2 milestones are the document outline (M2.2 / T-2.2 — needs a design decision) and the word-wrap toggle / multiple cursors (M2.5 / T-2.5) — see [TODO.md](TODO.md).

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
| **In-editor search & replace (Phase 2 M2.3)** — CodeMirror find/replace panel mounted at the top of the editor; `Ctrl/Cmd+F` to find, replace field + match-case / regexp / whole-word checkboxes; themed entirely to the VS Code find widget via `--vscode-*` variables | 2 | Unreleased (T-2.3) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-2.3 closed)* | — | — | Phase 2 is underway; next is M2.2 (outline, needs a design note) or M2.5 (word-wrap toggle / multi-cursor) |

---

## 5. Blockers

* **Blocker:** None.

---

## 6. Known Issues

| Issue | Severity | Workaround | Tracked in |
| ----- | -------- | ---------- | ---------- |
| The find panel is keyboard-driven only; there is no toolbar/Codicon button to open it yet | Low | `Ctrl/Cmd+F` while the editor is focused | T-2.3 follow-ups / Toolbar (T-107) |
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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, and the Codicons assets; production-minified webview is **~701.4 KB** (+~2 KB for the search panel + theming), host bundle **unchanged** (webview-only feature)
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **61 tests** (53 unit + 8 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-2.3 — In-editor search & replace** (Phase 2 milestone M2.3):
  * `src/webview/editor/extensions.ts` — added `search({ top: true })` so the CodeMirror find/replace panel mounts at the top of the editor (mirroring VS Code's find widget); the already-bound `searchKeymap` activates it (`Ctrl/Cmd+F`, `F3`, etc.).
  * Extended the editor theme with find-panel selectors (`.cm-panels`, `.cm-panel.cm-search` text inputs, buttons, and the close affordance) keyed entirely to `--vscode-editorWidget-*`, `--vscode-input-*`, `--vscode-button-secondary*`, and `--vscode-focusBorder`, so the panel is theme-correct in light/dark/high-contrast (ADR-0004).
  * Documentation pass: [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md) (Search & replace → Shipped), [ROADMAP.md](ROADMAP.md) (M2.3 → Done), [TODO.md](TODO.md) (T-2.3 → Done), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **No runtime dependency, no protocol change, no host change.** `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (53 unit + 8 integration) are all green locally.

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 2 — Editing Quality**. The two remaining milestones are **T-2.5 — Word-wrap toggle and multiple cursors** (M2.5; small, low-risk — a new `markstudio.*` setting via the `Compartment` pattern from T-111 plus confirming multi-cursor) or **T-2.2 — Document outline** (M2.2; the headline Phase 2 exit criterion, but it needs an upfront design decision because VS Code's native Outline view does not surface for custom editors).
* **Why:** T-2.5 is the lowest-risk next step and reuses the established settings/compartment pattern; T-2.2 is higher value but warrants a design note (host `TreeDataProvider` vs. in-webview pane) and likely an ADR first.
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
