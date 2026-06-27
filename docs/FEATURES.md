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
| Toolbar (Codicons) | In progress | Three layout-mode buttons shipped in the App Shell toolbar (T-107) — source-only, split, preview-only. Word wrap, search, and outline buttons land alongside their underlying features (T-2.x). |
| Theme integration | Shipped | All styling from `--vscode-*` variables; correct in light, dark, and high contrast (T-104 — verified in EDH outstanding). |
| Scroll synchronization | Shipped | In split mode, scrolling either pane scrolls the other to the matching Markdown block; preview blocks are anchored to source lines via the markdown-it token map and interpolated for smooth alignment, with per-direction feedback suppression (T-2.1). |
| Configuration / settings | Shipped | `markstudio.*` settings are read reactively host-side (`ConfigurationService`) and applied live without a reload. First setting: `markstudio.editor.lineNumbers` (default on) toggles the CodeMirror line-number gutter via a CM6 `Compartment` (T-111, ADR-0010). Future options extend `MarkStudioConfig` + the `configChanged` message. |

---

## 2. Editing Quality (Phase 2)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Scroll synchronization | Shipped | Editor and preview scroll positions stay aligned, both directions (T-2.1; delivered early during Phase 1). |
| Document outline | Planned | Navigable heading outline that updates incrementally. |
| Search & replace | Planned | In-editor find/replace built on CodeMirror's search. |
| Word count & reading time | Planned | Live document statistics. |
| Word wrap & multiple cursors | Planned | Wrap toggle and multi-cursor editing. |

---

## 3. Modern Markdown (Phase 3)

Each attaches as a CodeMirror 6 extension and/or markdown-it plugin and **degrades gracefully** when disabled.

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Math | Future | Inline and block math rendering. |
| Mermaid diagrams | Future | Render fenced `mermaid` blocks in preview. |
| Callouts / admonitions | Future | Styled note/warning/tip blocks. |
| Wiki links | Future | `[[note]]` linking syntax. |
| Footnotes & full GFM | Future | Footnotes, task lists, tables, strikethrough. |

---

## 4. Knowledge Management (Phase 4)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Backlinks | Future | Panel showing notes that link to the current note. |
| Hover preview | Future | Preview a linked note on hover. |
| Embedded notes / transclusion | Future | Inline another note's content. |
| Graph view | Future | Visualize links between notes. |

---

## 5. Authoring Workflows (Phase 5)

| Feature | Status | Description |
| ------- | ------ | ----------- |
| Templates | Future | Reusable note templates. |
| Snippets | Future | Insertable Markdown snippets. |
| Daily notes | Future | Date-stamped note creation. |
| Workspace note features | Future | Workspace-aware note organization. |

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
