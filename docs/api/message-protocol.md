# Message Protocol

> The typed contract exchanged between the MarkStudio extension host and the webview, as of **T-2.2**. The code is the source of truth — see [`src/messaging/messages.ts`](../../src/messaging/messages.ts), [`src/messaging/HostMessageBus.ts`](../../src/messaging/HostMessageBus.ts), and [`src/messaging/WebviewMessageBus.ts`](../../src/messaging/WebviewMessageBus.ts). Update this doc in the **same change** as the code.

---

## 1. Rules

* Payloads are plain JSON. Never include `vscode` objects, DOM nodes, or functions ([ARCHITECTURE.md](../ARCHITECTURE.md) §6).
* Every message is a discriminated union member with a string `type` literal.
* The bus validates inbound payloads at both ends. Anything that does not match a known shape is dropped and logged — handlers only ever see well-typed messages ([CODING_GUIDELINES.md](../CODING_GUIDELINES.md) §9).
* Adding or changing a message requires updating `messages.ts`, the guards in the same file, and this doc together.

---

## 2. Host → Webview

| `type`           | Payload                                                | Sent when                                                                                       |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `init`           | `{ text: string, config: MarkStudioConfig, initialLayoutMode?: "split" \| "editor-only" \| "preview-only" }` | First content load. Pushed once when the editor resolves, and again in response to `ready`. `config` (T-111) is the resolved `markstudio.*` snapshot (`{ lineNumbers: boolean, wordWrap: boolean, math: boolean, mermaid: boolean, callouts: boolean }`) the webview applies as it builds the editor, so the first paint already reflects the user's settings. `initialLayoutMode` (T-109) carries the host-authoritative layout mode read from the Memento (`StateStore`); when present it wins over the value the webview cached via `vscode.setState()`, so the layout the user last left a given file in survives extension reloads. Omitted when no Memento entry exists for the document URI. |
| `setContent`     | `{ text: string }`                                     | Authoritative content update (revert, on-disk change, edit from another text editor).          |
| `setLayoutMode`  | `{ mode: "split" \| "editor-only" \| "preview-only" }` | Host requests an App Shell layout-mode change (T-106) — fired by the `markstudio.layout.*` commands. The webview applies the mode without remounting CodeMirror or the preview. |
| `togglePreview`  | `{}`                                                   | Host requests the `markstudio.togglePreview` toggle (T-108). The webview computes the next mode itself (`editor-only` ↔ `split`) so the toggle uses the authoritative state it already holds (no host cache to drift). |
| `toggleSplit`    | `{}`                                                   | Host requests the `markstudio.toggleSplit` toggle (T-108). The webview swaps between `split` and `editor-only`. |
| `focusPane`      | `{ pane: "editor" \| "preview" }`                      | Host requests keyboard focus on a pane (T-108) — fired by `markstudio.focusEditor` / `markstudio.focusPreview`. Targeting the preview while in `editor-only` first promotes the layout to `split`. |
| `configChanged`  | `{ config: MarkStudioConfig }`                         | A `markstudio.*` setting changed (T-111). The host re-reads the full config (per document URI, so resource-scoped overrides win) and sends the new snapshot; the webview applies it live — e.g. toggling the CM6 line-number gutter or soft-wrap via a `Compartment`, toggling KaTeX math rendering (T-3.1), Mermaid diagram rendering (T-3.2), or callout rendering (T-3.3) in the preview — without a reload. |
| `revealLine`     | `{ line: number }`                                     | Host asks the webview to scroll the source editor to a 0-based source `line` and place the cursor there (T-2.2). Fired when a heading is clicked in the document-outline tree view. The webview clamps the line to the document, promotes `preview-only` to `split` so the editor is visible, focuses CodeMirror, and scrolls the line into view. |
| `error`          | `{ message: string }`                                  | A host-side diagnostic the webview should surface or log.                                       |

The host suppresses `setContent` echoes of its own webview-originated edits via a text-equality guard, so the webview never receives a copy of an edit it just sent.

## 3. Webview → Host

| `type`              | Payload                                                | Sent when                                                                                       |
| ------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `ready`             | `{}`                                                   | The webview has built its shell and is ready to receive `init`.                                 |
| `edit`              | `{ changes: EditChange[], text: string }`              | The webview proposes a content change as a batch of minimal `EditChange { from, to, insert }` entries (the CodeMirror 6 diff). `from`/`to` are character offsets into the pre-change document text. `text` is the resulting full document text, used by the host's echo guard. Applied through `MarkStudioDocument.applyChanges` (`vscode.WorkspaceEdit`) so dirty state, undo/redo, save and revert integrate natively. |
| `layoutModeChanged` | `{ mode: "split" \| "editor-only" \| "preview-only" }` | The App Shell layout mode changed (T-109). The host persists the new value via `StateStore` so it replays on the next `init`. Fired by user-driven changes only (toolbar, toggle / show commands, focus commands that auto-promote to split); host-initiated `setLayoutMode` / `togglePreview` / `toggleSplit` / `focusPane` messages also reach the same code path inside the webview, so the host effectively round-trips its own writes back into the Memento — idempotent because the same value is written. |
| `error`             | `{ message: string }`                                  | A webview-side diagnostic the host should surface or log.                                       |

---

## 4. Sequence

```
Host                                    Webview
 │                                         │
 │  webview.html (one-time, ADR-0002)      │
 │ ─────────────────────────────────────▶  │
 │                                         │
 │                                  build shell, mount CodeMirror 6
 │                                         │
 │            { type: "ready" }            │
 │ ◀───────────────────────────────────────│
 │                                         │
 │      { type: "init", text }             │
 │ ───────────────────────────────────────▶│  build EditorView with initial text
 │                                         │  clear aria-busy
 │                                         │
 │   { type: "edit", changes, text }       │
 │ ◀─────────────────────────────────  user types (CM6 transaction)
 │  applyChanges → WorkspaceEdit           │
 │  (echo guard suppresses self-update)    │
 │                                         │
 │     { type: "setContent", text }        │   ← only on external/revert
 │ ───────────────────────────────────────▶│  dispatch w/ RemoteSync annotation;
 │                                         │  CM6 selection preserved/clamped
 │                                         │
```

---

## 5. Versioning

This protocol is internal and unversioned during Phase 0/1. Once a Plugin API ships (Phase 6 — see [ROADMAP.md](../ROADMAP.md)), externally observable messages will require a compatibility policy.
