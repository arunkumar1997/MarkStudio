import * as vscode from "vscode";
import { MarkStudioEditorProvider } from "../editor/MarkStudioEditorProvider";
import {
  OUTLINE_COMMAND_IDS,
  OUTLINE_VIEW_ID,
  OutlineTreeProvider
} from "./OutlineTreeProvider";

// Headings change far less often than text, so coalesce edit-driven rebuilds.
// Short enough to feel live, long enough that a burst of keystrokes rebuilds
// the tree once.
const REFRESH_DEBOUNCE_MS = 300;

// Wires the document outline (T-2.2, M2.2): a native tree view backed by
// `OutlineTreeProvider` that follows the active MarkStudio editor, rebuilds as
// the document changes, and navigates the editor when a heading is clicked.
// Returns a single disposable owning every registration.
export function registerOutline(
  provider: MarkStudioEditorProvider
): vscode.Disposable {
  const treeProvider = new OutlineTreeProvider();
  treeProvider.setActiveDocument(provider.getActiveDocument());

  const treeView = vscode.window.createTreeView(OUTLINE_VIEW_ID, {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });

  const updateMessage = (): void => {
    treeView.message =
      treeProvider.getActiveDocument() !== null &&
      treeProvider.headingCount === 0
        ? "No headings in this document."
        : undefined;
  };
  updateMessage();

  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRefresh = (): void => {
    if (refreshTimer !== undefined) {
      return;
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = undefined;
      treeProvider.refresh();
      updateMessage();
    }, REFRESH_DEBOUNCE_MS);
  };

  const activeSubscription = provider.onDidChangeActiveDocument((document) => {
    treeProvider.setActiveDocument(document);
    updateMessage();
  });

  const editSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
    const active = treeProvider.getActiveDocument();
    if (active && event.document.uri.toString() === active.uri.toString()) {
      scheduleRefresh();
    }
  });

  const revealCommand = vscode.commands.registerCommand(
    OUTLINE_COMMAND_IDS.reveal,
    (line: unknown) => {
      if (typeof line === "number") {
        provider.getActiveController()?.revealLine(line);
      }
    }
  );

  return vscode.Disposable.from(
    treeView,
    activeSubscription,
    editSubscription,
    revealCommand,
    {
      dispose: (): void => {
        if (refreshTimer !== undefined) {
          clearTimeout(refreshTimer);
          refreshTimer = undefined;
        }
      }
    },
    treeProvider
  );
}
