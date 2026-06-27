# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 4 — Knowledge Management is UNDER WAY.** Phase 0, Phase 1 — Editing Core, Phase 2 — Editing Quality, and Phase 3 — Modern Markdown are all complete.
* **Current milestone:** **T-4.1 — Backlinks panel (M4.1) Done.** A native **`MarkStudio Backlinks`** tree view (Explorer container, visible only while a MarkStudio editor is active) lists every *other* workspace note that links to the active note via a wiki-link (`[[note]]`), one node per source note + linking line; clicking opens the source at the linking line. This is the first Phase 4 feature and also lands the **wiki-link resolver** deferred from Phase 3 (T-3.4 / ADR-0018). Implemented host-side, mirroring the Outline (ADR-0014): a new `src/links/` module with two **pure** units (`parseWikiTargets`, `linkIndex`/resolver) and a `LinkIndexService` that scans the workspace **asynchronously** (never blocking activation) and stays live via a **debounced `FileSystemWatcher`** with **incremental** per-file re-parse. Resolution is **case-insensitive basename**, path-qualified **relative-first**, ambiguous → all, no self-link; `#heading` captured but file-resolved. **No new dependency, no new setting, no webview/protocol change.**
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: 100%. Phase 3: 100%. **Phase 4: M4.1 done** (M4.2 hover preview, M4.3 transclusion, M4.4 graph view remain).
* **Last updated:** 2026-06-27 by the T-4.1 session
* **Last commit on `main`:** `d79a58f` *(T-4.1 work lives on the `feature/sprint-2` branch, not yet merged — awaits QA sign-off + Producer merge)*

---

## 2. Current Focus

* **Active initiative:** **Phase 4 — Knowledge Management.** T-4.1 (Backlinks panel) ships as a host-side `vscode.TreeDataProvider` (`src/links/BacklinksTreeProvider.ts` + `registerBacklinks.ts`) over a workspace `LinkIndexService`, backed by the pure `parseWikiTargets` + `linkIndex` resolver. **No new dependency, no new setting, no new message type, no webview structural change.**
* **Owner (current agent):** T-4.1 session (Sage)
* **Started:** 2026-06-27
* **Target outcome:** M4.1 is met. The next milestone is **M4.2 — Hover preview for links** ([ROADMAP.md](ROADMAP.md)) — see [TODO.md](TODO.md) and [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.

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
| **Backlinks panel (Phase 4 M4.1)** — native `MarkStudio Backlinks` tree view (Explorer container) listing every other workspace note that links to the active note via a wiki-link (`[[note]]`), one node per source note + linking line; clicking opens the source at the linking line. Backed by a host-side workspace link index (async, non-blocking scan + debounced `FileSystemWatcher` + incremental rebuild) and the wiki-link resolver deferred from Phase 3 (case-insensitive basename, path-qualified relative-first). No new dependency, no new setting, no webview/protocol change (ADR-0020) | 4 | Unreleased (T-4.1) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-4.1 closed; M4.1 done)* | — | — | The next milestone is M4.2 — Hover preview for links |

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
| Backlinks index wiki-links only (Markdown `[text](note.md)` links are not indexed); `#heading` is captured but grouped at the file level; path identity is the workspace-relative path, so identically-named files across roots of a multi-root workspace could collide on resolution | Low | N/A — acceptable for v1; Markdown-link backlinks (T-4.1a), in-preview navigation (T-4.1b), and heading-level backlinks (T-4.1c) are tracked follow-ups | T-4.1 / ADR-0020 |
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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, the separate `dist/mermaid.js`, the Codicons assets, and the KaTeX assets; the new `src/links/` backlinks module adds **+15.0 KB** to the host bundle (**~25.4 KB → ~40.4 KB**); the webview is unchanged (still ~2,041.4 KB; Mermaid lives in its own lazy bundle)
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **168 tests** (129 unit + 39 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately. CI runs all three layers on push/PR
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-4.1 — Backlinks panel** (Phase 4 milestone M4.1 — **opens Phase 4**; also lands the wiki-link resolver deferred from Phase 3):
  * `src/links/parseWikiTargets.ts` (new) — **pure** `parseWikiTargets(text): WikiTarget[]`. No `vscode`/DOM imports. Extracts `[[target]]` / `[[target|alias]]` / `[[target#heading]]` targets using the same T-3.4 syntax rules (close on the line, reject nested `[`/`]`); skips fenced code blocks, YAML front matter, and inline code spans; drops same-document `[[#heading]]` links.
  * `src/links/linkIndex.ts` (new) — **pure** `buildLinkIndex(notes): LinkIndex`, the reverse index + **resolver**. No `vscode`/fs imports. Case-insensitive basename matching, path-qualified relative-first then basename, ambiguous → all matches, no self-backlink, per-line dedupe, stable sort; `#heading` captured and carried but resolved to the file.
  * `src/links/LinkIndexService.ts` (new) — async batched `workspace.findFiles` + `fs.readFile` scan kicked off but **not awaited** (activation never blocks), a `FileSystemWatcher` on `**/*.md` (create/change/delete), a 250 ms debounce, incremental per-file re-parse, and an `onDidChangeIndex` event; maps path strings back to `vscode.Uri`.
  * `src/links/BacklinksTreeProvider.ts` (new) — `vscode.TreeDataProvider<ResolvedBacklink>`; flat node per source note + linking line; label = note name, description/tooltip = trimmed snippet + line; click runs `markstudio.backlinks.open`.
  * `src/links/registerBacklinks.ts` (new) — creates the service + `TreeView`, follows the active doc via `onDidChangeActiveDocument`, refreshes on `onDidChangeIndex`, registers the internal `markstudio.backlinks.open` command (opens the source in a text editor at the line). Returns one disposable.
  * `src/extension.ts` — `registerBacklinks(provider)` in `context.subscriptions`, alongside `registerOutline`.
  * `package.json` — contributes the `markstudio.backlinks` view under `contributes.views.explorer` (same `when` clause as the Outline). No new setting, no new dependency.
  * Tests: 41 new **pure, mock-free** unit tests — `test/links/parseWikiTargets.test.ts` (syntax + skipped regions + rejections) and `test/links/linkIndex.test.ts` (resolution rules, ambiguity, relative-first, no self-link, dedupe, ordering). Unit 93 → 129. The `vscode` mock was **not** touched (the service is host-API glue exercised manually / in the Extension Host layer, like `registerOutline`).
  * Documentation pass: [design/backlinks.md](design/backlinks.md) (new), **ADR-0020** in [DECISIONS.md](DECISIONS.md), [api/message-protocol.md](api/message-protocol.md) ("no change" note), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M4.1 → Done, Phase 4 → In progress), [TODO.md](TODO.md) (T-4.1 → Done + follow-ups T-4.1a/b/c), [ARCHITECTURE.md](ARCHITECTURE.md) (`src/links/` landed + host component rows), this file, [AGENT_HANDOFF.md](AGENT_HANDOFF.md), and [sprint-2/progress.md](sprint-2/progress.md).
  * **Decision (ADR-0020):** Host-side `TreeDataProvider` + a workspace link index behind an async, debounced `FileSystemWatcher`; case-insensitive basename resolver (path-qualified relative-first). A `FileSystemWatcher` **is** warranted here — the index must see files no editor has open — in deliberate contrast to ADR-0009, which left the *editor's* external-change detection to the managed `TextDocument`.
  * **No new dependency, no new setting, no new esbuild target, no new message type, no webview structural change.** Host bundle **~25.4 KB → ~40.4 KB** (+~15.0 KB). `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` (129 unit + 39 integration), and `npm run test:exthost` (4) are all green locally.

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
