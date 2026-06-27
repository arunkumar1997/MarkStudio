# ARCHITECTURE

> How MarkStudio is structured, why it is structured that way, and the boundaries every contributor must respect.
>
> This describes the **target** architecture. Scaffolding has begun: the extension builds and registers the MarkStudio custom editor (T-101), but most modules below are not yet implemented (see [PROJECT_STATUS.md](PROJECT_STATUS.md)). As code lands, keep this file accurate in the **same change** that alters structure. Decisions behind this design are recorded in [DECISIONS.md](DECISIONS.md).

---

## 1. Architectural Goals

Every structural choice serves these goals, in priority order:

1. **Feel native.** The extension should be indistinguishable from a built-in VS Code editor.
2. **Preserve state.** Editor, preview, cursor, scroll, and layout survive tab switches, theme changes, and reloads.
3. **Stay fast.** Incremental updates only; never recreate the webview, CodeMirror, or the preview DOM.
4. **Stay small.** Few dependencies, few abstractions, small files with single responsibilities.
5. **Stay maintainable.** A new agent can locate any concern quickly and change it safely.

---

## 2. The Two Worlds: Extension Host and Webview

A VS Code custom editor spans two isolated runtimes that communicate only by message passing. Understanding this boundary is the key to the whole design.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          EXTENSION HOST (Node)                         │
│                                                                        │
│  extension.ts ──registers──▶ MarkStudioEditorProvider                 │
│                                  │                                     │
│                 owns CustomDocument (model + dirty state + undo)       │
│                                  │                                     │
│   VS Code APIs: Workspace · FileSystem · Commands · Configuration ·    │
│   Memento · FileSystemWatcher · Theme                                  │
│                                  │                                     │
└──────────────────────────────────┼─────────────────────────────────────┘
                                    │  postMessage()  (typed MessageBus)
                                    │  ◀────────────────────────────────▶
┌──────────────────────────────────┼─────────────────────────────────────┐
│                              WEBVIEW (DOM)                              │
│                                  │                                     │
│   webview entry ──builds once──▶ App Shell (Toolbar · Split · Panes)   │
│        │                                   │                           │
│   CodeMirror 6 (Editor)            markdown-it (Preview, incremental)   │
│        │                                   │                           │
│   vscode.setState()/getState() for view state persistence              │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

* The **extension host** owns the *document* (the source of truth for file content, dirty state, and undo/redo).
* The **webview** owns the *view* (editor instance, preview DOM, layout, and ephemeral view state).
* They never share objects. They exchange **typed messages** through a single **MessageBus**. This is the most important invariant in the codebase.

See ADR-0001 (Custom Editor API) and ADR-0002 (single persistent webview) in [DECISIONS.md](DECISIONS.md).

---

## 3. Planned Module Layout

This is the target layout. Scaffolding has landed `extension.ts`, `editor/MarkStudioEditorProvider.ts`, `editor/MarkStudioDocument.ts`, `editor/webviewHtml.ts`, the full `messaging/` module (T-103), `webview/main.ts`, the CodeMirror 6 source editor under `webview/editor/` (T-104), the markdown-it live preview under `webview/preview/` (T-105), the App Shell + split-view + Codicon toolbar under `webview/app/` plus the view-state slot under `webview/state/` and the layout commands under `commands/` (T-106, T-107), the convenience toggle / focus commands + default keybindings in `commands/registerCommands.ts` (T-108), and the cross-session `Memento` wrapper at `services/StateStore.ts` plus the CM6 cursor + scroll snapshot/restore inside `webview/editor/createEditor.ts` (T-109), the cursor-preserving external-change reconciliation in `webview/editor/createEditor.ts` (T-110), the editor ⇄ preview scroll sync at `webview/preview/scrollSync.ts` (T-2.1), and the reactive settings reader at `services/ConfigurationService.ts` driving the CM6 line-numbers `Compartment` (T-111); the remaining modules arrive with their tasks ([TODO.md](TODO.md)). It reflects the Project Structure in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md).

```
src/
├── extension.ts                  # Activation entry point; registers the provider and commands
│
├── editor/                       # Extension-host side of the custom editor
│   ├── MarkStudioEditorProvider.ts   # implements vscode.CustomTextEditorProvider
│   ├── MarkStudioDocument.ts         # document model: content, dirty state, undo/redo
│   └── webviewHtml.ts                # builds the ONE-TIME webview HTML (CSP, nonce, asset URIs)
│
├── messaging/                    # The contract between the two worlds
│   ├── messages.ts                   # discriminated-union message types + boundary guards (no `vscode`, no DOM)
│   ├── HostMessageBus.ts             # typed wrapper over webview.postMessage / onDidReceiveMessage (host bundle)
│   └── WebviewMessageBus.ts          # typed wrapper over acquireVsCodeApi() + window 'message' (webview bundle)
│
├── commands/                     # Command palette + keybinding handlers
│   └── registerCommands.ts
│
├── services/                     # Host-side services wrapping VS Code APIs
│   ├── FileWatcherService.ts         # workspace.createFileSystemWatcher (deferred — not needed for the text-backed editor; ADR-0009)
│   ├── ConfigurationService.ts       # reads MarkStudio settings
│   └── StateStore.ts                 # Memento-backed persistence (workspace/global)
│
├── status/                       # Host-side status-bar indicators
│   ├── wordCount.ts                  # pure computeDocumentStats (words/characters/reading time)
│   └── WordCountStatusBar.ts         # StatusBarItem reflecting the active MarkStudio document (T-2.4)
│
└── webview/                      # Webview (browser) runtime — bundled separately
    ├── main.ts                       # builds the App Shell exactly once; mounts the editor
    ├── app/
    │   ├── AppShell.ts               # toolbar + split container + panes
    │   ├── Toolbar.ts                # Codicon buttons (toggle/split/wrap/search/outline)
    │   └── SplitView.ts              # resizable split, remembers ratio
    ├── editor/
    │   ├── createEditor.ts           # builds the CodeMirror 6 EditorView (once); remote-sync annotation
    │   └── extensions.ts             # CM6 extensions: markdown, history, search, theme bound to --vscode-*
    ├── preview/
    │   ├── PreviewRenderer.ts        # markdown-it instance + incremental DOM patching
    │   └── scrollSync.ts             # editor ⇄ preview scroll synchronization
    ├── state/
    │   └── viewState.ts              # vscode.setState()/getState() shape + helpers
    └── theme/
        └── themeBridge.ts            # maps --vscode-* variables into editor/preview styling

media/                            # Static webview assets (CSS, codicons)
test/                             # Unit + integration tests (see TESTING.md)
```

Files are intentionally small and single-purpose. If a file grows past a single clear responsibility, split it (see [CODING_GUIDELINES.md](CODING_GUIDELINES.md)).

---

## 4. Component Responsibilities

### 4.1 Extension Host

| Component | Responsibility | Must NOT |
| --------- | -------------- | -------- |
| `extension.ts` | Activate, register the provider and commands, wire services | Contain editor or rendering logic |
| `MarkStudioEditorProvider` | Implement `CustomTextEditorProvider`; create the webview once per editor; bridge document ⇄ webview | Reassign `webview.html` after init; recreate the webview |
| `MarkStudioDocument` | Hold content, dirty state, and undo/redo; serialize on save; apply external edits | Know anything about the DOM or CodeMirror |
| `MessageBus` (host side) | Serialize/deserialize typed messages; route them | Leak `vscode` objects into payloads |
| `FileWatcherService` | Detect external file changes via `createFileSystemWatcher` | Implement custom polling — *deferred: the text-backed editor reconciles via the managed `TextDocument` + `onDidChangeTextDocument` (ADR-0009)* |
| `ConfigurationService` | Read `markstudio.*` settings reactively | Cache settings without listening for changes |
| `StateStore` | Persist workspace/global state via Memento | Store large blobs or document content |
| `WordCountStatusBar` | Show word count + reading time for the active MarkStudio document in a native status-bar item (T-2.4) | Add custom webview chrome; recount synchronously on every keystroke |

### 4.2 Webview

| Component | Responsibility | Must NOT |
| --------- | -------------- | -------- |
| `main.ts` | Build the App Shell exactly once on first load | Rebuild the DOM on every message |
| `AppShell` / `SplitView` / `Toolbar` | Lay out panes; host toolbar actions; remember split ratio | Hardcode colors, sizes, or fonts |
| `createEditor` (CodeMirror 6) | Construct the single, long-lived `EditorView` | Recreate the editor on update |
| `PreviewRenderer` (markdown-it) | Render Markdown and **patch** only changed DOM nodes | Re-render the full preview on every keystroke |
| `scrollSync` | Keep editor and preview scroll positions aligned | Trigger layout thrash |
| `themeBridge` | Consume `--vscode-*` variables for all styling | Read computed colors or hardcode values |
| `viewState` | Persist cursor, scroll, split ratio, preview visibility via `setState` | Persist document content (the host owns that) |

---

## 5. Data Flow

### 5.1 Opening a document

1. User opens a `.md` file; VS Code invokes `MarkStudioEditorProvider.resolveCustomTextEditor`.
2. The provider creates the webview **once**, sets `retainContextWhenHidden: true` and `enableScripts: true`, and assigns `webview.html` a single time.
3. The provider sends an `init` message with the document text and resolved configuration.
4. The webview builds the App Shell, constructs CodeMirror with the text, renders the initial preview, and restores view state from `getState()` if present.

### 5.2 Editing

1. CodeMirror dispatches a transaction; the webview computes a minimal text change.
2. The webview sends an `edit` message (the change, not the whole document) to the host.
3. The host applies the edit to `MarkStudioDocument`, updating dirty state and the undo stack.
4. The preview is patched **incrementally** in the webview — only nodes affected by the change are updated.

### 5.3 Saving and reverting

* VS Code's save/revert flow drives the host. On save, the document serializes its content to disk through the FileSystem API. On revert, the host sends an authoritative `setContent` message; the webview reconciles CodeMirror without recreating it.
* Autosave is **never** custom — VS Code's autosave settings are respected (ADR-0004).

### 5.4 External file changes

MarkStudio uses `CustomTextEditorProvider` (ADR-0001), so VS Code owns the `TextDocument` ⇄ disk relationship. External changes are reconciled through that managed model rather than a custom watcher (ADR-0009):

1. The file changes on disk (a `git pull`, a save from another editor, an external formatter). VS Code reverts the in-memory `TextDocument` when it is clean and fires `workspace.onDidChangeTextDocument`; when the document is dirty, VS Code shows its native "file changed on disk" conflict UX.
2. The provider's `onDidChangeTextDocument` handler (echo-guarded against the webview's own edits) sends the new text to the webview as `setContent`.
3. The webview applies it via `createEditor.setContentFromHost`, which reconciles the change as a **minimal diff** (common prefix/suffix trimmed) rather than a full-document replace, so CodeMirror maps the existing selection across it and the cursor stays put when the external edit is elsewhere.

No separate `FileWatcherService` is wired for the text-backed editor — `onDidChangeTextDocument` is VS Code's external-change reconciliation surface here (ADR-0009). A raw `createFileSystemWatcher` would be the right tool only for a future non-text `CustomEditorProvider`.

### 5.5 Theme changes

* When the user's theme changes, `--vscode-*` variables update automatically; `themeBridge` requires no message because styling reads the live variables. Any computed values are refreshed on a lightweight `theme` notification if needed.

---

## 6. The Message Contract

All host ⇄ webview communication is a **typed discriminated union** defined in `messaging/messages.ts`. The contract is documented in [api/](api/) and must be kept in sync there.

Indicative message set (the source of truth is the code once it exists):

| Direction | Type | Payload | Purpose |
| --------- | ---- | ------- | ------- |
| Host → Webview | `init` | `{ text, config, viewState? }` | First load |
| Host → Webview | `setContent` | `{ text }` | Revert / external change |
| Host → Webview | `setLayoutMode` | `{ mode }` | App Shell layout-mode switch (T-106) — `split` / `editor-only` / `preview-only` |
| Host → Webview | `configChanged` | `{ config }` | `markstudio.*` setting changed (T-111) — toggles line numbers etc. live via a CM6 `Compartment` |
| Webview → Host | `ready` | `{}` | Webview finished building |
| Webview → Host | `edit` | `{ changes: EditChange[], text }` | A minimal content change (CM6 diff). `text` enables the host's echo guard. |
| Webview → Host | `requestSave` | `{}` | User triggered save in-webview (planned) |
| Both | `error` | `{ message }` | Diagnostics |

Rules: payloads are plain JSON; never include `vscode` objects, DOM nodes, or functions. Adding or changing a message requires updating both `messages.ts` and the [api/](api/) contract doc.

---

## 7. State and Persistence

| State | Owner | Mechanism | Notes |
| ----- | ----- | --------- | ----- |
| Document content | Host | `CustomDocument` + FileSystem | The single source of truth for file bytes |
| Dirty state / undo | Host | `CustomDocument` | Integrates with VS Code's dirty indicator |
| Cursor & scroll | Webview | `vscode.setState()` | Restored on reload |
| Split ratio / preview visibility | Webview | `vscode.setState()` | Per-editor view state |
| Cross-session preferences | Host | Memento (`StateStore`) | E.g., last layout mode |
| User settings | Host | Configuration API | `markstudio.*` keys |

Persisted *view* state lives in the webview via `setState`/`getState`; persisted *document* state lives in the host. The two are never conflated.

---

## 8. Performance Architecture

Performance is a structural concern, not an afterthought (see [.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.4):

* **One webview per editor, retained.** Each resolved editor owns exactly one webview (a single shell hosting both panes); `retainContextWhenHidden: true`; never recreated on tab switch.
* **One CodeMirror instance.** Constructed once; updated via transactions.
* **Incremental preview.** markdown-it output is diffed/patched into the existing DOM; the full tree is never replaced.
* **Debounced rendering.** Expensive preview work is debounced; typing never blocks on a full render.
* **Minimal messages.** Edits send diffs, not whole-document snapshots.
* **No main-thread blocking.** Heavy work is chunked; the extension host is never synchronously blocked.

Performance budgets live in each feature's [implementation/](implementation/) record and in [TESTING.md](TESTING.md).

---

## 9. Security

* The webview uses a strict **Content Security Policy** with a per-load **nonce**; only bundled scripts with the nonce execute.
* All local resources are loaded via `webview.asWebviewUri`.
* No remote content is loaded by default. User Markdown is rendered through markdown-it with safe defaults; raw HTML handling is an explicit, documented decision when added.

---

## 10. Extensibility (Forward-Looking)

Later phases (math, mermaid, callouts, wiki links, backlinks — see [ROADMAP.md](ROADMAP.md)) attach as:

* **CodeMirror 6 extensions** for editor-side behavior.
* **markdown-it plugins** for preview-side rendering.

Both plug into well-defined seams (`editor/extensions.ts`, `preview/PreviewRenderer.ts`) so new syntax features degrade gracefully when disabled and never require recreating the editor or webview. A public Plugin/Theme API (Phase 6) is explicitly deferred until the core is unshakeable.

---

## 11. What This Architecture Forbids

Restating the non-negotiables in structural terms (full list in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md)):

* No UI framework (React/Vue/Svelte/Angular/Lit) and no CSS framework.
* No reassigning `webview.html` after initialization.
* No recreating the webview, CodeMirror, or the preview DOM tree.
* No hardcoded colors, fonts, or sizes.
* No custom autosave or custom file watcher when a VS Code API exists.
* No fake VS Code chrome (title bar, tab bar).

Any deviation requires a new ADR in [DECISIONS.md](DECISIONS.md) before implementation.
