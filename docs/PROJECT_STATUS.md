# PROJECT STATUS — 2026-06-28

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 4 — Knowledge Management is UNDER WAY.** Phase 0, Phase 1 — Editing Core, Phase 2 — Editing Quality, and Phase 3 — Modern Markdown are all complete.
* **Current milestone:** **T-4.1b — In-preview wiki-link navigation Done on `feature/sprint-3`** (Sprint 3, awaiting QA sign-off + Producer merge). The wiki-links the preview renders (T-3.4) are now **clickable**: clicking `[[note]]` / `[[note|alias]]` / `[[note#heading]]` in the preview opens the target note in an editor (revealing the heading line when present) — the in-document counterpart to the M4.1 Backlinks panel. One **delegated** click listener on the persistent preview pane posts a new typed **`openWikiLink`** webview → host message; the host resolves through the **shared M4.1 index** (a new pure `LinkIndex.resolveForward` + `LinkIndexService.resolveTarget`) so the panel and click-navigation resolve identically, and reveals the heading via a new pure `findHeadingLine`. A single `LinkIndexService` is now **hoisted to `extension.ts`** and injected into both registrations. Producer policy: existing-notes-only (unresolved → transient status-bar message), open-first on ambiguity, **no new setting** (gated by `markstudio.preview.wikiLinks`). **No new dependency, no new setting, no new command.** (ADR-0021.) M4.1 — Backlinks panel (T-4.1) remains merged to `main` (merge `79369f2`).
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: 100%. Phase 3: 100%. **Phase 4: M4.1 done + T-4.1b done (unmerged)** (M4.2 hover preview, M4.3 transclusion, M4.4 graph view remain).
* **Last updated:** 2026-06-28 by the Dev Team (Sage + Nova) — T-4.1b implementation + docs
* **Last commit on `main`:** `14cccd7` *(Sprint 3 planning; T-4.1 merged via `--no-ff` merge `79369f2`). T-4.1b work lives on `feature/sprint-3`, not yet merged — Producer merges after QA sign-off.*

---

## 2. Current Focus

* **Active initiative:** **Phase 4 — Knowledge Management.** M4.1 (Backlinks panel, T-4.1) is merged; **T-4.1b (in-preview wiki-link navigation)** is implemented + tested on `feature/sprint-3`, awaiting QA sign-off and the Producer merge. The next milestone after merge is **M4.2 — Hover preview for links** (also resolver-backed).
* **Owner (this sprint):** Sage (host resolver + messaging) + Nova (webview click handler); QA: Ivy
* **Started:** Sprint 3 executed 2026-06-28
* **Target outcome:** T-4.1b merged after QA; then M4.2 hover preview. See [TODO.md](TODO.md) and [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.

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
| **Backlinks panel (Phase 4 M4.1)** — native `MarkStudio Backlinks` tree view (Explorer container) listing every other workspace note that links to the active note via a wiki-link (`[[note]]`), one node per source note + linking line; clicking opens the source at the linking line. Backed by a host-side workspace link index (async, non-blocking scan + debounced `FileSystemWatcher` + incremental rebuild) and the wiki-link resolver deferred from Phase 3 (case-insensitive basename, path-qualified relative-first). No new dependency, no new setting, no webview/protocol change (ADR-0020) | 4 | Unreleased (T-4.1, merged `79369f2`) |
| **In-preview wiki-link navigation (Phase 4, T-4.1b)** — clicking a rendered wiki-link (`[[note]]` / `[[note|alias]]` / `[[note#heading]]`) in the preview opens the target note in an editor and reveals the heading line. A delegated click listener on the persistent preview pane posts a typed `openWikiLink` webview → host message; the host resolves through the **shared M4.1 index** (so panel + click-nav resolve identically — basename, relative-first, open-first on ambiguity), opens with `showTextDocument`, and reveals the heading via `findHeadingLine`. Existing-notes-only (unresolved → status-bar message); gated by the existing `markstudio.preview.wikiLinks` toggle. No new dependency, setting, or command (ADR-0021) | 4 | Unreleased (T-4.1b, on `feature/sprint-3`) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| **T-4.1b — In-preview wiki-link navigation** | Implemented + tested on `feature/sprint-3`; awaiting QA sign-off + Producer merge | Sage / Nova | Manual EDH matrix (Phase 8) + QA sign-off (`docs/qa/sprint-3-signoff.md`) are post-push items; next roadmap milestone is M4.2 — Hover preview for links |

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
| Backlinks index wiki-links only (Markdown `[text](note.md)` links are not indexed); `#heading` is captured but grouped at the file level; path identity is the workspace-relative path, so identically-named files across roots of a multi-root workspace could collide on resolution | Low | N/A — acceptable for v1; Markdown-link backlinks (T-4.1a) and heading-level backlinks (T-4.1c) are tracked follow-ups | T-4.1 / ADR-0020 |
| In-preview wiki-link navigation opens the **first** match on an ambiguous basename (no quick-pick), only shows a transient status-bar message for an unresolved target (no click-to-create), does not navigate same-document `[[#heading]]` links, and `findHeadingLine` matches raw heading source so headings with inline Markdown (`## **Bold**`) are not found | Low | N/A — acceptable for v1; quick-pick disambiguation, click-to-create, same-doc heading nav, and slug-based matching are tracked ADR-0021 follow-ups | T-4.1b / ADR-0021 |
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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, the separate `dist/mermaid.js`, the Codicons assets, and the KaTeX assets; T-4.1b adds **+3.6 KB** to the host bundle (**~40.4 KB → ~44.0 KB**) for the shared resolver wiring + click handler; the webview seam is unchanged (still ~2,041.4 KB)
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **197 tests** (152 unit + 45 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-4.1b — In-preview wiki-link navigation** (Phase 4; makes the T-3.4 wiki-links clickable in the preview, reusing the M4.1 resolver):
  * `src/messaging/messages.ts` — new `OpenWikiLinkMessage` (`type: "openWikiLink"`, `target: string`, `heading: string | null`) added to the `WebviewToHostMessage` union, with a boundary-guard case in `isWebviewToHostMessage` (validates `target` is a string, `heading` is string-or-null). First webview-originated navigation message.
  * `src/links/linkIndex.ts` — new **pure** `LinkIndex.resolveForward(fromPath, target): string[]`, a public wrapper over the private `resolveTarget` the backlink build already used. Keeps the self-match (clicking `[[A]]` in A opens A), unlike the backlink build which drops self.
  * `src/links/LinkIndexService.ts` — new `resolveTarget(fromUri, target): vscode.Uri[]` URI wrapper around `resolveForward`.
  * `src/outline/headings.ts` — new **pure** `findHeadingLine(text, heading): number` (case-insensitive trimmed exact match on raw heading source; `-1` on miss), lives with the outline scanner.
  * `src/links/registerBacklinks.ts` — signature changed to `registerBacklinks(provider, service)`; the `LinkIndexService` is now **injected** rather than constructed/started internally.
  * `src/extension.ts` — creates the **single** `LinkIndexService`, calls `start()`, injects it into `register()` and `registerBacklinks()`, disposes via `context.subscriptions` — one workspace scan + one live index shared by the panel and click-navigation.
  * `src/editor/MarkStudioEditorProvider.ts` — takes the injected `linkIndexService`; adds the `openWikiLink` case to the message-bus switch + a private `async openWikiLink(fromUri, target, heading)` (resolve → open-first → `showTextDocument` → reveal heading via `findHeadingLine`; unresolved → `window.setStatusBarMessage(…, 4000)`).
  * `src/webview/preview/wikiLinkClick.ts` (new) — `registerWikiLinkClicks(previewRoot, bus)`: one **delegated** `click` listener on the persistent preview pane using `Element.closest('a.markstudio-wikilink')`, reading `data-wikilink-target` / `data-wikilink-heading`, `preventDefault()`, and posting `openWikiLink`.
  * `src/webview/main.ts` — mounts `registerWikiLinkClicks(shell.previewPane, bus)` after scroll-sync.
  * Tests: unit 132 → 152 (`resolveForward`, `findHeadingLine`, the `openWikiLink` guard), integration 39 → 45 (`test/integration/wikiLinkClick.test.ts` — the click → message seam), exthost 4 — all green; lint clean.
  * Documentation pass: [design/wiki-navigation.md](design/wiki-navigation.md) (new), **ADR-0021** in [DECISIONS.md](DECISIONS.md), `openWikiLink` in [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (T-4.1b under M4.1), [TODO.md](TODO.md) (T-4.1b → Done), [ARCHITECTURE.md](ARCHITECTURE.md), this file, [AGENT_HANDOFF.md](AGENT_HANDOFF.md), and [sprint-3/progress.md](sprint-3/progress.md).
  * **Decision (ADR-0021):** the webview delegates the click; the host resolves + navigates through **one** shared resolver (`resolveForward`) and **one** hoisted `LinkIndexService`. Producer policy: existing-notes-only, open-first on ambiguity, no quick-pick, no new setting (gated by `markstudio.preview.wikiLinks`).
  * **No new dependency, no new setting, no new command, no new esbuild target.** Host bundle **~40.4 KB → ~44.0 KB** (+~3.6 KB). `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` (152 unit + 45 integration), and `npm run test:exthost` (4) are all green locally.

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-3` (post QA sign-off), the next roadmap milestone is **M4.2 — Hover preview for links**: show a hover card with the target note's content/excerpt when hovering a wiki-link, reusing the same `src/links/` resolver. (The remaining Phase 4 follow-ups — **T-4.1a Markdown-link backlinks** and **T-4.1c heading-level backlinks** — are also resolver-backed and can slot in as smaller sprints.)
* **Why:** It is the natural continuation of the link-navigation work, reuses the now-shared resolver, and is the next listed M4.x milestone after backlinks + click-navigation.
* **Before starting:** `feature/sprint-3` must be merged to `main` first. T-4.1b is implemented + tested but **not merged** — QA sign-off (`docs/qa/sprint-3-signoff.md`) and the Producer `--no-ff` merge come first.
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
