# Design — Document Outline (T-2.2, Phase 2 M2.2)

> Pre-implementation design for the navigable heading outline. Status: **implemented**. The durable decision is recorded as [ADR-0014](../DECISIONS.md#adr-0014-document-outline-as-a-host-side-treedataprovider).

## Problem

Phase 2 (M2.2) calls for a navigable heading outline that updates as headings change. VS Code already ships an **Outline** view and breadcrumbs — but both are driven by `vscode.window.activeTextEditor`, which is `undefined` while a custom editor is focused. A plain `DocumentSymbolProvider` therefore never surfaces for a MarkStudio editor: the document is a real `TextDocument`, but the Outline view has no "active text editor" to attach it to.

## Options considered

1. **Host-side `TreeDataProvider` in a dedicated view** — a native VS Code tree view that follows the active MarkStudio editor. Native chrome, looks first-party, no webview UI.
2. **In-webview outline pane** — a third pane inside the App Shell rendering the outline in the webview.
3. **`DocumentSymbolProvider`** — rejected outright: does not surface for custom editors (the core problem above).

**Chosen: option 1.** It aligns with the project philosophy — "native beats custom", "less UI is better", "prefer VS Code integration" ([.ai/CONTEXT.md](../../.ai/CONTEXT.md)). A native tree view gives free theming, keyboard navigation, collapse/expand, and the standard Explorer look without adding any custom chrome to the webview. Option 2 would duplicate UI VS Code already provides and add layout/state complexity to the webview.

## Data flow

```
TextDocument (host) ──parseHeadings──▶ Heading[] ──buildHeadingTree──▶ OutlineNode[]
        │                                                                   │
  onDidChangeActiveDocument / onDidChangeTextDocument (debounced)     TreeDataProvider
        │                                                                   │
        └────────────────────── rebuild + fire onDidChangeTreeData ─────────┘

click a heading ──command markstudio.outline.reveal(line)──▶ activeController.revealLine(line)
        │                                                                   │
        │                                                       HostMessageBus.post
        ▼                                                                   ▼
   (host)                                              { type: "revealLine", line } ──▶ webview
                                                                            │
                                              main.ts: promote preview-only→split, then
                                              editor.revealLine(line) → CM6 scrollIntoView + cursor
```

## Files

* `src/outline/headings.ts` — **pure** `parseHeadings(text)` and `buildHeadingTree(headings)`. No `vscode`/DOM imports; unit-tested. Handles ATX (`#`) and setext (`===`/`---`) headings, skips fenced code blocks and leading YAML front matter.
* `src/outline/OutlineTreeProvider.ts` — `vscode.TreeDataProvider<OutlineNode>`; holds the active document, rebuilds on demand, exposes `headingCount` for the empty-state message.
* `src/outline/registerOutline.ts` — creates the `TreeView`, wires `onDidChangeActiveDocument` (follow the active editor) and a debounced `onDidChangeTextDocument` (rebuild on edit), and registers the internal `markstudio.outline.reveal` command. Returns one disposable.
* `src/messaging/messages.ts` — new `RevealLineMessage` (host → webview) + boundary guard.
* `src/editor/MarkStudioEditorProvider.ts` — `MarkStudioEditorController.revealLine(line)`.
* `src/webview/editor/createEditor.ts` — `MarkStudioEditor.revealLine(line)`: clamp to the doc, `EditorSelection.cursor` at the line start, `EditorView.scrollIntoView`, focus.
* `src/webview/main.ts` — handle `revealLine` (promote `preview-only` → `split` so the editor is visible, then reveal).
* `src/extension.ts` — `registerOutline(provider)` in `context.subscriptions`.
* `package.json` — `contributes.views.explorer` → `markstudio.outline`, `when: "activeCustomEditorId == 'markstudio.editor'"`.

## Public surface added

* View `markstudio.outline` (Explorer container, visible only while a MarkStudio editor is active).
* Internal command `markstudio.outline.reveal` (tree-item click target; **not** contributed to the palette).
* Host → webview message `revealLine { line }`.

## Decisions & trade-offs

* **Parse host-side, not via the preview tokeniser.** The TODO noted the markdown-it tokeniser (T-105) could supply heading positions, but it lives in the webview. Parsing headings host-side from the `TextDocument` the provider already owns keeps the outline decoupled from the webview, needs no round-trip, and is trivially unit-testable. The small heading scanner is the cost; it is well-covered by tests.
* **Follow the active editor, debounce edits.** Headings change far less often than text, so edit-driven rebuilds are coalesced (300 ms). The view is gated to MarkStudio editors via the `when` clause, mirroring how the native Outline follows the active editor.
* **Reveal centres on a focus + scroll, not a selection range.** Clicking a heading places the cursor at the heading's line start and scrolls it into view; it does not select the heading text. This matches the native Outline's "go to" behaviour.
* **Known limitation:** the outline shows the raw source text of a heading (inline Markdown like `**bold**` is not stripped). Acceptable for v1; a later refinement could render inline text.
