import * as vscode from "vscode";
import { buildHeadingTree, parseHeadings, type OutlineNode } from "./headings";

// The view id contributed under `contributes.views` in package.json. Keeping
// it next to the provider avoids the magic-string problem (CODING_GUIDELINES
// §4) and ties the manifest entry to its implementation.
export const OUTLINE_VIEW_ID = "markstudio.outline";

// Internal command the tree items invoke to navigate the editor. Registered at
// runtime (see registerOutline); it is not contributed to the command palette
// because it only makes sense as a click target.
export const OUTLINE_COMMAND_IDS = {
  reveal: "markstudio.outline.reveal"
} as const;

// Host-side document outline for MarkStudio (T-2.2, M2.2).
//
// VS Code's built-in Outline view / breadcrumbs are driven by
// `vscode.window.activeTextEditor`, which is `undefined` while a custom editor
// is focused, so a plain `DocumentSymbolProvider` does not surface for
// MarkStudio (ADR-0014). Instead this `TreeDataProvider` backs a dedicated
// native tree view that reflects whichever MarkStudio document is active and
// rebuilds its heading tree as the document changes.
export class OutlineTreeProvider
  implements vscode.TreeDataProvider<OutlineNode>, vscode.Disposable
{
  private readonly changeEmitter = new vscode.EventEmitter<
    OutlineNode | undefined
  >();

  public readonly onDidChangeTreeData: vscode.Event<OutlineNode | undefined> =
    this.changeEmitter.event;

  private document: vscode.TextDocument | null = null;
  private roots: OutlineNode[] = [];
  private totalHeadings = 0;

  // The document whose outline is currently shown, or `null` when no
  // MarkStudio editor is active.
  public getActiveDocument(): vscode.TextDocument | null {
    return this.document;
  }

  // Number of headings in the current outline (across all nesting levels).
  // Used to drive the view's empty-state message.
  public get headingCount(): number {
    return this.totalHeadings;
  }

  // Point the outline at a new document (or clear it). Rebuilds and refreshes.
  public setActiveDocument(document: vscode.TextDocument | null): void {
    this.document = document;
    this.rebuild();
  }

  // Recompute the outline for the current document (e.g. after an edit).
  public refresh(): void {
    this.rebuild();
  }

  public getChildren(element?: OutlineNode): OutlineNode[] {
    return element ? element.children : this.roots;
  }

  public getTreeItem(element: OutlineNode): vscode.TreeItem {
    const { heading, children } = element;
    const item = new vscode.TreeItem(
      heading.text === "" ? "(untitled heading)" : heading.text,
      children.length > 0
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None
    );
    item.tooltip = `Heading ${heading.level}`;
    item.iconPath = new vscode.ThemeIcon("symbol-string");
    item.command = {
      command: OUTLINE_COMMAND_IDS.reveal,
      title: "Go to Heading",
      arguments: [heading.line]
    };
    return item;
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }

  private rebuild(): void {
    if (this.document === null) {
      this.roots = [];
      this.totalHeadings = 0;
    } else {
      const headings = parseHeadings(this.document.getText());
      this.roots = buildHeadingTree(headings);
      this.totalHeadings = headings.length;
    }
    this.changeEmitter.fire(undefined);
  }
}
