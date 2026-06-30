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
// the source note in MarkStudio at the linking line when a backlink is clicked
// (ADR-0021). Returns a single disposable owning every registration (mirrors
// `registerOutline`).
//
// The `LinkIndexService` is **injected** (owned by `extension.ts`) so the same
// index backs both this panel and in-preview wiki-link navigation (T-4.1b)
// without a second workspace scan. This function does not start or dispose it.
export function registerBacklinks(
  provider: MarkStudioEditorProvider,
  service: LinkIndexService
): vscode.Disposable {
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
        void openSourceInMarkStudio(provider, uri, line);
      }
    }
  );

  // The service is started and disposed by `extension.ts` (it is shared with
  // in-preview wiki-link navigation), so this disposable does not include it.
  return vscode.Disposable.from(
    treeView,
    activeSubscription,
    indexSubscription,
    openCommand,
    treeProvider
  );
}

// Open the source note in MarkStudio and reveal the linking line. Click-
// navigation and the Backlinks panel both open `.md` targets in the MarkStudio
// custom editor — the markdown experience — rather than the built-in text
// editor (ADR-0021). Because a MarkStudio editor is a webview, the line cannot
// ride `showTextDocument`'s `selection`; the provider reveals it through a
// host → webview `revealLine` message (the pending-reveal handshake), focusing
// the existing editor when the note is already open. The line is clamped to the
// source document here, where its length is known. Degrades to a transient
// status-bar message if the source fails to open (e.g. it was deleted inside
// the watcher debounce window, so the index still lists it); never throws — the
// caller invokes it fire-and-forget via `void`.
async function openSourceInMarkStudio(
  provider: MarkStudioEditorProvider,
  uri: vscode.Uri,
  line: number
): Promise<void> {
  try {
    const document = await vscode.workspace.openTextDocument(uri);
    const safeLine = Math.max(0, Math.min(line, document.lineCount - 1));
    await provider.openInMarkStudio(uri, safeLine);
  } catch {
    void vscode.window.setStatusBarMessage(
      "MarkStudio: could not open the source note.",
      4000
    );
  }
}
