# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 3 — Modern Markdown is in progress.** Phase 0, Phase 1 — Editing Core, and Phase 2 — Editing Quality are complete.
* **Current milestone:** **T-3.4 — Wiki-style links (M3.4) Done.** Wiki-style links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`) now render as styled links in the preview, gated behind a new `markstudio.preview.wikiLinks` setting (default on) and degrading to literal `[[…]]` text when off (ADR-0018). Implemented with **no new dependency** as a small markdown-it **inline rule** (`src/webview/preview/wikiLinks.ts`) registered before the built-in `link` rule: a `[[` opener is claimed before the ordinary `[link](url)` parser, parsed into target / alias / heading, and emitted as an `<a class="markstudio-wikilink">` carrying `data-wikilink-target` / `data-wikilink-heading`. Themed entirely via `--vscode-*` variables; resolution to real files is deferred to Phase 4. **No new dependency, one new setting, no new message type, no webview structural change.**
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: 100%. **Phase 3: ~80%** (M3.1 math + M3.2 mermaid + M3.3 callouts + M3.4 wiki links done; M3.5 footnotes/GFM remaining).
* **Last updated:** 2026-06-27 by the T-3.4 session
* **Last commit on `main`:** *(repository is under git; changes from this session are uncommitted)*

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

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-3.4 closed)* | — | — | Phase 3 M3.4 is complete; the next milestone is M3.5 — Footnotes & GFM completeness |

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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, the separate `dist/mermaid.js`, the Codicons assets, and the KaTeX assets; the wiki-link inline rule + CSS add only a few KB over T-3.3 (Mermaid lives in its own lazy bundle), host bundle ≈ unchanged
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **111 tests** (85 unit + 26 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-3.4 — Wiki-style links** (Phase 3 milestone M3.4):
  * `src/webview/preview/wikiLinks.ts` (new) — `applyWikiLinks(md)` registers a markdown-it **inline rule** before the built-in `link` rule: a `[[` opener is claimed before the ordinary `[link](url)` parser, scanned to its `]]`, rejected if it contains a newline or nested `[`/`]`, then parsed into target / alias / heading and pushed as a `wikilink_open` (`a`) token carrying `class="markstudio-wikilink"`, `data-wikilink-target`, an optional `data-wikilink-heading`, and a `title` tooltip, a `text` token for the label, and a `wikilink_close`. **No `import` of any new package.**
  * `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid, callouts, wikiLinks)` applies the rule when on; `setConfig` rebuilds when any preview flag flips.
  * `src/messaging/messages.ts` — `MarkStudioConfig` gained `wikiLinks: boolean`; `isMarkStudioConfig` validates it.
  * `src/services/ConfigurationService.ts` — `read` resolves `preview.wikiLinks` (default `true`).
  * `src/webview/main.ts` — themed `.markstudio-wikilink` styling driven entirely by `--vscode-*` variables (link colour + dashed underline, solid on hover).
  * `package.json` — contributes `markstudio.preview.wikiLinks` (boolean, default `true`, `resource` scope). No dependency added.
  * Tests: 6 new integration tests in `test/integration/previewRenderer.test.ts` (styled link with target when on, alias display text, captured heading, literal-text fallback when off, ordinary `[link](url)` untouched, live `setConfig` toggle) + 2 new `ConfigurationService` cases; config fixtures updated for the `wikiLinks` field across all four config-bearing test files. Unit 83 → 85, integration 20 → 26.
  * Documentation pass: [design/wiki-links.md](design/wiki-links.md) (new), **ADR-0018** in [DECISIONS.md](DECISIONS.md) (and the previously missing ADR-0017 index row was added), [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M3.4 → Done), [TODO.md](TODO.md) (T-3.4 → Done), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **Decision (ADR-0018):** Implement wiki links as a dependency-free markdown-it inline rule rather than pulling an npm plugin — the rule is ~60 lines and fully under our control, and resolution to real files is deferred to Phase 4.
  * **No new dependency**, one new setting, no new esbuild target, no new message type, no webview structural change. `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (85 unit + 26 integration) are all green locally.

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 3 — Modern Markdown** ([ROADMAP.md](ROADMAP.md)) with **M3.5 — Footnotes & GFM completeness** (T-3.5). Add footnotes, task lists, tables, and strikethrough via markdown-it plugins, each individually toggleable, reusing the `MarkStudioConfig` + `configChanged` seam (T-111) and the `PreviewRenderer.setConfig` rebuild pattern (T-3.1 / T-3.2 / T-3.3 / T-3.4).
* **Why:** M3.1–M3.4 are complete; M3.5 is the final Phase 3 milestone.
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
