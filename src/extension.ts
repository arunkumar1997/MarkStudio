import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "./editor/MarkStudioEditorProvider";
import { registerCommands } from "./commands/registerCommands";
import { registerOutline } from "./outline/registerOutline";
import { registerBacklinks } from "./links/registerBacklinks";
import { LinkIndexService } from "./links/LinkIndexService";
import { StateStore } from "./services/StateStore";
import { ConfigurationService } from "./services/ConfigurationService";
import { WordCountStatusBar } from "./status/WordCountStatusBar";

// Activation entry point. Registers the MarkStudio custom editor and the
// commands that drive it. Per ARCHITECTURE.md §4.1, this file only wires
// things together and contains no editor or rendering logic.
export function activate(context: vscode.ExtensionContext): void {
  const stateStore = new StateStore(context.workspaceState);
  const configService = new ConfigurationService();

  // A single workspace link index, shared by the Backlinks panel (T-4.1) and
  // in-preview wiki-link navigation (T-4.1b) so the workspace is scanned once.
  // Owned here: started below and disposed via `context.subscriptions`.
  const linkIndexService = new LinkIndexService();

  const { provider, disposable } = MarkStudioEditorProvider.register(
    context,
    stateStore,
    configService,
    linkIndexService
  );

  // Native status-bar word-count + reading-time indicator (T-2.4). It reflects
  // whichever MarkStudio editor is active and hides when none is.
  const wordCountStatusBar = new WordCountStatusBar();
  wordCountStatusBar.setActiveDocument(provider.getActiveDocument());

  // Begin watching + scanning. Intentionally not awaited — activation must not
  // block on the workspace scan (ROADMAP Phase 4 exit criterion).
  linkIndexService.start();

  context.subscriptions.push(
    disposable,
    registerCommands(provider),
    registerOutline(provider),
    registerBacklinks(provider, linkIndexService),
    linkIndexService,
    wordCountStatusBar,
    provider.onDidChangeActiveDocument((document) => {
      wordCountStatusBar.setActiveDocument(document);
    })
  );
}

export function deactivate(): void {
  // Nothing to clean up explicitly; disposables are owned by `context.subscriptions`.
}
