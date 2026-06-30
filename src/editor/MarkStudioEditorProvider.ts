import * as vscode from "vscode";
import { HostMessageBus } from "../messaging/HostMessageBus";
import { MarkStudioDocument } from "./MarkStudioDocument";
import { buildWebviewHtml } from "./webviewHtml";
import { findHeadingLine } from "../outline/headings";
import { extractExcerpt } from "../links/linkExcerpt";
import type { FocusablePane, LayoutMode } from "../messaging/messages";
import type { StateStore } from "../services/StateStore";
import type { ConfigurationService } from "../services/ConfigurationService";
import type { LinkIndexService } from "../links/LinkIndexService";

// One per resolved MarkStudio editor. Owns the typed `HostMessageBus` for
// that webview and exposes the operations commands need (layout-mode switch
// from T-106; toggle / focus seams from T-108). The provider holds a
// reference to the currently active controller so commands can target
// whichever MarkStudio editor has focus.
class MarkStudioEditorController {
  public constructor(private readonly bus: HostMessageBus) {}

  public setLayoutMode(mode: LayoutMode): void {
    this.bus.post({ type: "setLayoutMode", mode });
  }

  public togglePreview(): void {
    this.bus.post({ type: "togglePreview" });
  }

  public toggleSplit(): void {
    this.bus.post({ type: "toggleSplit" });
  }

  public focusPane(pane: FocusablePane): void {
    this.bus.post({ type: "focusPane", pane });
  }

  public revealLine(line: number): void {
    this.bus.post({ type: "revealLine", line });
  }
}

export type { MarkStudioEditorController };

// Bridges a VS Code custom text editor to the MarkStudio webview.
//
// All host ⇄ webview traffic flows through the typed `HostMessageBus` (T-103):
// the host sends `init` / `setContent` / `setLayoutMode` and receives
// `ready` / `edit`. Inbound payloads are validated at the bus boundary, so
// this provider only ever sees well-typed messages.
//
// Webview-originated `edit` messages carry a CodeMirror diff (T-104) and are
// applied through `MarkStudioDocument.applyChanges` (a `vscode.WorkspaceEdit`),
// so dirty state, undo/redo, save and revert integrate natively (ADR-0001,
// ADR-0002). External document changes (revert, on-disk edits, other editors)
// are pushed back to the webview as `setContent`.
export class MarkStudioEditorProvider
  implements vscode.CustomTextEditorProvider
{
  public static readonly viewType = "markstudio.editor";

  public static register(
    context: vscode.ExtensionContext,
    stateStore: StateStore,
    configService: ConfigurationService,
    linkIndexService: LinkIndexService
  ): {
    readonly provider: MarkStudioEditorProvider;
    readonly disposable: vscode.Disposable;
  } {
    const provider = new MarkStudioEditorProvider(
      context,
      stateStore,
      configService,
      linkIndexService
    );
    const registration = vscode.window.registerCustomEditorProvider(
      MarkStudioEditorProvider.viewType,
      provider,
      {
        // ADR-0002: keep DOM/JS state alive across tab switches.
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
    const disposable = vscode.Disposable.from(
      registration,
      provider.activeDocumentEmitter
    );
    return { provider, disposable };
  }

  private activeController: MarkStudioEditorController | null = null;
  private activeDocument: vscode.TextDocument | null = null;
  private readonly activeDocumentEmitter =
    new vscode.EventEmitter<vscode.TextDocument | null>();

  // Fires whenever the active MarkStudio editor changes (including to none, on
  // blur or dispose). The status-bar word-count indicator (T-2.4) listens here
  // so it can reflect — and hide for — the focused document.
  public readonly onDidChangeActiveDocument: vscode.Event<vscode.TextDocument | null> =
    this.activeDocumentEmitter.event;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly stateStore: StateStore,
    private readonly configService: ConfigurationService,
    private readonly linkIndexService: LinkIndexService
  ) {}

  public getActiveController(): MarkStudioEditorController | null {
    return this.activeController;
  }

  public getActiveDocument(): vscode.TextDocument | null {
    return this.activeDocument;
  }

  private setActiveDocument(document: vscode.TextDocument | null): void {
    if (this.activeDocument === document) {
      return;
    }
    this.activeDocument = document;
    this.activeDocumentEmitter.fire(document);
  }

  // Resolve a wiki-link clicked in the preview (T-4.1b) and open the target
  // note. `target` is resolved relative to the clicked note (`fromUri`) through
  // the shared `LinkIndexService` — the same resolver the Backlinks panel uses,
  // so navigation and backlinks agree. When a `heading` is given, the heading's
  // line is revealed (falling back to the top of the file if it is not found);
  // otherwise the file opens at line 0. An ambiguous basename opens the first
  // match; an unresolved target shows a transient status-bar message. If the
  // resolved target fails to open (e.g. it was deleted inside the watcher
  // debounce window, so the index still lists it), the same transient
  // status-bar fallback is shown. This method never throws — the caller invokes
  // it fire-and-forget via `void`. The note opens in the built-in text editor
  // (the custom editor is registered at `priority: "option"`, so
  // `showTextDocument` does not hijack it) — the reliable way to reveal a
  // specific line.
  private async openWikiLink(
    fromUri: vscode.Uri,
    target: string,
    heading: string | null
  ): Promise<void> {
    const matches = this.linkIndexService.resolveTarget(fromUri, target);
    if (matches.length === 0) {
      void vscode.window.setStatusBarMessage(
        `MarkStudio: no note found for [[${target}]]`,
        4000
      );
      return;
    }

    const targetUri = matches[0];

    try {
      const targetDocument = await vscode.workspace.openTextDocument(targetUri);

      let line = 0;
      if (heading !== null && heading.length > 0) {
        const headingLine = findHeadingLine(targetDocument.getText(), heading);
        if (headingLine >= 0) {
          line = headingLine;
        }
      }

      const safeLine = Math.max(
        0,
        Math.min(line, targetDocument.lineCount - 1)
      );
      const position = new vscode.Position(safeLine, 0);
      await vscode.window.showTextDocument(targetDocument, {
        selection: new vscode.Range(position, position)
      });
    } catch {
      // The index resolved a match, but opening it failed — e.g. the file was
      // deleted inside the FileSystemWatcher debounce window, so the in-memory
      // index still lists it. Degrade like the unresolved path: a transient
      // status-bar message, never a throw (the caller invokes this fire-and-
      // forget via `void`).
      void vscode.window.setStatusBarMessage(
        `MarkStudio: could not open note for [[${target}]]`,
        4000
      );
    }
  }

  // Resolve a hovered wiki-link (T-4.2) and reply with a capped Markdown
  // excerpt for the hover card. Resolution reuses the same shared
  // `LinkIndexService` resolver as click-navigation (open-first on an ambiguous
  // basename), so hover, click, and backlinks all agree. When a `heading` is
  // present the excerpt is that heading's section, else the top of the note
  // (see `extractExcerpt`). An unresolved target — or a read that fails (e.g.
  // the file was deleted inside the watcher debounce window, so the index still
  // lists it) — replies `status: "missing"`, so the webview shows a quiet
  // fallback. The host ships Markdown *text*, never HTML; the webview renders it
  // with its own `html: false` renderer (ADR-0022). This method never throws —
  // the caller invokes it fire-and-forget via `void`.
  private async requestLinkPreview(
    bus: HostMessageBus,
    fromUri: vscode.Uri,
    target: string,
    heading: string | null
  ): Promise<void> {
    const matches = this.linkIndexService.resolveTarget(fromUri, target);
    if (matches.length === 0) {
      bus.post({
        type: "linkPreviewContent",
        target,
        heading,
        status: "missing"
      });
      return;
    }

    const targetUri = matches[0];
    try {
      const targetDocument = await vscode.workspace.openTextDocument(targetUri);
      const text = extractExcerpt(targetDocument.getText(), heading);
      bus.post({
        type: "linkPreviewContent",
        target,
        heading,
        status: "ok",
        text,
        title: noteTitle(targetUri)
      });
    } catch {
      bus.post({
        type: "linkPreviewContent",
        target,
        heading,
        status: "missing"
      });
    }
  }

  public resolveCustomTextEditor(
    textDocument: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): void {
    const webview = webviewPanel.webview;
    const document = new MarkStudioDocument(textDocument);

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
        vscode.Uri.joinPath(this.context.extensionUri, "media")
      ]
    };

    // Assign the webview HTML exactly once (ADR-0002: never reassign).
    webview.html = buildWebviewHtml(webview, this.context.extensionUri);

    // Echo guard: when we apply a webview edit, `onDidChangeTextDocument`
    // fires with the same text. Skip pushing that back to avoid a feedback
    // loop and the caret jumps it would cause.
    let lastWebviewEditText: string | null = null;

    const sendInit = (): void => {
      bus.post({
        type: "init",
        text: document.getText(),
        config: this.configService.read(document.uri),
        initialLayoutMode: this.stateStore.getLayoutMode(document.uri)
      });
    };

    const bus = new HostMessageBus(
      webview,
      (message) => {
        switch (message.type) {
          case "ready":
            sendInit();
            return;
          case "edit":
            lastWebviewEditText = message.text;
            void document.applyChanges(message.changes);
            return;
          case "layoutModeChanged":
            void this.stateStore.setLayoutMode(document.uri, message.mode);
            return;
          case "openWikiLink":
            void this.openWikiLink(
              document.uri,
              message.target,
              message.heading
            );
            return;
          case "requestLinkPreview":
            void this.requestLinkPreview(
              bus,
              document.uri,
              message.target,
              message.heading
            );
            return;
          case "error":
            console.error(`[markstudio] webview error: ${message.message}`);
            return;
        }
      },
      (raw) => {
        console.warn("[markstudio] dropped malformed webview message", raw);
      }
    );

    const controller = new MarkStudioEditorController(bus);
    const activate = (): void => {
      this.activeController = controller;
      this.setActiveDocument(textDocument);
    };
    const deactivateIfCurrent = (): void => {
      if (this.activeController === controller) {
        this.activeController = null;
        this.setActiveDocument(null);
      }
    };
    if (webviewPanel.active) {
      activate();
    }
    const viewStateSubscription = webviewPanel.onDidChangeViewState((event) => {
      if (event.webviewPanel.active) {
        activate();
      } else {
        deactivateIfCurrent();
      }
    });

    const changeSubscription = vscode.workspace.onDidChangeTextDocument(
      (event) => {
        if (event.document.uri.toString() !== document.uri.toString()) {
          return;
        }
        if (
          lastWebviewEditText !== null &&
          event.document.getText() === lastWebviewEditText
        ) {
          // This change is the one we just applied on behalf of the webview;
          // the webview already has this text.
          return;
        }
        bus.post({ type: "setContent", text: document.getText() });
      }
    );

    // Push live `markstudio.*` setting changes to this webview (T-111). The
    // service holds no snapshot of its own, so we re-read per document URI to
    // honour resource-scoped overrides.
    const configSubscription = this.configService.onDidChange(() => {
      bus.post({
        type: "configChanged",
        config: this.configService.read(document.uri)
      });
    });

    webviewPanel.onDidDispose(() => {
      deactivateIfCurrent();
      viewStateSubscription.dispose();
      changeSubscription.dispose();
      configSubscription.dispose();
      bus.dispose();
    });

    // Send once immediately in case the webview is already initialized.
    sendInit();
  }
}

// The display title for a previewed note: its file basename with the Markdown
// extension stripped (e.g. `docs/Guide.md` → `Guide`). Used as the hover card's
// header (T-4.2).
function noteTitle(uri: vscode.Uri): string {
  const base = uri.path.substring(uri.path.lastIndexOf("/") + 1);
  return base.replace(/\.(md|markdown)$/i, "");
}
