import * as vscode from "vscode";
import { computeDocumentStats, type DocumentStats } from "./wordCount";

// Native VS Code status-bar word-count + reading-time indicator (T-2.4,
// Phase 2 M2.4). The host owns the document text (ADR-0001), so the count is
// computed entirely host-side from the active MarkStudio document — no webview
// message or DOM is involved. This follows "prefer VS Code integration; less
// UI is better": a built-in status-bar item rather than custom webview chrome.
//
// `setActiveDocument` is driven by `MarkStudioEditorProvider`'s active-editor
// tracking; the item is shown only while a MarkStudio editor is active and
// hidden otherwise. Re-counts on edit are debounced so typing never blocks on
// the count for a large file (ARCHITECTURE.md §8).

const RENDER_DEBOUNCE_MS = 250;
const STATUS_BAR_PRIORITY = 100;

export class WordCountStatusBar {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private activeDocument: vscode.TextDocument | null = null;
  private debounceHandle: ReturnType<typeof setTimeout> | null = null;

  public constructor() {
    this.item = vscode.window.createStatusBarItem(
      "markstudio.wordCount",
      vscode.StatusBarAlignment.Right,
      STATUS_BAR_PRIORITY
    );
    this.item.name = "MarkStudio Word Count";
    this.disposables.push(
      this.item,
      vscode.workspace.onDidChangeTextDocument((event) => {
        if (
          this.activeDocument !== null &&
          event.document.uri.toString() === this.activeDocument.uri.toString()
        ) {
          this.scheduleRender();
        }
      })
    );
  }

  // Switch the document the indicator reflects. `null` hides the item (no
  // MarkStudio editor is active). Renders immediately so the count is correct
  // the moment focus lands on an editor.
  public setActiveDocument(document: vscode.TextDocument | null): void {
    this.activeDocument = document;
    this.cancelScheduledRender();
    this.render();
  }

  public dispose(): void {
    this.cancelScheduledRender();
    vscode.Disposable.from(...this.disposables).dispose();
  }

  private scheduleRender(): void {
    this.cancelScheduledRender();
    this.debounceHandle = setTimeout(() => {
      this.debounceHandle = null;
      this.render();
    }, RENDER_DEBOUNCE_MS);
  }

  private cancelScheduledRender(): void {
    if (this.debounceHandle !== null) {
      clearTimeout(this.debounceHandle);
      this.debounceHandle = null;
    }
  }

  private render(): void {
    const document = this.activeDocument;
    if (document === null) {
      this.item.hide();
      return;
    }
    const stats = computeDocumentStats(document.getText());
    const wordLabel = stats.words === 1 ? "word" : "words";
    this.item.text = `$(book) ${stats.words.toLocaleString()} ${wordLabel}`;
    this.item.tooltip = buildTooltip(stats);
    this.item.show();
  }
}

function buildTooltip(stats: DocumentStats): string {
  const parts = [
    `${stats.words.toLocaleString()} words`,
    `${stats.characters.toLocaleString()} characters`
  ];
  if (stats.readingMinutes > 0) {
    parts.push(`${stats.readingMinutes} min read`);
  }
  return parts.join(" · ");
}
