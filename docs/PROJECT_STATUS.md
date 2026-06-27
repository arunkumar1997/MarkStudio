# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 2 — Editing Quality, in progress.** Phase 1 — Editing Core is complete.
* **Current milestone:** **T-2.5 — Word-wrap toggle & multiple cursors (M2.5) Done.** A new `markstudio.editor.wordWrap` setting (boolean, default `true`, `resource` scope) toggles soft-wrap in the source editor live via a CM6 `Compartment` — the same pattern T-111 established for line numbers — so the long-lived `EditorView` is reconfigured, never rebuilt. Multiple cursors needed no new code: they ship with the editor from T-104 (`allowMultipleSelections`, `drawSelection`, `rectangularSelection`, `crosshairCursor`). `MarkStudioConfig` gained a `wordWrap: boolean` field, validated by `isMarkStudioConfig`. No new dependency; only an added config field on the protocol.
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: ~80% by milestone (M2.1 scroll sync + M2.3 search & replace + M2.4 word count + M2.5 word-wrap/multi-cursor done; only M2.2 outline remains).
* **Last updated:** 2026-06-27 by the T-2.5 session
* **Last commit on `main`:** *(repository is under git; changes from this session are uncommitted)*

---

## 2. Current Focus

* **Active initiative:** **Phase 2 — Editing Quality.** T-2.5 lands the word-wrap toggle and confirms multiple cursors. `src/webview/editor/extensions.ts` moves the previously always-on `EditorView.lineWrapping` behind a new `wordWrapCompartment` (`wordWrapExtension(enabled)` returns `EditorView.lineWrapping` or `[]`), seeded from `config.wordWrap` in `buildExtensions`; `createEditor.setConfig` reconfigures it alongside the line-numbers compartment in a single dispatch. `MarkStudioConfig` + `isMarkStudioConfig` + `ConfigurationService.read` + `package.json` gained the `wordWrap` field/property. **No new dependency, no protocol-shape change beyond the added config field, no host structural change.**
* **Owner (current agent):** T-2.5 session
* **Started:** 2026-06-27
* **Target outcome:** The one remaining Phase 2 milestone is the document outline (M2.2 / T-2.2), which needs an upfront design decision — see [TODO.md](TODO.md).

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
| **Word-wrap toggle & multiple cursors (Phase 2 M2.5)** — `markstudio.editor.wordWrap` (default on) toggles soft-wrap live via a CM6 `Compartment`; multi-cursor / rectangular selection (Alt+click, Ctrl/Cmd+click, Alt+drag) ship with the editor | 2 | Unreleased (T-2.5) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-2.5 closed)* | — | — | Phase 2 is underway; the only remaining milestone is M2.2 (outline, needs a design note) |

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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, and the Codicons assets; production-minified webview is **~701.5 KB** (≈ unchanged — word wrap was already bundled, now compartment-wrapped), host bundle unchanged
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **63 tests** (55 unit + 8 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-2.5 — Word-wrap toggle & multiple cursors** (Phase 2 milestone M2.5):
  * `src/webview/editor/extensions.ts` — moved the previously always-on `EditorView.lineWrapping` behind a new exported `wordWrapCompartment` + `wordWrapExtension(enabled)` (returns `EditorView.lineWrapping` or an empty `[]`), seeded from `config.wordWrap` in `buildExtensions`.
  * `src/webview/editor/createEditor.ts` — `setConfig` now reconfigures the line-numbers and word-wrap compartments together in a single `view.dispatch`.
  * `src/messaging/messages.ts` — `MarkStudioConfig` gained `wordWrap: boolean`; `isMarkStudioConfig` validates it.
  * `src/services/ConfigurationService.ts` + `package.json` — resolve / contribute `markstudio.editor.wordWrap` (boolean, default `true`, `resource` scope).
  * **Multiple cursors:** confirmed — already provided by the editor since T-104 (`allowMultipleSelections`, `drawSelection`, `rectangularSelection`, `crosshairCursor`); no new code.
  * Tests updated for the new config field (`ConfigurationService.test.ts`, `messages.test.ts`, integration `createEditor.test.ts`); 2 new `wordWrap` unit tests.
  * Documentation pass: [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md) (Word wrap & multiple cursors → Shipped), [ROADMAP.md](ROADMAP.md) (M2.5 → Done), [TODO.md](TODO.md) (T-2.5 → Done), [api/message-protocol.md](api/message-protocol.md), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **No new dependency, no protocol-shape change beyond the added config field, no host structural change.** `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (55 unit + 8 integration) are all green locally.

---

## 10. Recommended Next Task

* **Task:** Complete **Phase 2 — Editing Quality** with **T-2.2 — Document outline** (M2.2), the last remaining Phase 2 milestone and the headline exit criterion.
* **Why:** It is the only Phase 2 milestone left. It needs an upfront design decision first because VS Code's native Outline view / breadcrumbs are driven by `vscode.window.activeTextEditor`, which is `undefined` while a custom editor is focused, so a plain `DocumentSymbolProvider` may not surface for MarkStudio. Decide between a host-side `TreeDataProvider` (view container) and an in-webview outline pane — capture it in [design/](design/) and likely an ADR before coding.
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
