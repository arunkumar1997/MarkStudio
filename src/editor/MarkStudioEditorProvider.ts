import * as vscode from "vscode";
import { HostMessageBus } from "../messaging/HostMessageBus";
import { MarkStudioDocument } from "./MarkStudioDocument";
import { buildWebviewHtml } from "./webviewHtml";
import type { FocusablePane, LayoutMode } from "../messaging/messages";
import type { StateStore } from "../services/StateStore";
import type { ConfigurationService } from "../services/ConfigurationService";

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
    configService: ConfigurationService
  ): {
    readonly provider: MarkStudioEditorProvider;
    readonly disposable: vscode.Disposable;
  } {
    const provider = new MarkStudioEditorProvider(
      context,
      stateStore,
      configService
    );
    const disposable = vscode.window.registerCustomEditorProvider(
      MarkStudioEditorProvider.viewType,
      provider,
      {
        // ADR-0002: keep DOM/JS state alive across tab switches.
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
    return { provider, disposable };
  }

  private activeController: MarkStudioEditorController | null = null;

  private constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly stateStore: StateStore,
    private readonly configService: ConfigurationService
  ) {}

  public getActiveController(): MarkStudioEditorController | null {
    return this.activeController;
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
    if (webviewPanel.active) {
      this.activeController = controller;
    }
    const viewStateSubscription = webviewPanel.onDidChangeViewState((event) => {
      if (event.webviewPanel.active) {
        this.activeController = controller;
      } else if (this.activeController === controller) {
        this.activeController = null;
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
      if (this.activeController === controller) {
        this.activeController = null;
      }
      viewStateSubscription.dispose();
      changeSubscription.dispose();
      configSubscription.dispose();
      bus.dispose();
    });

    // Send once immediately in case the webview is already initialized.
    sendInit();
  }
}
