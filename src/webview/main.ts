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
import { registerWikiLinkClicks } from "./preview/wikiLinkClick";
import {
  registerWikiLinkHover,
  type WikiLinkHover
} from "./preview/wikiLinkHover";
import { createHoverCard, type HoverCard } from "./preview/HoverCard";
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
  let hoverCard: HoverCard | null = null;
  let hoverPreview: PreviewRenderer | null = null;
  let hover: WikiLinkHover | null = null;

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
            preview = createPreviewRenderer(shell.previewPane, message.config);
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
            // Delegated wiki-link click handling (T-4.1b). Bound once to the
            // persistent preview pane, so it survives every preview re-render.
            registerWikiLinkClicks(shell.previewPane, bus);
            // Delegated wiki-link hover preview (T-4.2). One floating card,
            // owned here, with its own reused renderer; the hover detector
            // requests previews after a dwell and asks the card to hide on
            // leave.
            hoverCard = createHoverCard({ parent: root });
            hoverPreview = createPreviewRenderer(
              hoverCard.contentElement,
              message.config
            );
            hover = registerWikiLinkHover(shell.previewPane, bus, {
              onRequestHide: () => hoverCard?.scheduleHide(),
              onCancelHide: () => hoverCard?.cancelHide()
            });
            root.setAttribute("aria-busy", "false");
          } else {
            editor?.setContentFromHost(message.text);
            editor?.setConfig(message.config);
            preview?.setConfig(message.config);
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
          preview?.setConfig(message.config);
          hoverPreview?.setConfig(message.config);
          return;
        case "revealLine":
          // Navigation from the document-outline tree (T-2.2). Make sure the
          // editor pane is visible before revealing — in preview-only mode it
          // is hidden, so promote to split first.
          if (shell?.getLayoutMode() === "preview-only") {
            shell.setLayoutMode("split");
          }
          editor?.revealLine(message.line);
          return;
        case "linkPreviewContent": {
          // Route a host preview reply to the hover card (T-4.2). Drop a stale
          // reply: the pointer may have left the link, or moved to another one,
          // before this arrived — only render when it still matches the anchor
          // the pointer is resting on.
          const anchor = hover?.getActiveAnchor() ?? null;
          if (
            anchor === null ||
            !hover?.matchesActiveRequest(message.target, message.heading)
          ) {
            return;
          }
          if (message.status === "ok") {
            hoverPreview?.update(message.text ?? "");
            hoverCard?.showContent(anchor);
          } else {
            hoverCard?.showMissing(anchor);
          }
          return;
        }
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
    /* Mermaid diagram containers (T-3.2). Centered; the rendered SVG scales to
       the pane width. Until the diagram renders, the raw source shows as a
       monospace placeholder so nothing is lost if the library is unavailable. */
    .markstudio-mermaid {
      margin: 0.8em 0;
      text-align: center;
      font-family: var(--vscode-editor-font-family);
      white-space: pre-wrap;
    }
    .markstudio-mermaid svg {
      max-width: 100%;
      height: auto;
    }
    .markstudio-mermaid-error {
      text-align: left;
      white-space: pre-wrap;
      color: var(--vscode-errorForeground);
    }
    /* Callout / admonition boxes (T-3.3). Themed entirely through --vscode-*
       variables: the accent (border + icon + title) is driven by a per-type
       text color, with a faint tinted body via the editor widget background.
       Falls back to ordinary blockquote styling tokens when a type-specific
       variable is unavailable. */
    .markstudio-callout {
      margin: 0.8em 0;
      padding: 0.6em 1em;
      border-left: 4px solid var(--markstudio-callout-accent);
      border-radius: 4px;
      background-color: var(--vscode-textBlockQuote-background, var(--vscode-editorWidget-background, transparent));
      --markstudio-callout-accent: var(--vscode-textLink-foreground);
    }
    .markstudio-callout > *:first-child {
      margin-top: 0;
    }
    .markstudio-callout > *:last-child {
      margin-bottom: 0;
    }
    .markstudio-callout-title {
      display: flex;
      align-items: center;
      gap: 0.5em;
      font-weight: 600;
      margin-bottom: 0.4em;
      color: var(--markstudio-callout-accent);
    }
    .markstudio-callout-title .codicon {
      font-size: 1.1em;
      flex: 0 0 auto;
    }
    .markstudio-callout-note {
      --markstudio-callout-accent: var(--vscode-charts-blue, var(--vscode-textLink-foreground));
    }
    .markstudio-callout-tip {
      --markstudio-callout-accent: var(--vscode-charts-green, var(--vscode-terminal-ansiGreen, var(--vscode-textLink-foreground)));
    }
    .markstudio-callout-important {
      --markstudio-callout-accent: var(--vscode-charts-purple, var(--vscode-textLink-foreground));
    }
    .markstudio-callout-warning {
      --markstudio-callout-accent: var(--vscode-editorWarning-foreground, var(--vscode-charts-yellow, var(--vscode-textLink-foreground)));
    }
    .markstudio-callout-caution {
      --markstudio-callout-accent: var(--vscode-editorError-foreground, var(--vscode-charts-red, var(--vscode-errorForeground)));
    }
    /* Wiki-style links (T-3.4). Styled as a link via --vscode-* variables; a
       dashed underline distinguishes an unresolved wiki link from an ordinary
       resolved link. Resolution to real files arrives in Phase 4. */
    .markstudio-wikilink {
      color: var(--vscode-textLink-foreground);
      text-decoration: underline;
      text-decoration-style: dashed;
      text-underline-offset: 0.2em;
      cursor: pointer;
    }
    .markstudio-wikilink:hover {
      color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
      text-decoration-style: solid;
    }
    /* Strikethrough (T-3.5). markdown-it emits <s>; <del> is themed too so the
       style holds regardless of the tag. */
    .markstudio-preview-content del,
    .markstudio-preview-content s {
      text-decoration: line-through;
      color: var(--vscode-descriptionForeground);
    }
    /* GFM task lists (T-3.5). The whole list drops its bullets and left indent
       so the checkbox aligns with the body text; the checkbox is read-only
       (rendered disabled) this sprint. The accent colour is the focus border,
       which is theme-aware in dark / light / high-contrast. */
    .markstudio-preview-content ul.markstudio-task-list {
      list-style: none;
      padding-left: 0.2em;
    }
    .markstudio-preview-content li.markstudio-task-list-item {
      list-style: none;
    }
    .markstudio-task-list-checkbox {
      margin: 0 0.5em 0 0;
      vertical-align: middle;
      accent-color: var(--vscode-focusBorder, var(--vscode-textLink-foreground));
    }
    /* Footnotes (T-3.5). The reference superscript and the back-reference are
       styled as links; the footnotes section sits below a separator rule, all
       themed through --vscode-* variables. */
    .markstudio-preview-content .footnote-ref a,
    .markstudio-preview-content .footnote-backref {
      color: var(--vscode-textLink-foreground);
      text-decoration: none;
    }
    .markstudio-preview-content .footnote-ref a:hover,
    .markstudio-preview-content .footnote-backref:hover {
      color: var(--vscode-textLink-activeForeground, var(--vscode-textLink-foreground));
      text-decoration: underline;
    }
    .markstudio-preview-content .footnotes-sep {
      border: 0;
      border-top: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border, transparent));
      margin: 1.6em 0 0.8em;
    }
    .markstudio-preview-content .footnotes {
      font-size: 0.9em;
      color: var(--vscode-descriptionForeground);
    }
    .markstudio-preview-content .footnotes-list {
      padding-left: 1.4em;
    }
    .markstudio-preview-content .footnote-item p {
      margin: 0.3em 0;
    }
  `;
  document.head.append(style);
}

mount();
