# FEATURES

> The catalogue of what MarkStudio does and will do. Each entry has a **status**, the **phase** it belongs to ([ROADMAP.md](ROADMAP.md)), and a short rationale. Update this file in the same change that adds, removes, or alters a feature.
>
> Status: `Shipped` · `In progress` · `Planned` · `Future`. Today, everything is `Planned` or `Future` — no code exists yet (see [PROJECT_STATUS.md](PROJECT_STATUS.md)).

---

## 1. Editing Core (Phase 1)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Custom Markdown editor | Shipped | Opens `.md` files in a native custom editor via the Custom Editor API (T-101). |
| Single persistent webview | Shipped | One retained webview per editor; `retainContextWhenHidden: true`; never recreated on tab switch (T-101). |
| CodeMirror 6 source editing | Shipped | Single long-lived `EditorView` with Markdown syntax, history (undo/redo), search, multiple cursors, line wrap, bracket matching, and theme-aware highlighting via `--vscode-*` variables (T-104). |
| Live preview (markdown-it) | Shipped | Single long-lived markdown-it instance renders the document and **patches** only the changed top-level blocks on every keystroke; debounced; raw HTML disabled (T-105). |
| Layout modes | Shipped | Resizable split (draggable gutter, min 160 px per pane, double-click to reset to 50/50), editor-only, and preview-only modes (T-106); per-file layout mode is stored host-side via `Memento` (T-109) and wins over the webview cache so the user's preference survives reloads, not just tab switches. Switched via the `MarkStudio: Show …` commands; the renderers are never unmounted. |
| Document lifecycle | Shipped | Dirty state, save/revert, undo/redo via `vscode.WorkspaceEdit` (T-102) — minimal diff edits from CodeMirror integrate with VS Code's undo stack (T-104). |
| External-change reconciliation | Shipped | On-disk changes (revert, `git pull`, another editor's save, an external formatter) reconcile through VS Code's managed `TextDocument` + `onDidChangeTextDocument`; the webview applies the new text as a **minimal diff** (common prefix/suffix trimmed) so the cursor is preserved when the edit is elsewhere (T-110, ADR-0009). |
| View-state persistence | Shipped | CodeMirror cursor (anchor + head) and scroll position snapshot/restore via `vscode.setState()` (T-109, debounced 250 ms); split ratio + last layout mode persist alongside them (T-106). Per-file last layout mode also survives full extension reloads via a workspace `Memento` (`StateStore`, T-109). |
| Core commands | Shipped | Layout commands (T-106): `MarkStudio: Show Editor and Preview`, `Show Editor Only`, `Show Preview Only`. Convenience commands (T-108): `Open in MarkStudio`, `Toggle Preview`, `Toggle Split View`, `Focus Editor`, `Focus Preview`. Default keybindings — `Ctrl+K V` (toggle preview), `Ctrl+K Ctrl+V` (toggle split), `Ctrl+K Ctrl+E` (focus editor), `Ctrl+K Ctrl+R` (focus preview) — are gated to MarkStudio editors. |
| Toolbar (Codicons) | In progress | Three layout-mode buttons shipped in the App Shell toolbar (T-107) — source-only, split, preview-only. Word wrap and search buttons land alongside their underlying features (T-2.x). The document outline ships as a native tree view rather than a toolbar button (T-2.2). |
| Theme integration | Shipped | All styling from `--vscode-*` variables; correct in light, dark, and high contrast (T-104 — verified in EDH outstanding). |
| Scroll synchronization | Shipped | In split mode, scrolling either pane scrolls the other to the matching Markdown block; preview blocks are anchored to source lines via the markdown-it token map and interpolated for smooth alignment, with per-direction feedback suppression (T-2.1). |
| Configuration / settings | Shipped | `markstudio.*` settings are read reactively host-side (`ConfigurationService`) and applied live without a reload. Settings: `markstudio.editor.lineNumbers` (default on) toggles the CodeMirror line-number gutter (T-111, ADR-0010); `markstudio.editor.wordWrap` (default on) toggles soft-wrap (T-2.5) — each via a CM6 `Compartment`; `markstudio.preview.math` (default on) toggles KaTeX math rendering in the preview (T-3.1, ADR-0015); `markstudio.preview.mermaid` (default on) toggles Mermaid diagram rendering (T-3.2, ADR-0016); `markstudio.preview.callouts` (default on) toggles callout/admonition rendering (T-3.3, ADR-0017); `markstudio.preview.wikiLinks` (default on) toggles wiki-style `[[…]]` link rendering (T-3.4, ADR-0018); `markstudio.preview.footnotes` / `markstudio.preview.taskLists` / `markstudio.preview.tables` / `markstudio.preview.strikethrough` (all default on) toggle footnote, task-list, table, and strikethrough rendering (T-3.5, ADR-0019). Future options extend `MarkStudioConfig` + the `configChanged` message. |

---

## 2. Editing Quality (Phase 2)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Scroll synchronization | Shipped | Editor and preview scroll positions stay aligned, both directions (T-2.1; delivered early during Phase 1). |
| Document outline | Shipped | Navigable heading outline in a native tree view (`MarkStudio Outline`, Explorer container) that follows the active MarkStudio editor and rebuilds as headings change; clicking a heading scrolls the editor to it. Headings are parsed host-side (ATX + setext, skipping fenced code blocks and YAML front matter); navigation is a `revealLine` message (T-2.2, ADR-0014). |
| Search & replace | Shipped | In-editor find/replace built on CodeMirror's `@codemirror/search`: the panel mounts at the top (like VS Code's find widget), opens with `Ctrl/Cmd+F`, supports replace, match-case, regexp, and whole-word, and is themed entirely via `--vscode-*` variables (T-2.3). |
| Word count & reading time | Shipped | Native status-bar indicator showing live word count for the active MarkStudio editor; tooltip adds characters and estimated reading time (~200 wpm). Computed host-side from the document; debounced; no custom UI (T-2.4). |
| Word wrap & multiple cursors | Shipped | `markstudio.editor.wordWrap` (default on) toggles soft-wrap live via a CM6 `Compartment`, mirroring the line-numbers pattern (T-2.5, T-111). Multiple cursors / rectangular selection ship with the editor: Alt+click adds a cursor, Ctrl/Cmd+click adds a selection, and Alt+drag makes a rectangular selection (T-104). |

---

## 3. Modern Markdown (Phase 3)

Each attaches as a CodeMirror 6 extension and/or markdown-it plugin and **degrades gracefully** when disabled.

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Math | Shipped | Inline (`$…$`) and block (`$$…$$`) math rendered with KaTeX in the preview; toggleable via `markstudio.preview.math` (default on) and degrades to literal text when off (T-3.1, ADR-0015). |
| Mermaid diagrams | Shipped | Fenced ```mermaid blocks render as diagrams in the preview; the Mermaid library is lazy-loaded on first use; toggleable via `markstudio.preview.mermaid` (default on) and degrades to a plain code block when off (T-3.2, ADR-0016). |
| Callouts / admonitions | Shipped | GitHub-style callout blockquotes (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) render as themed boxes with a Codicon icon + title in the preview; a dependency-free markdown-it core rule; toggleable via `markstudio.preview.callouts` (default on) and degrades to an ordinary blockquote when off (T-3.3, ADR-0017). |
| Wiki links | Shipped | Wiki-style links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`) render as styled links in the preview via a dependency-free markdown-it inline rule; toggleable via `markstudio.preview.wikiLinks` (default on) and degrades to literal text when off (T-3.4, ADR-0018). They are **clickable** in the preview — see *In-preview navigation* under Knowledge Management (T-4.1b). |
| Footnotes & full GFM | Shipped | Footnotes (`[^1]` refs + `[^1]:` defs), GFM task lists (`- [ ]` / `- [x]`, rendered as read-only disabled checkboxes), GFM tables, and strikethrough (`~~text~~`) render in the preview, **each individually toggleable** via `markstudio.preview.{footnotes,taskLists,tables,strikethrough}` (all default on) and degrading gracefully when off. Footnotes use `markdown-it-footnote`; task lists are a dependency-free core rule; tables + strikethrough use markdown-it's built-ins (T-3.5, ADR-0019). |

---

## 4. Knowledge Management (Phase 4)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Backlinks | Shipped | Native `MarkStudio Backlinks` tree view (Explorer container) listing every other workspace note that links to the active note via **either** a wiki-link (`[[note]]` / `[[note#Heading]]`) **or** a standard Markdown link (`[label](./other.md)` / `[label](./other.md#Heading)`), one node per source note + linking line; clicking opens the source **in MarkStudio** at the linking line (ADR-0021 amendment). Each row shows the kind via an icon — `$(symbol-reference)` for wiki, `$(link)` for Markdown — and, when the link carries a `#heading` anchor that resolves to a real heading in the target, the description gains a `→ Heading` suffix and the tooltip a `→ Heading (line N)` reference (T-4.1c). Backed by a host-side workspace link index — an async, non-blocking scan kept live by a debounced `FileSystemWatcher` — with two pure extractors (`parseWikiTargets` + `parseMarkdownTargets`) and the shared resolver (case-insensitive basename for wiki; explicit-path-only for Markdown — no basename fallback). Heading-line lookup reuses the existing `findHeadingLine` through a per-build cache; a phantom heading degrades silently to no suffix (T-4.1, T-4.1a, T-4.1c, ADR-0020, ADR-0024). |
| In-preview navigation | Shipped | Clicking a rendered wiki-link (`[[note]]` / `[[note|alias]]` / `[[note#heading]]`) **or** a standard markdown link (`[label](./Other.md)` / `[label](/docs/x.md)`, with or without a `#heading` fragment) in the preview opens the target note **in MarkStudio** and reveals the heading line. Wiki-link clicks post a typed `openWikiLink` message and the host resolves through the **same** M4.1 index (so backlinks and click-navigation resolve identically — basename, relative-first, open-first on ambiguity); standard markdown links post a separate `openMarkdownLink { href, target, heading }` message and the host resolves the path with plain URI math (`/` → workspace-absolute against the source's workspace folder; otherwise relative to the source's directory). Both paths open with `vscode.openWith` into the MarkStudio custom editor and reveal the line through the `revealLine` message (pending-reveal handshake — immediately when the target is already open, else once its webview reports `ready`). External URLs, modifier-held clicks, fragment-only links, and non-markdown extensions are left to the webview's default behaviour. Existing notes only — an unresolved target or failed open shows a transient status-bar message; the wiki-link path is gated by the existing `markstudio.preview.wikiLinks` toggle, the standard-markdown-link path is always on (T-4.1b, ADR-0021 amended + extended 2026-06-30). |
| Hover preview | Shipped | Hovering a rendered wiki-link (`[[note]]` / `[[note#heading]]`) in the preview shows, after a short dwell (~300 ms), a floating card previewing the target note — the top of the note, or the section under the heading. A delegated `pointerover`/`pointerout` pair on the persistent preview pane posts a typed `requestLinkPreview` webview → host message; the host resolves through the **same** M4.1 resolver as click-navigation (open-first on ambiguity), reads a capped excerpt (≤ 60 lines / ≤ 2,000 chars), and replies with `linkPreviewContent` carrying **Markdown text** (not HTML), which the webview renders with the existing renderer (`html: false` preserved) into a card themed with VS Code hover-widget tokens. An unresolved target shows a quiet "No note found" card; the card dismisses on pointer-leave, scroll, click, and Escape; gated by the existing `markstudio.preview.wikiLinks` toggle (M4.2, ADR-0022). |
| Graph view | Shipped | Workspace-wide interactive graph of every note (circle) and every link (edge) — both wiki and Markdown kinds — opened via the **`MarkStudio: Show Graph`** command or the editor title-bar action while a MarkStudio editor is active. Pan, wheel-zoom around the cursor, drag to pin a node, hover for a 1-hop neighbour highlight, click to open the target note **in MarkStudio** (routes through the same PR #4 pending-reveal handshake as click-navigation; ADR-0021 amendment), Escape resets the view. A free-standing `WebviewPanel` (`retainContextWhenHidden: true`) owned by the host — subscribed to `LinkIndexService.onDidChangeIndex` (debounced 250 ms) and `onDidChangeActiveDocument` — posts a typed `graphData { nodes, edges, currentPath }` message built by a pure host-side model over the shared M4.1 index; clicks come back as `openGraphNode { path }`. Sprint 6 (T-4.1a) widened the index to surface Markdown-link edges too, which the graph picks up for free; per-kind edge styling stays a deferred follow-up. The webview ships as a lazy 4th esbuild bundle (`dist/graph.js`, ~19 kB; mirrors the Mermaid pattern from ADR-0016) and contains a hand-rolled Fruchterman–Reingold simulation + Canvas2D body + DOM labels — **zero new runtime dependencies** (d3-force / cytoscape.js / vis-network all rejected). The graph stays note-level — heading-level edges are explicitly out of scope (ADR-0023 / ADR-0024). |

---

## 5. Authoring Workflows (Phase 5)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Templates | Shipped | Create a note from a reusable template via **`MarkStudio: New Note from Template`** — a native QuickPick of available templates → a title `InputBox` → the note is created and opened **in MarkStudio**. A template is a `.md` file with optional `---`-fenced front matter (`kind`, `description`, `output`, `cursor`) and a body of variables; the engine expands a **closed allowlist** (`{{date}}`/`{{time}}`/`{{datetime}}`/`{{title}}`/`{{slug}}`/`{{filename}}`/`{{cursor}}` and `$CURRENT_*`/`$TM_*`/`$WORKSPACE_NAME`/`$CLIPBOARD`) while snippet `${N}` placeholders and unknown tokens pass through verbatim (for M5.2). Templates resolve from a **workspace** root (`markstudio.templates.workspaceFolder`, default `.markstudio/templates`) and a **user** root (`markstudio.templates.userFolder`, default `<globalStorageUri>/templates`) by basename, **workspace wins**; the list is kept live by a debounced `FileSystemWatcher`. Note creation never overwrites — an `output:` collision opens the existing file with a status notice. **`MarkStudio: Create Example Template`** writes an opt-in starter `daily` template so the engine is discoverable. Built from four pure modules + one host service; **zero new runtime deps**, no webview/protocol change (T-7.1, M5.1, ADR-0025). |
| Snippets | Next | Insertable Markdown snippets (Sprint 8). The M5.1 expander already recognises and preserves `${1}` / `${1:default}` / `${0}` placeholders, so the snippet engine layers on top of the template engine. |
| Daily notes | Shipped | **`MarkStudio: Open Today's Note`** is a one-key create-or-open of today's daily note — no picker, no prompt. It resolves the configured daily template (`markstudio.dailyNotes.template`, default `daily`) and expands `{{date}}` with `markstudio.dailyNotes.dateFormat` (default `YYYY-MM-DD`); with no daily template it falls back to an empty note under `markstudio.dailyNotes.folder` (default `daily`). Create-if-missing / open-if-exists, always **in MarkStudio**. Shares the M5.1 engine (T-7.3, M5.3, ADR-0025). |
| Workspace note features | Deferred | Workspace-aware note organization (revisit after Snippets). |

---

## 6. Platform (Phase 6)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Plugin API | Future | Allow third parties to extend MarkStudio. |
| Theme API | Future | Themeable extension points within VS Code theming constraints. |
| Custom Markdown extensions | Future | Public seams for new syntax. |
| Third-party integrations | Future | Integrate with external tools/services. |

---

## 7. Export (Future)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Export to HTML | Future | Export the rendered preview to a standalone HTML file. |
| Export to PDF | Future | Export to PDF. |

---

## 8. Cross-Cutting Qualities

These are not toggleable features but guarantees that apply everywhere:

* **Performance** — incremental updates, debounced rendering, large-file support; never recreate webview/editor/preview.
* **Accessibility** — keyboard navigation, focus indicators, screen-reader support, high-contrast mode.
* **State persistence** — view state via `vscode.setState()`; document state via the host's `CustomDocument`.
* **External-change handling** — for the text-backed custom editor, on-disk changes reconcile through VS Code's managed `TextDocument` + `onDidChangeTextDocument`; the webview applies them as a minimal diff so the cursor is preserved where possible (T-110, ADR-0009). No custom file watcher is needed.
* **Autosave** — VS Code's autosave is respected; no custom autosave.

---

## 9. Explicitly Out of Scope

To keep focus (see [.ai/CONTEXT.md](../.ai/CONTEXT.md) §2):

* A standalone (non-VS Code) application.
* A full graph-database PKM out of the box (graph view is a later, optional layer).
* A WYSIWYG-only editor with no source mode.
* Any feature that requires a UI or CSS framework, hardcoded colors, or a fake VS Code chrome.
