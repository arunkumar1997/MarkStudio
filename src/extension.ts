import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "./editor/MarkStudioEditorProvider";
import { registerCommands } from "./commands/registerCommands";
import { StateStore } from "./services/StateStore";
import { ConfigurationService } from "./services/ConfigurationService";

// Activation entry point. Registers the MarkStudio custom editor and the
// commands that drive it. Per ARCHITECTURE.md §4.1, this file only wires
// things together and contains no editor or rendering logic.
export function activate(context: vscode.ExtensionContext): void {
  const stateStore = new StateStore(context.workspaceState);
  const configService = new ConfigurationService();
  const { provider, disposable } = MarkStudioEditorProvider.register(
    context,
    stateStore,
    configService
  );
  context.subscriptions.push(disposable, registerCommands(provider));
}

export function deactivate(): void {
  // Nothing to clean up explicitly; disposables are owned by `context.subscriptions`.
}
