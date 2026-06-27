import * as vscode from "vscode";
import type { MarkStudioConfig } from "../messaging/messages";

// Reads `markstudio.*` settings reactively (T-111).
//
// "Native beats custom" ([.ai/CONTEXT.md] §3.1): the service is a thin reader
// over VS Code's Configuration API. It never caches a snapshot of its own —
// every `read` asks `workspace.getConfiguration` for the live, merged value
// (user / workspace / folder), and `onDidChange` simply notifies callers when
// any `markstudio.*` key changes so they can re-read. The provider re-reads
// per document URI so resource-scoped overrides are honoured (ADR-0004).
const SECTION = "markstudio";

export class ConfigurationService {
  // Resolve the current MarkStudio settings for an optional resource. Passing
  // the document URI lets folder- / language-scoped overrides win; omit it for
  // the window-level value.
  public read(resource?: vscode.Uri): MarkStudioConfig {
    const config = vscode.workspace.getConfiguration(SECTION, resource ?? null);
    return {
      lineNumbers: config.get<boolean>("editor.lineNumbers", true),
      wordWrap: config.get<boolean>("editor.wordWrap", true),
      math: config.get<boolean>("preview.math", true),
      mermaid: config.get<boolean>("preview.mermaid", true),
      callouts: config.get<boolean>("preview.callouts", true),
      wikiLinks: config.get<boolean>("preview.wikiLinks", true),
      footnotes: config.get<boolean>("preview.footnotes", true),
      taskLists: config.get<boolean>("preview.taskLists", true),
      tables: config.get<boolean>("preview.tables", true),
      strikethrough: config.get<boolean>("preview.strikethrough", true)
    };
  }

  // Invoke `listener` whenever any `markstudio.*` setting changes. Callers
  // re-read with `read(resource)` to obtain the new snapshot. Returns a
  // `Disposable` the caller owns.
  public onDidChange(listener: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(SECTION)) {
        listener();
      }
    });
  }
}
