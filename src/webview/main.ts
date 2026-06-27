// MarkStudio webview entry (browser bundle).
//
// Builds the shell exactly once and mounts the two long-lived panes:
//   - A single CodeMirror 6 `EditorView` for the source (T-104, ADR-0002).
//   - A single markdown-it preview that patches its existing DOM tree on
//     every update (T-105, ADR-0008).
// Both panes live inside one `AppShell` (T-106) that owns the draggable
// gutter and the three layout modes (split / editor-only / preview-only).
// The renderers are never unmounted when the mode changes — only pane
// visibility / `flex-grow` is toggled.

import { WebviewMessageBus } from "../messaging/WebviewMessageBus";
import { createEditor, type MarkStudioEditor } from "./editor/createEditor";
import {
  createPreviewRenderer,
  type PreviewRenderer
} from "./preview/PreviewRenderer";
import { createScrollSync, type ScrollSync } from "./preview/scrollSync";
import { createAppShell, type AppShell } from "./app/AppShell";
import { createViewStateStore } from "./state/viewState";

function mount(): void {
  const root = document.getElementById("markstudio-root");
  if (!root) {
    return;
  }

  injectBaseStyles();

  let editor: MarkStudioEditor | null = null;
  let shell: AppShell | null = null;
  let preview: PreviewRenderer | null = null;
  let scrollSync: ScrollSync | null = null;

  const bus = new WebviewMessageBus(
    (message) => {
      switch (message.type) {
        case "init":
          if (shell === null) {
            const viewState = createViewStateStore(bus);
            const initial = viewState.read();
            shell = createAppShell({
              root,
              viewState,
              initialLayoutMode: message.initialLayoutMode,
              onLayoutChange: (mode) => {
                // CM6 caches line geometry; force a re-measure when its pane
                // becomes visible again after `display: none`.
                editor?.view.requestMeasure();
                // Re-align the panes when split mode is (re)entered — they may
                // have drifted while one pane was hidden (T-2.1).
                if (mode === "split") {
                  scrollSync?.syncFromEditor();
                }
                // Host-side Memento is the cross-reload source of truth
                // (T-109); notify it of every user-driven mode change.
                bus.post({ type: "layoutModeChanged", mode });
              }
            });
            preview = createPreviewRenderer(shell.previewPane);
            editor = createEditor({
              parent: shell.editorPane,
              initialText: message.text,
              initialConfig: message.config,
              initialCursor: initial.cursor,
              initialScrollTop: initial.scrollTop,
              onLocalChange: (batch) => {
                bus.post({
                  type: "edit",
                  changes: batch.changes,
                  text: batch.text
                });
                preview?.update(batch.text);
              },
              onSnapshotChange: (snapshot) => {
                viewState.patch({
                  cursor: snapshot.cursor,
                  scrollTop: snapshot.scrollTop
                });
              }
            });
            scrollSync = createScrollSync({
              editorView: editor.view,
              previewScroller: shell.previewPane,
              getBlocks: () => preview?.getBlocks() ?? [],
              isActive: () => shell?.getLayoutMode() === "split"
            });
            root.setAttribute("aria-busy", "false");
          } else {
            editor?.setContentFromHost(message.text);
            editor?.setConfig(message.config);
          }
          preview?.update(message.text);
          return;
        case "setContent":
          editor?.setContentFromHost(message.text);
          preview?.update(message.text);
          return;
        case "setLayoutMode":
          shell?.setLayoutMode(message.mode);
          return;
        case "togglePreview":
          shell?.togglePreview();
          return;
        case "toggleSplit":
          shell?.toggleSplit();
          return;
        case "focusPane":
          if (message.pane === "editor") {
            editor?.focus();
          } else {
            shell?.focusPreview();
          }
          return;
        case "configChanged":
          editor?.setConfig(message.config);
          return;
        case "error":
          console.error(`[markstudio] host error: ${message.message}`);
          return;
      }
    },
    (raw) => {
      console.warn("[markstudio] dropped malformed host message", raw);
    }
  );

  bus.post({ type: "ready" });
}

function injectBaseStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    html, body {
      height: 100%;
      margin: 0;
    }
    body {
      color: var(--vscode-editor-foreground);
      background-color: var(--vscode-editor-background);
      font-family: var(--vscode-editor-font-family, var(--vscode-font-family));
      font-size: var(--vscode-editor-font-size, var(--vscode-font-size));
      display: flex;
      flex-direction: column;
    }
    /* CodeMirror fills its pane; the editor theme handles its own colors. */
    .cm-editor {
      height: 100%;
    }
    .cm-editor.cm-focused {
      outline: none;
    }
    .markstudio-preview-content {
      padding: 16px 24px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      line-height: 1.55;
      color: var(--vscode-editor-foreground);
      box-sizing: border-box;
      max-width: 100%;
      word-wrap: break-word;
    }
    .markstudio-preview-content > *:first-child {
      margin-top: 0;
    }
    .markstudio-preview-content > *:last-child {
      margin-bottom: 0;
    }
    .markstudio-preview-content h1,
    .markstudio-preview-content h2,
    .markstudio-preview-content h3,
    .markstudio-preview-content h4,
    .markstudio-preview-content h5,
    .markstudio-preview-content h6 {
      font-weight: 600;
      line-height: 1.25;
      margin: 1.4em 0 0.5em;
    }
    .markstudio-preview-content h1 {
      font-size: 1.8em;
      border-bottom: 1px solid var(--vscode-editorGroup-border, transparent);
      padding-bottom: 0.2em;
    }
    .markstudio-preview-content h2 {
      font-size: 1.45em;
      border-bottom: 1px solid var(--vscode-editorGroup-border, transparent);
      padding-bottom: 0.2em;
    }
    .markstudio-preview-content h3 { font-size: 1.2em; }
    .markstudio-preview-content h4 { font-size: 1.05em; }
    .markstudio-preview-content h5 { font-size: 0.95em; }
    .markstudio-preview-content h6 {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
    }
    .markstudio-preview-content p {
      margin: 0.6em 0;
    }
    .markstudio-preview-content a {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .markstudio-preview-content a:hover,
    .markstudio-preview-content a:focus {
      color: var(--vscode-textLink-activeForeground);
      text-decoration: underline;
    }
    .markstudio-preview-content code {
      font-family: var(--vscode-editor-font-family);
      font-size: 0.95em;
      color: var(--vscode-textPreformat-foreground);
      background-color: var(--vscode-textCodeBlock-background, transparent);
      padding: 0.1em 0.35em;
      border-radius: 3px;
    }
    .markstudio-preview-content pre {
      background-color: var(--vscode-textCodeBlock-background, var(--vscode-editor-background));
      color: var(--vscode-editor-foreground);
      padding: 12px 14px;
      border-radius: 4px;
      overflow: auto;
      margin: 0.8em 0;
    }
    .markstudio-preview-content pre code {
      background: none;
      padding: 0;
      color: inherit;
      font-size: var(--vscode-editor-font-size);
      font-family: var(--vscode-editor-font-family);
    }
    .markstudio-preview-content blockquote {
      margin: 0.8em 0;
      padding: 0.2em 1em;
      color: var(--vscode-descriptionForeground);
      border-left: 4px solid var(--vscode-textBlockQuote-border, var(--vscode-editorGroup-border, transparent));
      background-color: var(--vscode-textBlockQuote-background, transparent);
    }
    .markstudio-preview-content ul,
    .markstudio-preview-content ol {
      margin: 0.6em 0;
      padding-left: 1.6em;
    }
    .markstudio-preview-content li {
      margin: 0.2em 0;
    }
    .markstudio-preview-content hr {
      border: 0;
      border-top: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border, transparent));
      margin: 1.2em 0;
    }
    .markstudio-preview-content table {
      border-collapse: collapse;
      margin: 0.8em 0;
    }
    .markstudio-preview-content th,
    .markstudio-preview-content td {
      border: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border, transparent));
      padding: 0.35em 0.6em;
    }
    .markstudio-preview-content th {
      background-color: var(--vscode-editor-selectionHighlightBackground, transparent);
    }
    .markstudio-preview-content img {
      max-width: 100%;
      height: auto;
    }
  `;
  document.head.append(style);
}

mount();
