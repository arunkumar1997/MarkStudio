import * as vscode from "vscode";
import type { LinkIndexService, ResolvedBacklink } from "./LinkIndexService";

// The view id contributed under `contributes.views` in package.json. Kept next
// to the provider to avoid the magic-string problem (CODING_GUIDELINES §4) and
// tie the manifest entry to its implementation. Mirrors the Outline (ADR-0014).
export const BACKLINKS_VIEW_ID = "markstudio.backlinks";

// Internal command a tree item invokes to open its source note at the linking
// line. Registered at runtime (see registerBacklinks); not contributed to the
// palette because it only makes sense as a click target.
export const BACKLINKS_COMMAND_IDS = {
  open: "markstudio.backlinks.open"
} as const;

// Host-side backlinks panel for MarkStudio (T-4.1, M4.1).
//
// Like the Outline (ADR-0014), VS Code has no native "what links here" surface
// for a custom editor, so this `TreeDataProvider` backs a dedicated tree view
// that reflects whichever MarkStudio document is active. It lists every other
// workspace note that links to the active note via a wiki-link, one node per
// source note + linking line, and rebuilds when the link index changes.
export class BacklinksTreeProvider
  implements vscode.TreeDataProvider<ResolvedBacklink>, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<
    ResolvedBacklink | undefined
  >();

  public readonly onDidChangeTreeData: vscode.Event<
    ResolvedBacklink | undefined
  > = this.changeEmitter.event;

  private documentUri: vscode.Uri | null = null;
  private backlinks: ResolvedBacklink[] = [];

  public constructor(private readonly service: LinkIndexService) {}

  // The document whose backlinks are shown, or `null` when no MarkStudio editor
  // is active.
  public getActiveDocument(): vscode.Uri | null {
    return this.documentUri;
  }

  // Number of backlinks to the active note. Drives the empty-state message.
  public get backlinkCount(): number {
    return this.backlinks.length;
  }

  // Point the panel at a new document (or clear it). Recomputes and refreshes.
  public setActiveDocument(uri: vscode.Uri | null): void {
    this.documentUri = uri;
    this.rebuild();
  }

  // Recompute the active note's backlinks (e.g. after the index changed).
  public refresh(): void {
    this.rebuild();
  }

  public getChildren(element?: ResolvedBacklink): ResolvedBacklink[] {
    // A flat list — file-level grouping, one node per linking line (plan §4).
    return element ? [] : this.backlinks;
  }

  public getTreeItem(element: ResolvedBacklink): vscode.TreeItem {
    const item = new vscode.TreeItem(
      noteName(element.sourceUri),
      vscode.TreeItemCollapsibleState.None
    );
    const lineLabel = `line ${element.line + 1}`;
    item.description =
      element.snippet.length > 0
        ? `${lineLabel} · ${element.snippet}`
        : lineLabel;
    item.tooltip = new vscode.MarkdownString(
      `${vscode.workspace.asRelativePath(element.sourceUri)} · ${lineLabel}\n\n${
        element.snippet
      }`
    );
    item.resourceUri = element.sourceUri;
    item.iconPath = new vscode.ThemeIcon(
      element.kind === "markdown" ? "link" : "symbol-reference"
    );
    item.command = {
      command: BACKLINKS_COMMAND_IDS.open,
      title: "Open Source Note",
      arguments: [element.sourceUri, element.line]
    };
    return item;
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  private rebuild(): void {
    this.backlinks =
      this.documentUri === null
        ? []
        : this.service.backlinksFor(this.documentUri);
    this.changeEmitter.fire(undefined);
  }
}

// The display name for a source note: its file name (basename). Mirrors how the
// Explorer labels files.
function noteName(uri: vscode.Uri): string {
  const path = uri.path;
  const slash = path.lastIndexOf("/");
  return slash === -1 ? path : path.slice(slash + 1);
}
