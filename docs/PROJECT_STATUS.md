# PROJECT STATUS — 2026-06-30

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** **Phase 4 — Knowledge Management is COMPLETE.** Phase 0, Phase 1 — Editing Core, Phase 2 — Editing Quality, Phase 3 — Modern Markdown, and Phase 4 — Knowledge Management are all complete (M4.3 — transclusion was dropped from scope on 2026-06-30).
* **Current milestone:** **T-4.1a (Markdown-link backlinks) + T-4.1c (Heading-level backlinks) — SHIPPED on `feature/sprint-6`, pending PR + `--no-ff` merge to `main`** (Sprint 6, closes Phase 4; **316 unit + 65 integration + 13 exthost = 394 PASS**, every pre-Sprint-6 M4.1 / T-4.1b / M4.2 / M4.4 assertion intact). The Backlinks panel now surfaces backlinks for **both** link styles — wiki (`[[note]]`) and standard Markdown (`[label](./other.md)`) — with `$(symbol-reference)` vs `$(link)` icons, and promotes a `#heading` anchor on either style to the target heading's actual line via a description suffix `→ Heading` and a tooltip `→ Heading (line N)`. New pure extractor `src/links/parseMarkdownTargets.ts` mirrors `parseWikiTargets.ts` (full CommonMark inline-link grammar: balanced parens, angle-bracket destinations, optional `"title"`, backslash escapes; skips fences / YAML front matter / inline code; **explicit-path only** — no basename fallback, that's a wiki affordance; rejects external URLs, reference-style links, workspace-absolute `/`-prefixed paths, non-`.md` destinations, bare `#fragment` anchors). `LinkIndexService.extractLinks` runs both extractors per file and merges; wiki links keep their pre-Sprint-6 byte-for-byte shape (no `kind`, no `targetLine`) and Markdown links carry `kind: "markdown"`. `linkIndex.ts` widens `Backlink` with optional `kind?: "wiki" | "markdown"` and `targetLine?: number | null` — emitted only when they carry info; `null` distinguishes "lookup ran, heading not found" from `undefined` ("no lookup applied"). Heading-line resolution reuses the existing `findHeadingLine` from `src/outline/headings.ts` through a new per-build cache keyed `${targetPath}\u0000${heading}`, so a vault with many backlinks to the same heading runs the parser exactly once for that pair. `ParsedNote.text` is now optional and threaded through `LinkIndexService.indexFile` so the index can resolve anchors against the target's content during build (no new fetch, no new watcher). The graph view stays note-level (ADR-0023 unchanged) and **picks up the Markdown edges for free** because the same `Backlink` flow feeds `LinkIndex.allEdges()`. New **ADR-0024** + `docs/design/backlinks.md` v2 follow-ups section. Producer non-negotiables held: **no new dependency, no new setting, no new command, no new message**; widen — not refactor — `NoteLink`; Markdown-link resolution is explicit-path only; heading-level granularity stays in the index + Backlinks panel only (graph stays note-level); every existing M4.1 / T-4.1b / M4.2 / M4.4 test passes unchanged. Bundle delta: `dist/extension.js` 65.5 → 74.9 kB (+9.4 kB; +7.9 kB Phase B for the CommonMark grammar, +1.5 kB Phase C for the heading-line cache + per-record `composeBacklink` widening); webview / mermaid / graph bundles unchanged. +59 new tests: +33 unit (`parseMarkdownTargets`) + +16 unit (linkIndex integration + heading promotion) + +10 integration-style (`backlinksTreeProvider`)
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: 100%. Phase 2: 100%. Phase 3: 100%. **Phase 4: 100%** (M4.1 + T-4.1b + M4.2 + M4.4 merged to `main`; T-4.1a + T-4.1c shipped on `feature/sprint-6`, pending merge; M4.3 transclusion dropped from scope).
* **Most recently shipped:** **T-4.1a + T-4.1c — Backlinks v2 (Sprint 6, `feature/sprint-6`, 5 commits, pending PR + merge).** See `docs/sprint-6/done.md` and `docs/qa/sprint-6-signoff.md`. Gate green: **316 unit + 65 integration + 13 exthost = 394, 0 fail**. New ADR-0024.
* **Last updated:** 2026-06-30 by the dev team (Nova, Sage, Milo) — Sprint 6 T-4.1a + T-4.1c shipped on `feature/sprint-6` (Phases A → E complete)
* **Last commit on `feature/sprint-6`:** `bcc3edf` *(test(links): Backlinks tree pipeline coverage — Phase D)*. Branch is 5 commits ahead of `main` (Sprint 5 already merged).

---

## 2. Current Focus

* **Active initiative:** **Phase 4 — Knowledge Management is closed.** Every milestone shipped: M4.1 (Backlinks panel, T-4.1), T-4.1a (Markdown-link backlinks, Sprint 6), T-4.1b (in-preview wiki-link navigation), T-4.1c (Heading-level backlinks, Sprint 6), M4.2 (Hover preview), and **M4.4 (Graph view)** — the Sprint 6 follow-ups (T-4.1a + T-4.1c) are pending merge from `feature/sprint-6`. M4.3 — transclusion was dropped from scope. The next focus is **Phase 5 — Authoring Workflows** (templates / snippets / daily notes / workspace note features); see [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.
* **Owner (this sprint):** the dev team (Nova — UI, Sage — host model + service, Milo — visual polish); tests Ivy; QA: Ivy + Producer F5
* **Started:** Sprint 6 executed 2026-06-30
* **Target outcome:** T-4.1a + T-4.1c ✅ shipped on `feature/sprint-6` (394 tests green; every pre-Sprint-6 M4.1 / T-4.1b / M4.2 / M4.4 assertion intact); pending PR + `--no-ff` merge. Next: **Phase 5 kickoff** — see [TODO.md](TODO.md) and [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.

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
| **In-preview wiki-link navigation (Phase 4, T-4.1b)** — clicking a rendered wiki-link (`[[note]]` / `[[note|alias]]` / `[[note#heading]]`) in the preview opens the target note in an editor and reveals the heading line. A delegated click listener on the persistent preview pane posts a typed `openWikiLink` webview → host message; the host resolves through the **shared M4.1 index** (so panel + click-nav resolve identically — basename, relative-first, open-first on ambiguity), opens with `showTextDocument`, and reveals the heading via `findHeadingLine`. Existing-notes-only (unresolved → status-bar message); gated by the existing `markstudio.preview.wikiLinks` toggle. No new dependency, setting, or command (ADR-0021) | 4 | Unreleased (T-4.1b, merged `011901e`) |
| **Hover preview for links (Phase 4, M4.2)** — hovering a rendered wiki-link in the preview shows, after a short dwell, a floating card previewing the target note (top of note, or the `#heading` section). A delegated `pointerover`/`pointerout` pair posts a typed `requestLinkPreview` webview → host message; the host resolves through the **same** M4.1 resolver (open-first), reads a capped excerpt (≤ 60 lines / ≤ 2,000 chars) via the pure `linkExcerpt`, and replies with `linkPreviewContent` carrying **Markdown text** (not HTML), which the webview renders with the existing renderer (`html: false`) into a hover-widget-themed card. Stale replies dropped; unresolved → quiet "No note found" card; dismiss on leave/scroll/click/Escape. No new dependency, setting, or command (ADR-0022) | 4 | Unreleased (M4.2, merged `8bf1a86`) |
| **Graph view (Phase 4, M4.4)** — `MarkStudio: Show Graph` command + editor title-bar action open an interactive workspace-wide graph of every note (circle) and every wiki-link (edge): pan, wheel-zoom around cursor, drag-pin, hover → 1-hop neighbour highlight, click to open the target **in MarkStudio** (PR #4 handshake), Escape resets. A free-standing `vscode.WebviewPanel` (`retainContextWhenHidden`) owned by the host posts a typed `graphData` message built by a pure `graphModel` over a new pure `LinkIndex.allEdges()` getter; clicks come back as `openGraphNode` and route through `provider.openInMarkStudio`. The webview is a lazy 4th esbuild bundle (`dist/graph.js`, 19.3 kB; mirrors Mermaid) with a hand-rolled Fruchterman–Reingold simulation + Canvas2D + DOM labels — **zero new runtime dependencies** (d3-force / cytoscape.js / vis-network all rejected). Wiki-link only in v1 (ADR-0023) | 4 | Unreleased (M4.4, `feature/sprint-5` pending merge) |

For details, see [FEATURES.md](FEATURES.md).

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| **M4.4 — Graph view** | Implemented on `feature/sprint-5` (Phases A → E); 335 tests green; human F5 ✅; perf trace median 100 fps ✅; QA signed off; pending PR + `--no-ff` merge | Sage + Nova | After merge: **Phase 5 — Authoring Workflows** (templates / snippets / daily notes / workspace note features). Two carry-over Phase 4 follow-ups remain: T-4.1a (Markdown-link edges) and T-4.1c (heading-level edges) |

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
| Hover preview is a **static snapshot** taken at hover time (no live update while the target changes), previews the **first** match on an ambiguous basename, does not preview a link nested inside a hover card, and the excerpt cap truncates very large sections; the feature is preview-pane only (no CodeMirror source-pane hover) | Low | N/A — acceptable for v1; live updates, nested hover, source-pane hover, and an optional `linkHoverPreview` setting / excerpt cache are tracked ADR-0022 follow-ups | M4.2 / ADR-0022 |
| Graph view uses **O(N²) repulsion** in its force simulation (hand-rolled, no Barnes–Hut yet), only renders **wiki-link** edges (Markdown-link edges T-4.1a and heading-level edges T-4.1c are deferred), and does **not** persist drag-pinned node positions across panel close/open or sessions; there is no setting to disable or tune the graph | Low | N/A — acceptable for v1; perf trace on the working vault shows median 100 fps. A Barnes–Hut quadtree, `Memento`-backed position persistence, and the deferred edge sources are tracked ADR-0023 follow-ups | M4.4 / ADR-0023 |
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

* [x] Build is green — `npm run build` produces `dist/extension.js`, `dist/webview.js`, the separate `dist/mermaid.js`, the new lazy **`dist/graph.js` (19.3 kB)**, the Codicons assets, and the KaTeX assets; M4.4 adds **+8 kB** to the host bundle (**~57.5 kB → ~65.5 kB**) for the graph model + service; the preview webview is unchanged
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **322 tests** (257 unit + 65 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, **13 tests**) runs separately. CI runs all three layers on push/PR. **335 tests, 0 fail.**
* [x] Lint is green — `npm run lint` (ESLint `--max-warnings 0` + `prettier --check .`) clean
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **M4.4 — Graph view** (Phase 4 final milestone; the workspace-wide visualisation of the wiki-link graph the M4.1 index has been building since Sprint 3):
  * `src/links/linkIndex.ts` — new `GraphEdge` type + **pure** `allEdges()` getter; (from, to) dedup with weight summed in the same build pass; deterministic ASCII-codepoint key (not `localeCompare` — that's locale-dependent and surfaced as a real bug during Phase B).
  * `src/links/LinkIndexService.ts` — four new thin getters: `getNotePaths()`, `getEdges()`, `uriFor(path)`, `pathFor(uri)`. Used only by `GraphService`; the backlinks panel + click-nav path is untouched.
  * `src/graph/graphModel.ts` (new, **pure**) — `buildGraph(paths, edges, currentPath)`: deterministic ASCII sort, defensive self-edge + unknown-endpoint drops, weight ≤ 0 → 1.
  * `src/graph/GraphService.ts` (new) — owns the single `vscode.WebviewPanel` (`retainContextWhenHidden: true`). Subscribes to `LinkIndexService.onDidChangeIndex` (debounced 250 ms) and `provider.onDidChangeActiveDocument` (immediate); posts `graphData` over the boundary-guarded `MessageBus`. Handles `openGraphNode { path }` by routing through `provider.openInMarkStudio(uri, 0)` — the **PR #4 pending-reveal handshake**, never `showTextDocument`. `coerceWebviewToHostMessage` exported for the boundary-guard test suite.
  * `src/graph/webviewHtml.ts` (new) — strict-CSP HTML scaffold.
  * `src/messaging/messages.ts` — new `GraphDataMessage` (H → W) + `OpenGraphNodeMessage` (W → H); both added to the unions and the boundary guards.
  * `src/extension.ts` — wired `GraphService`; exposed on the `MarkStudioExtensionApi` for exthost tests.
  * `package.json` — `markstudio.graph.show` command + editor title-bar entry under `menus.editor/title`, `group: navigation@99`, `when: activeCustomEditorId == 'markstudio.editor'`, icon `$(type-hierarchy)`.
  * `src/webview/graph/forceSimulation.ts` (new, pure) — hand-rolled 2D Fruchterman–Reingold: repulsion + Hookean spring + centre gravity + damping + per-step displacement cap. Deterministic FNV-1a `seedPosition` — no `Math.random`. Kinetic-energy stopping criterion; RAF self-stops.
  * `src/webview/graph/render.ts` (new) — Canvas2D body + DOM labels. Every frame samples live `--vscode-*` tokens via `getComputedStyle` (`readThemeTokens`) so the graph reacts to theme switches without host wiring. Native HiDPI via `devicePixelRatio`. `pickNode` inverts the view transform for hit-testing.
  * `src/webview/graph/main.ts` (new) — RAF loop, merge-by-path on `graphData` (known nodes keep positions, new nodes seed at a hashed angle, removed nodes drop), drag-pin / pan / wheel-zoom around the cursor / hover → 1-hop neighbour highlight / Escape resets the view.
  * `esbuild.js` — 4th lazy target: `src/webview/graph/main.ts` → `dist/graph.js` (**19.3 kB**). Mirrors the Mermaid pattern from ADR-0016 — users who never open the graph download zero bytes.
  * Tests: unit **199 → 257** (+58 — 7 `allEdges` + 18 `graphModel` + 9 messaging guards + 13 `forceSimulation` + 11 `coerceWebviewToHostMessage`), integration 65, exthost **9 → 13** (graph-view suite — open command, refresh on index change, refresh on active-doc change, click-to-open routes through `openInMarkStudio`). Lint, both typechecks, and the build all green.
  * Perf trace (`Trace-20260630T183914.json.gz`, initial F5): **median 9.99 ms / 100 fps**, p95 ≈ 20 ms / 50 fps, only **1.9 %** of frames > 33 ms. Two long tasks (~340 ms each) are panel-open boot only — bundle parse + the 60-step warm-up. **Far exceeds the design-doc budget (60 fps @ 200 / > 30 fps @ 1k).**
  * Documentation pass: [design/graph-view.md](design/graph-view.md) (new), **ADR-0023** in [DECISIONS.md](DECISIONS.md), both messages in [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (Phase 4 → Done), [TODO.md](TODO.md) (M4.4 → Done), [ARCHITECTURE.md](ARCHITECTURE.md), this file, [AGENT_HANDOFF.md](AGENT_HANDOFF.md), [sprint-5/plan.md](sprint-5/plan.md), [sprint-5/progress.md](sprint-5/progress.md), [sprint-5/done.md](sprint-5/done.md), and [qa/sprint-5-signoff.md](qa/sprint-5-signoff.md).
  * **Decision (ADR-0023):** **zero new runtime dependencies** (d3-force / cytoscape.js / vis-network all rejected). Host model is **pure**; webview ships as a **lazy 4th esbuild bundle**; click-to-open **must** route through `provider.openInMarkStudio` (PR #4 handshake — the non-negotiable lesson from ADR-0021). Wiki-link only in v1; T-4.1a and T-4.1c deferred. No new setting.
  * **One new contributed command + one editor title-bar menu entry. No new runtime dependency. No new setting.** Host bundle **~57.5 kB → ~65.5 kB** (+8 kB); preview webview unchanged; new lazy `dist/graph.js` 19.3 kB. **Not merged** — lives on `feature/sprint-5`, pending PR + the Producer `--no-ff` merge.

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-5` (post QA sign-off — already written), **Phase 4 is closed** and the next focus is **Phase 5 — Authoring Workflows** (templates / snippets / daily notes / workspace note features per [ROADMAP.md](ROADMAP.md)). The two carry-over Phase 4 follow-ups — **T-4.1a Markdown-link backlinks** and **T-4.1c heading-level backlinks** — are still open and can slot in as smaller sprints whenever they best fit (they are resolver-backed and the graph will pick them up for free once they land in `LinkIndex.allEdges()`).
* **Why:** Phase 4 (Knowledge Management) is now complete; the remaining roadmap is Phase 5 + the two small follow-ups. Phase 5 templates / daily notes are user-facing authoring features that build on the now-stable PKM layer.
* **Before starting:** `feature/sprint-5` must be merged to `main` first. M4.4 is implemented + tested + QA-signed-off but **not merged** — the Producer `--no-ff` merge comes first.
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
