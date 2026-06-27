import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "../editor/MarkStudioEditorProvider";
import type { MarkStudioEditorController } from "../editor/MarkStudioEditorProvider";
import type { FocusablePane, LayoutMode } from "../messaging/messages";

// Command identifiers contributed in package.json. Keeping them in one place
// avoids the magic-string problem in CODING_GUIDELINES.md §4.
export const LAYOUT_COMMAND_IDS = {
  showSplit: "markstudio.layout.showSplit",
  showEditorOnly: "markstudio.layout.showEditorOnly",
  showPreviewOnly: "markstudio.layout.showPreviewOnly"
} as const;

export const COMMAND_IDS = {
  openMarkStudio: "markstudio.openMarkStudio",
  togglePreview: "markstudio.togglePreview",
  toggleSplit: "markstudio.toggleSplit",
  focusEditor: "markstudio.focusEditor",
  focusPreview: "markstudio.focusPreview"
} as const;

const MARKDOWN_LANGUAGE_ID = "markdown";

// Registers the MarkStudio commands and returns a single disposable that
// owns every registration. The commands target whichever MarkStudio editor
// is currently active; if none is, they surface an info message instead of
// failing silently.
export function registerCommands(
  provider: MarkStudioEditorProvider
): vscode.Disposable {
  return vscode.Disposable.from(
    vscode.commands.registerCommand(LAYOUT_COMMAND_IDS.showSplit, () => {
      applyLayout(provider, "split");
    }),
    vscode.commands.registerCommand(LAYOUT_COMMAND_IDS.showEditorOnly, () => {
      applyLayout(provider, "editor-only");
    }),
    vscode.commands.registerCommand(LAYOUT_COMMAND_IDS.showPreviewOnly, () => {
      applyLayout(provider, "preview-only");
    }),
    vscode.commands.registerCommand(COMMAND_IDS.openMarkStudio, () => {
      void openInMarkStudio();
    }),
    vscode.commands.registerCommand(COMMAND_IDS.togglePreview, () => {
      withController(provider, (controller) => controller.togglePreview());
    }),
    vscode.commands.registerCommand(COMMAND_IDS.toggleSplit, () => {
      withController(provider, (controller) => controller.toggleSplit());
    }),
    vscode.commands.registerCommand(COMMAND_IDS.focusEditor, () => {
      focusPane(provider, "editor");
    }),
    vscode.commands.registerCommand(COMMAND_IDS.focusPreview, () => {
      focusPane(provider, "preview");
    })
  );
}

function applyLayout(
  provider: MarkStudioEditorProvider,
  mode: LayoutMode
): void {
  withController(provider, (controller) => controller.setLayoutMode(mode));
}

function focusPane(
  provider: MarkStudioEditorProvider,
  pane: FocusablePane
): void {
  withController(provider, (controller) => controller.focusPane(pane));
}

function withController(
  provider: MarkStudioEditorProvider,
  action: (controller: MarkStudioEditorController) => void
): void {
  const controller = provider.getActiveController();
  if (controller === null) {
    void vscode.window.showInformationMessage(
      "MarkStudio: open a Markdown file in the MarkStudio editor first."
    );
    return;
  }
  action(controller);
}

// Reopens the active Markdown text editor in the MarkStudio custom editor.
// Falls back to an info message if no Markdown file is the active editor.
async function openInMarkStudio(): Promise<void> {
  const active = vscode.window.activeTextEditor;
  if (active?.document.languageId !== MARKDOWN_LANGUAGE_ID) {
    void vscode.window.showInformationMessage(
      "MarkStudio: open a Markdown file first, then run this command."
    );
    return;
  }
  await vscode.commands.executeCommand(
    "vscode.openWith",
    active.document.uri,
    MarkStudioEditorProvider.viewType
  );
}
