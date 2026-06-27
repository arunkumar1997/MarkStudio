# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 3 — Modern Markdown is COMPLETE.** Phase 0, Phase 1 — Editing Core, and Phase 2 — Editing Quality are also complete. The next phase is **Phase 4 — Knowledge Management**.
* **Current milestone:** **T-3.5 — Footnotes & GFM completeness (M3.5) Done.** Footnotes (`[^1]` refs + `[^1]:` defs), GFM task lists (`- [ ]` / `- [x]`, rendered as **disabled** read-only checkboxes), GFM tables, and strikethrough (`~~text~~`) now render in the live preview, **each individually toggleable** via its own `markstudio.preview.*` setting (all default on) and degrading gracefully when off (ADR-0019). Per-feature sourcing: tables + strikethrough use markdown-it's **built-in** rulers (toggled via `md.disable`), task lists are a **dependency-free** in-tree core rule (`src/webview/preview/taskLists.ts`), and footnotes use the one new runtime dependency, **`markdown-it-footnote`**. Threaded through the `MarkStudioConfig` + `configChanged` seam (T-111) and the `PreviewRenderer.setConfig` rebuild pattern (rebuild only when a flag flips — ADR-0008). Themed entirely via `--vscode-*` variables. **One new runtime dependency, four new settings, no new message type, no webview structural change. This closes Phase 3.**
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: 100%. **Phase 3: 100%** (M3.1 math + M3.2 mermaid + M3.3 callouts + M3.4 wiki links + M3.5 footnotes/GFM all done).
* **Last updated:** 2026-06-27 by the T-3.5 session
* **Last commit on `main`:** `d79a58f` *(T-3.5 work lives on the `feature/sprint-1` branch, not yet merged — awaits QA sign-off + Producer merge)*

---

## 2. Current Focus

* **Active initiative:** **Phase 3 — Modern Markdown.** T-3.4 (Wiki-style links) attaches as a dependency-free markdown-it inline rule in `src/webview/preview/wikiLinks.ts`, applied from `PreviewRenderer.createMarkdownIt`, behind the `MarkStudioConfig.wikiLinks` flag and the existing `configChanged` seam (T-111). **No new dependency, one new setting, no new esbuild target, no new message type, no webview structural change.**
* **Owner (current agent):** T-3.4 session
* **Started:** 2026-06-27
* **Target outcome:** M3.4 is met. The next milestone is **M3.5 — Footnotes & GFM completeness** ([ROADMAP.md](ROADMAP.md)) — see [TODO.md](TODO.md) and [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.

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
| **Document outline (Phase 2 M2.2)** — navigable heading outline in a native `MarkStudio Outline` tree view (Explorer container) that follows the active editor and rebuilds as headings change; clicking a heading scrolls the editor to it. Headings parsed host-side (ATX + setext, skipping code fences / front matter); navigation via a `revealLine` message (ADR-0014) | 2 | Unreleased (T-2.2) |
| **Math rendering (Phase 3 M3.1)** — inline (`$…$`) and block (`$$…$$`) math rendered in the preview with KaTeX via `@vscode/markdown-it-katex`; toggleable through `markstudio.preview.math` (default on) and degrading to literal text when off; KaTeX CSS + fonts shipped locally under the existing CSP (ADR-0015) | 3 | Unreleased (T-3.1) |
| **Mermaid diagrams (Phase 3 M3.2)** — fenced ```mermaid blocks rendered as diagrams in the preview with Mermaid; toggleable through `markstudio.preview.mermaid` (default on) and degrading to a plain code block when off; the library is **lazy-loaded on first use** from a separate bundle so the base webview is essentially unchanged (ADR-0016) | 3 | Unreleased (T-3.2) |
| **Callouts / admonitions (Phase 3 M3.3)** — GitHub-style callout blockquotes (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) rendered as themed boxes with a Codicon icon + title in the preview via a dependency-free markdown-it core rule; toggleable through `markstudio.preview.callouts` (default on) and degrading to an ordinary blockquote when off; themed entirely via `--vscode-*` variables (ADR-0017) | 3 | Unreleased (T-3.3) |
| **Wiki-style links (Phase 3 M3.4)** — `[[note]]`, `[[note|alias]]`, and `[[note#heading]]` rendered as styled links in the preview via a dependency-free markdown-it inline rule; toggleable through `markstudio.preview.wikiLinks` (default on) and degrading to literal text when off; themed via `--vscode-*` variables; resolution to real files deferred to Phase 4 (ADR-0018) | 3 | Unreleased (T-3.4) |
| **Footnotes & GFM completeness (Phase 3 M3.5)** — footnotes (`[^1]` refs + `[^1]:` defs), GFM task lists (`- [ ]` / `- [x]`, rendered as **disabled** read-only checkboxes), GFM tables, and strikethrough (`~~text~~`) rendered in the preview, **each individually toggleable** through its own `markstudio.preview.*` setting (all default on) and degrading gracefully when off; footnotes via `markdown-it-footnote`, task lists via a dependency-free core rule, tables + strikethrough via markdown-it's built-ins; themed via `--vscode-*` variables (ADR-0019). **Closes Phase 3.** | 3 | Unreleased (T-3.5) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-3.5 closed; Phase 3 complete)* | — | — | The next phase is Phase 4 — Knowledge Management |

---

## 5. Blockers

* **Blocker:** None.

---

## 6. Known Issues

| Issue | Severity | Workaround | Tracked in |
| ----- | -------- | ---------- | ---------- |
| Mermaid's theme is detected once when the library loads; a live VS Code theme switch does not re-theme already-rendered diagrams until the next edit | Low | Edit the document (or reopen) after switching theme | T-3.2 follow-ups / ADR-0016 |
| The find panel is keyboard-driven only; there is no toolbar/Codicon button to open it yet | Low | `Ctrl/Cmd+F` while the editor is focused | T-2.3 follow-ups / Toolbar (T-107) |
| Word count treats a run of script without spaces (e.g. CJK) as a single "word", so prose in those scripts is undercounted | Low | N/A — acceptable for an estimate; per-character CJK counting is a possible future refinement | T-2.4 follow-ups |
| The document outline shows the raw source text of a heading (inline Markdown like `**bold**` is not stripped) and follows only the active MarkStudio editor | Low | N/A — acceptable for v1; inline-text rendering is a possible refinement | T-2.2 follow-ups |
| The Extension Host layer asserts only host-observable behaviour; webview-internal handshake, focus, and pixel/scroll geometry stay in the manual matrix | Expected | Manual verification in the EDH | T-113b / ADR-0013 follow-ups |
| Scroll sync anchors on per-block source lines; very tall blocks interpolate linearly, so panes can drift mid-block before re-aligning | Low | N/A — acceptable | T-2.1 follow-ups |
| `applyEdit` failure is silently logged on the host (no user-visible notification) | Low | N/A — a typed `error` message exists so a notification is a small follow-up | TODO (open question in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §11) |
| Markdown highlight in the source pane is intentionally minimal | Low | N/A — adequate for editing | T-104 ADR-0007 follow-ups |
| Preview disables raw HTML (`html: false`) | By design | Safer default; revisit only after an explicit Phase 3 security review | ADR-0008 follow-ups |

---

## 7. Technical Debt

* All three test layers (unit T-112, jsdom integration T-113, Extension Host T-113b), the CI pipeline (T-120), and the ESLint/Prettier gate (T-121) are in place.
* The `vscode` mock (`test/_mocks/vscode.ts`) must be kept in step with any new host API a unit under test starts using. `WordCountStatusBar` is glue over `vscode.window.createStatusBarItem` and is exercised manually / by the Extension Host layer rather than the mocked unit layer; only its pure `computeDocumentStats` is unit-tested.
* jsdom does no real layout, so the integration layer cannot assert pixel-measurement behaviour and cannot run Mermaid; those stay in the manual matrix. For diagrams the integration layer asserts only the markdown-it seam (placeholder emission, code-block fallback, live toggle).
* `applyEdit` failures are console-only; not surfaced as a VS Code notification.
* Layout / toggle / focus commands and the word-count indicator target only the **active** MarkStudio webview/document (tracked via `onDidChangeViewState`); a user with two side-by-side MarkStudio editors only drives the focused one. Acceptable for now.
* `StateStore` Memento entries accumulate forever (one key per opened file URI). Cheap individually; revisit at thousands of `.md` files.
* `editor` (the `MarkStudioEditor` from `createEditor`) is never `destroy()`-ed because the webview only ever has one editor for its lifetime. Acceptable today.
* KaTeX is bundled into the webview unconditionally (+~270 KB); the `markstudio.preview.math` toggle controls rendering, not bundling (ADR-0015). Mermaid, by contrast, is lazy-loaded from a separate bundle (ADR-0016) — the model KaTeX could adopt later if the always-bundled cost ever matters.
* Mermaid's theme is fixed at library-load time; a live theme switch re-themes diagrams only on the next edit (ADR-0016).

---

## 8. Health Checks

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, the separate `dist/mermaid.js`, the Codicons assets, and the KaTeX assets; the footnote plugin + task-list rule + CSS add **+16.1 KB** to the production webview (2,025.3 KB → 2,041.4 KB; Mermaid lives in its own lazy bundle), host bundle ≈ unchanged
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **132 tests** (93 unit + 39 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-3.5 — Footnotes & GFM completeness** (Phase 3 milestone M3.5 — **closes Phase 3**):
  * `src/webview/preview/taskLists.ts` (new) — `applyTaskLists(md)` registers a dependency-free markdown-it **core rule** (`after("inline")`) that finds a list item opening with `[ ]` / `[x]` / `[X]`, prepends a **disabled** read-only `html_inline` checkbox, strips the marker, and stamps `markstudio-task-list` / `markstudio-task-list-item` classes. **No `import` of any new package.**
  * `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid, callouts, wikiLinks, footnotes, taskLists, tables, strikethrough)` wires footnotes (`md.use(markdownItFootnote)`), task lists (`applyTaskLists`), and toggles the built-in `table` / `strikethrough` rulers via `md.disable`; `setConfig` rebuilds when any preview flag flips.
  * `src/messaging/messages.ts` — `MarkStudioConfig` gained `footnotes` / `taskLists` / `tables` / `strikethrough`; `isMarkStudioConfig` validates them.
  * `src/services/ConfigurationService.ts` — `read` resolves the four `preview.*` keys (default `true`).
  * `src/webview/main.ts` — themed footnote refs/backrefs, the task-list checkbox, and `<s>`/`<del>` driven entirely by `--vscode-*` variables (tables were already themed).
  * `package.json` — contributes the four `markstudio.preview.*` settings (boolean, default `true`, `resource` scope); adds `markdown-it-footnote` (runtime) + `@types/markdown-it-footnote` (dev).
  * Tests: 13 new integration tests in `test/integration/previewRenderer.test.ts` (footnotes 3, task lists 4, tables 3, strikethrough 3 — each renders when on, degrades when off, live `setConfig` toggle) + 8 new `ConfigurationService` cases; config fixtures updated for the four new fields across all four config-bearing test files. Unit 85 → 93, integration 26 → 39.
  * Documentation pass: [design/gfm.md](design/gfm.md) (new), **ADR-0019** in [DECISIONS.md](DECISIONS.md), [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M3.5 → Done **and Phase 3 → Done** with exit criteria checked), [TODO.md](TODO.md) (T-3.5 → Done), this file, [AGENT_HANDOFF.md](AGENT_HANDOFF.md), and [sprint-1/progress.md](sprint-1/progress.md).
  * **Decision (ADR-0019):** Sourcing is per-feature — markdown-it's built-ins for tables/strikethrough (no dependency), a dependency-free in-tree core rule for task lists, and the canonical `markdown-it-footnote` plugin (the one genuinely non-trivial feature) for footnotes.
  * **One new runtime dependency** (`markdown-it-footnote`), four new settings, no new esbuild target, no new message type, no webview structural change. `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (93 unit + 39 integration) are all green locally.
  * **Housekeeping:** `callouts.ts` and `wikiLinks.ts` were reformatted to 2-space indent to satisfy `prettier --check` (they had drifted to 4-space in local commit `d79a58f`); whitespace-only, no behavioural change.

---

## 10. Recommended Next Task

* **Task:** Begin **Phase 4 — Knowledge Management** ([ROADMAP.md](ROADMAP.md)) — the first milestone is **M4.1 — Backlinks panel**. A natural first step is to wire the Phase 4 wiki-link **resolver** (T-3.4 already emits `data-wikilink-target` / `data-wikilink-heading` on each anchor with no `href`) so `[[note]]` links resolve to real files and navigate.
* **Why:** Phase 3 — Modern Markdown is complete (M3.1–M3.5 all done); Phase 4 is next per the roadmap.
* **Before starting:** T-3.5 lives on `feature/sprint-1` and must be QA-signed-off and merged by the Producer first (see [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §8–9).
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
