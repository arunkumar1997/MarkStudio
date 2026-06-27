// MarkStudio App Shell (T-106, toolbar added in T-107).
//
// Builds the long-lived shell DOM exactly once and hands the editor and
// preview renderers stable mount points. Owns:
//
//   - The toolbar (Codicon layout-mode buttons; T-107).
//   - The two pane elements (`editorPane`, `previewPane`).
//   - The draggable gutter and the `SplitView` that drives its drag handler.
//   - The current layout mode (`split` / `editor-only` / `preview-only`).
//   - Reading and persisting the ratio + mode via `viewState`.
//
// Switching layout modes only toggles pane visibility / `flex-grow`; CodeMirror
// and the preview renderer are **never** unmounted or rebuilt
// (ARCHITECTURE.md §4.2, [.ai/CONTEXT.md](../../.ai/CONTEXT.md) §3.2).

import type { LayoutMode } from "../../messaging/messages";
import { createSplitView, type SplitView } from "./SplitView";
import { createToolbar, type Toolbar } from "./Toolbar";
import { clampRatio, type ViewStateStore } from "../state/viewState";

export type { LayoutMode };

export interface AppShellOptions {
  readonly root: HTMLElement;
  readonly viewState: ViewStateStore;
  // Host-authoritative layout mode (T-109). When provided, this overrides
  // the value cached in `vscode.setState()` so the Memento copy always wins.
  readonly initialLayoutMode?: LayoutMode;
  readonly onLayoutChange?: (mode: LayoutMode) => void;
}

export interface AppShell {
  readonly editorPane: HTMLElement;
  readonly previewPane: HTMLElement;
  getLayoutMode(): LayoutMode;
  setLayoutMode(mode: LayoutMode): void;
  togglePreview(): void;
  toggleSplit(): void;
  focusPreview(): void;
  destroy(): void;
}

export function createAppShell(options: AppShellOptions): AppShell {
  injectShellStyles();
  const { root, viewState, onLayoutChange } = options;

  const initial = viewState.read();

  const panesContainer = document.createElement("div");
  panesContainer.className = "markstudio-panes";

  const editorPane = document.createElement("div");
  editorPane.className = "markstudio-pane markstudio-pane--editor";

  const gutter = document.createElement("div");
  gutter.className = "markstudio-gutter";
  gutter.setAttribute("role", "separator");
  gutter.setAttribute("aria-orientation", "vertical");
  gutter.setAttribute("tabindex", "-1");
  gutter.title = "Drag to resize · Double-click to reset";

  const previewPane = document.createElement("div");
  previewPane.className = "markstudio-pane markstudio-pane--preview";
  // `tabindex="-1"` makes the pane programmatically focusable (for the
  // `markstudio.focusPreview` command in T-108) without entering the natural
  // Tab order — the preview is read-only, so users still tab past it.
  previewPane.tabIndex = -1;

  panesContainer.append(editorPane, gutter, previewPane);

  // The Memento value (`initialLayoutMode`) wins over the webview's cached
  // mode when both are present, so the per-file preference survives reloads.
  let mode: LayoutMode = options.initialLayoutMode ?? initial.layoutMode;
  if (mode !== initial.layoutMode) {
    viewState.patch({ layoutMode: mode });
  }

  const toolbar: Toolbar = createToolbar({
    initialMode: mode,
    onSelectMode: (next) => {
      setLayoutMode(next);
    }
  });

  root.append(toolbar.element, panesContainer);

  const split: SplitView = createSplitView({
    before: editorPane,
    after: previewPane,
    gutter,
    container: panesContainer,
    initialRatio: clampRatio(initial.splitRatio),
    onChange: () => {
      // Live drag updates the DOM only; persistence is deferred to onCommit
      // so we do not hammer `setState` on every pointer move.
    },
    onCommit: (ratio) => {
      viewState.patch({ splitRatio: ratio });
    }
  });

  applyLayoutModeStyles();

  function setLayoutMode(next: LayoutMode): void {
    if (next === mode) {
      return;
    }
    mode = next;
    applyLayoutModeStyles();
    toolbar.setActiveMode(mode);
    viewState.patch({ layoutMode: mode });
    onLayoutChange?.(mode);
  }

  // Reconciles `data-layout-mode` and the panes' inline `flex-grow` with the
  // current mode. In single-pane modes we MUST clear the inline `flex-grow`
  // that `SplitView` set: with one flex item on the line and a grow factor
  // below 1, browsers only distribute that fraction of free space (CSS
  // Flexbox §9.7.1), so an inline `flex-grow: 0.5` leaves the right half
  // empty even when the other pane is `display: none`. Clearing the inline
  // value lets the `.markstudio-pane { flex: 1 1 0 }` rule apply and the
  // visible pane fills the container.
  function applyLayoutModeStyles(): void {
    applyMode(root, mode);
    if (mode === "split") {
      split.reapply();
    } else {
      split.clearInlineSizing();
    }
  }

  return {
    editorPane,
    previewPane,
    getLayoutMode: () => mode,
    setLayoutMode,
    togglePreview(): void {
      // `markdown.showPreview` semantics: show preview if hidden, otherwise
      // hide it (back to editor-only).
      setLayoutMode(mode === "editor-only" ? "split" : "editor-only");
    },
    toggleSplit(): void {
      setLayoutMode(mode === "split" ? "editor-only" : "split");
    },
    focusPreview(): void {
      // In single-pane editor mode the preview is `display: none`; focusing
      // it would silently no-op and look like a broken command, so promote
      // to split first.
      if (mode === "editor-only") {
        setLayoutMode("split");
      }
      previewPane.focus();
    },
    destroy(): void {
      split.destroy();
      toolbar.destroy();
      panesContainer.remove();
    }
  };
}

function applyMode(root: HTMLElement, mode: LayoutMode): void {
  root.dataset.layoutMode = mode;
}

let stylesInjected = false;

function injectShellStyles(): void {
  if (stylesInjected) {
    return;
  }
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    #markstudio-root {
      display: flex;
      flex-direction: column;
      flex: 1 1 auto;
      min-height: 0;
    }
    .markstudio-panes {
      display: flex;
      flex-direction: row;
      flex: 1 1 auto;
      min-height: 0;
    }
    .markstudio-pane {
      flex: 1 1 0;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .markstudio-pane--preview {
      overflow: auto;
    }
    .markstudio-pane--preview:focus {
      outline: 1px solid var(--vscode-focusBorder, transparent);
      outline-offset: -1px;
    }
    .markstudio-gutter {
      flex: 0 0 6px;
      cursor: col-resize;
      background-color: var(--vscode-editorGroup-border, var(--vscode-panel-border, transparent));
      position: relative;
      touch-action: none;
      user-select: none;
    }
    .markstudio-gutter::before {
      content: "";
      position: absolute;
      inset: 0 -2px;
    }
    .markstudio-gutter:hover,
    .markstudio-gutter--active {
      background-color: var(--vscode-focusBorder, var(--vscode-editorGroup-border, transparent));
    }
    #markstudio-root[data-layout-mode="editor-only"] .markstudio-pane--preview,
    #markstudio-root[data-layout-mode="editor-only"] .markstudio-gutter {
      display: none;
    }
    #markstudio-root[data-layout-mode="editor-only"] .markstudio-pane--editor {
      flex-grow: 1;
    }
    #markstudio-root[data-layout-mode="preview-only"] .markstudio-pane--editor,
    #markstudio-root[data-layout-mode="preview-only"] .markstudio-gutter {
      display: none;
    }
    #markstudio-root[data-layout-mode="preview-only"] .markstudio-pane--preview {
      flex-grow: 1;
    }
  `;
  document.head.append(style);
}
