// MarkStudio Toolbar (T-107).
//
// A small, vanilla-DOM toolbar that mounts inside the App Shell and drives
// the three layout modes through `AppShell.setLayoutMode`. The buttons are
// rendered with VS Code Codicons (loaded via the stylesheet wired up in
// `editor/webviewHtml.ts`) and themed entirely through `--vscode-*`
// variables — no hardcoded colors, fonts or sizes (ADR-0004, ADR-0005).
//
// The toolbar is a *visual* trigger only: pressing a button calls back into
// the shell, which is the single source of truth for the current mode. The
// command-palette commands in `src/commands/registerCommands.ts` reach the
// same `setLayoutMode` via the host → webview `setLayoutMode` message, so
// both paths converge on one code path.

import type { LayoutMode } from "../../messaging/messages";

export interface ToolbarOptions {
  readonly initialMode: LayoutMode;
  readonly onSelectMode: (mode: LayoutMode) => void;
}

export interface Toolbar {
  readonly element: HTMLElement;
  setActiveMode(mode: LayoutMode): void;
  destroy(): void;
}

interface LayoutButtonSpec {
  readonly mode: LayoutMode;
  readonly icon: string;
  readonly label: string;
}

const LAYOUT_BUTTONS: ReadonlyArray<LayoutButtonSpec> = [
  {
    mode: "editor-only",
    icon: "codicon-edit",
    label: "Show editor only"
  },
  {
    mode: "split",
    icon: "codicon-split-horizontal",
    label: "Show editor and preview"
  },
  {
    mode: "preview-only",
    icon: "codicon-preview",
    label: "Show preview only"
  }
];

export function createToolbar(options: ToolbarOptions): Toolbar {
  injectToolbarStyles();

  const element = document.createElement("div");
  element.className = "markstudio-toolbar";
  element.setAttribute("role", "toolbar");
  element.setAttribute("aria-label", "MarkStudio layout");

  const group = document.createElement("div");
  group.className = "markstudio-toolbar__group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Layout mode");
  element.append(group);

  const buttonsByMode = new Map<LayoutMode, HTMLButtonElement>();

  for (const spec of LAYOUT_BUTTONS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "markstudio-toolbar__button";
    button.title = spec.label;
    button.setAttribute("aria-label", spec.label);
    button.setAttribute("aria-pressed", "false");
    button.dataset.mode = spec.mode;

    const icon = document.createElement("span");
    icon.className = `codicon ${spec.icon}`;
    icon.setAttribute("aria-hidden", "true");
    button.append(icon);

    button.addEventListener("click", () => {
      options.onSelectMode(spec.mode);
    });

    group.append(button);
    buttonsByMode.set(spec.mode, button);
  }

  function setActiveMode(mode: LayoutMode): void {
    for (const [candidate, button] of buttonsByMode) {
      const active = candidate === mode;
      button.setAttribute("aria-pressed", active ? "true" : "false");
      button.classList.toggle("markstudio-toolbar__button--active", active);
    }
  }

  setActiveMode(options.initialMode);

  return {
    element,
    setActiveMode,
    destroy(): void {
      element.remove();
    }
  };
}

let stylesInjected = false;

function injectToolbarStyles(): void {
  if (stylesInjected) {
    return;
  }
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .markstudio-toolbar {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px;
      border-bottom: 1px solid var(--vscode-editorGroup-border, var(--vscode-panel-border, transparent));
      background-color: var(--vscode-editorWidget-background, var(--vscode-editor-background));
      color: var(--vscode-foreground);
    }
    .markstudio-toolbar__group {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    .markstudio-toolbar__button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: 1px solid transparent;
      border-radius: 4px;
      background: transparent;
      color: var(--vscode-icon-foreground, var(--vscode-foreground));
      cursor: pointer;
      font: inherit;
    }
    .markstudio-toolbar__button:hover {
      background-color: var(--vscode-toolbar-hoverBackground, transparent);
    }
    .markstudio-toolbar__button:focus-visible {
      outline: 1px solid var(--vscode-focusBorder, transparent);
      outline-offset: -1px;
    }
    .markstudio-toolbar__button--active {
      background-color: var(--vscode-toolbar-activeBackground, var(--vscode-toolbar-hoverBackground, transparent));
      color: var(--vscode-foreground);
    }
    .markstudio-toolbar__button .codicon {
      font-size: 16px;
      line-height: 1;
    }
  `;
  document.head.append(style);
}
