import * as vscode from "vscode";

// Thin wrapper over a `vscode.TextDocument` that funnels every write through a
// `WorkspaceEdit`, so dirty state, undo/redo, save and revert integrate with
// VS Code natively (ARCHITECTURE.md §4.1, ADR-0001).
export class MarkStudioDocument {
  public constructor(private readonly document: vscode.TextDocument) {}

  public get uri(): vscode.Uri {
    return this.document.uri;
  }

  public get version(): number {
    return this.document.version;
  }

  public getText(): string {
    return this.document.getText();
  }

  // Replace the entire document with `newText`. Returns true on success.
  // No-ops (returns true) when the text already matches, so identical echoes
  // never bump the document version. Kept available for future reconciliation
  // paths (e.g., external file changes — T-110); editing through the webview
  // now flows through `applyChanges`.
  public async replaceAll(newText: string): Promise<boolean> {
    const currentText = this.document.getText();
    if (newText === currentText) {
      return true;
    }

    const fullRange = new vscode.Range(
      this.document.positionAt(0),
      this.document.positionAt(currentText.length)
    );

    const edit = new vscode.WorkspaceEdit();
    edit.replace(this.document.uri, fullRange, newText);
    return vscode.workspace.applyEdit(edit);
  }

  // Apply a batch of minimal changes (the diff form sent by CodeMirror, T-104).
  // `from`/`to` are character offsets into the **pre-change** document; each
  // change replaces the slice `[from, to)` with `insert`. VS Code's
  // `WorkspaceEdit` resolves every range against the original document state,
  // so non-overlapping CM6 change ranges map directly without reindexing.
  public async applyChanges(
    changes: ReadonlyArray<{ readonly from: number; readonly to: number; readonly insert: string }>
  ): Promise<boolean> {
    if (changes.length === 0) {
      return true;
    }
    const edit = new vscode.WorkspaceEdit();
    for (const change of changes) {
      const range = new vscode.Range(
        this.document.positionAt(change.from),
        this.document.positionAt(change.to)
      );
      edit.replace(this.document.uri, range, change.insert);
    }
    return vscode.workspace.applyEdit(edit);
  }
}
