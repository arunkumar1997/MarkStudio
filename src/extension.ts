import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "./editor/MarkStudioEditorProvider";
import { registerCommands } from "./commands/registerCommands";
import { registerTemplates } from "./commands/registerTemplates";
import { registerOutline } from "./outline/registerOutline";
import { registerBacklinks } from "./links/registerBacklinks";
import { LinkIndexService } from "./links/LinkIndexService";
import { TemplateService } from "./templates/TemplateService";
import { GraphService } from "./graph/GraphService";
import { StateStore } from "./services/StateStore";
import { ConfigurationService } from "./services/ConfigurationService";
import { WordCountStatusBar } from "./status/WordCountStatusBar";

// The activation API surface. Currently used only by the Extension Host
// navigation tests so they can drive the provider's open paths directly (the
// in-preview click is webview-originated and not reachable from a host test).
// Not contributed to consumers and intentionally undocumented as a stable
// extension API.
export interface MarkStudioExtensionApi {
  readonly provider: MarkStudioEditorProvider;
  readonly graphService: GraphService;
  readonly templateService: TemplateService;
}

// Activation entry point. Registers the MarkStudio custom editor and the
// commands that drive it. Per ARCHITECTURE.md §4.1, this file only wires
// things together and contains no editor or rendering logic.
export function activate(
  context: vscode.ExtensionContext
): MarkStudioExtensionApi {
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

  // M4.4 Graph View — free-standing webview panel, lazy `dist/graph.js` bundle
  // (ADR-0023). Surfaced only via the `markstudio.graph.show` command; the
  // panel is created on first invocation and reused thereafter
  // (`retainContextWhenHidden`).
  const { service: graphService, disposable: graphCommand } =
    GraphService.register(context, provider, linkIndexService);

  // Phase 5 — Templates engine + Daily Notes (M5.1 + M5.3, ADR-0025). A single
  // host-side service owns both template roots' watchers + async scan; the
  // commands drive a native QuickPick / InputBox and open created notes in
  // MarkStudio via `provider.openInMarkStudio`.
  const templateService = new TemplateService(context, provider);
  templateService.start();

  context.subscriptions.push(
    disposable,
    registerCommands(provider),
    registerOutline(provider),
    registerBacklinks(provider, linkIndexService),
    linkIndexService,
    graphService,
    graphCommand,
    templateService,
    registerTemplates(templateService),
    wordCountStatusBar,
    provider.onDidChangeActiveDocument((document) => {
      wordCountStatusBar.setActiveDocument(document);
    })
  );

  return { provider, graphService, templateService };
}

export function deactivate(): void {
  // Nothing to clean up explicitly; disposables are owned by `context.subscriptions`.
}
