import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "../editor/MarkStudioEditorProvider";
import { LinkIndexService } from "./LinkIndexService";
import {
  BACKLINKS_COMMAND_IDS,
  BACKLINKS_VIEW_ID,
  BacklinksTreeProvider
} from "./BacklinksTreeProvider";

// Wires the backlinks panel (T-4.1, M4.1): a native tree view backed by
// `BacklinksTreeProvider` over a workspace-wide `LinkIndexService`. It follows
// the active MarkStudio editor, refreshes as the link index changes, and opens
// the source note at the linking line when a backlink is clicked. Returns a
// single disposable owning every registration (mirrors `registerOutline`).
export function registerBacklinks(
  provider: MarkStudioEditorProvider
): vscode.Disposable {
  const service = new LinkIndexService();
  const treeProvider = new BacklinksTreeProvider(service);
  treeProvider.setActiveDocument(provider.getActiveDocument()?.uri ?? null);

  const treeView = vscode.window.createTreeView(BACKLINKS_VIEW_ID, {
    treeDataProvider: treeProvider
  });

  const updateMessage = (): void => {
    if (treeProvider.getActiveDocument() === null) {
      treeView.message = undefined;
      return;
    }
    if (treeProvider.backlinkCount > 0) {
      treeView.message = undefined;
      return;
    }
    treeView.message = service.isReady
      ? "No backlinks to this note."
      : "Indexing workspace…";
  };
  updateMessage();

  const activeSubscription = provider.onDidChangeActiveDocument((document) => {
    treeProvider.setActiveDocument(document?.uri ?? null);
    updateMessage();
  });

  const indexSubscription = service.onDidChangeIndex(() => {
    treeProvider.refresh();
    updateMessage();
  });

  const openCommand = vscode.commands.registerCommand(
    BACKLINKS_COMMAND_IDS.open,
    (uri: unknown, line: unknown) => {
      if (uri instanceof vscode.Uri && typeof line === "number") {
        void openSourceAtLine(uri, line);
      }
    }
  );

  // Begin watching + scanning. Intentionally not awaited — activation must not
  // block on the workspace scan (ROADMAP Phase 4 exit criterion).
  service.start();

  return vscode.Disposable.from(
    treeView,
    activeSubscription,
    indexSubscription,
    openCommand,
    treeProvider,
    service
  );
}

// Open the source note in a plain text editor and reveal the linking line. The
// custom editor is registered at `priority: "option"`, so `showTextDocument`
// opens the built-in text editor (which honours `selection`) rather than the
// MarkStudio webview — the reliable way to reveal a specific line in a file the
// user is navigating *to*.
async function openSourceAtLine(uri: vscode.Uri, line: number): Promise<void> {
  const document = await vscode.workspace.openTextDocument(uri);
  const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
  const position = new vscode.Position(safeLine, 0);
  await vscode.window.showTextDocument(document, {
    selection: new vscode.Range(position, position)
  });
}
