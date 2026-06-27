import * as vscode from "vscode";
import {
  isWebviewToHostMessage,
  type HostToWebviewMessage,
  type WebviewToHostMessage
} from "./messages";

// Host-side typed wrapper around `webview.postMessage` /
// `webview.onDidReceiveMessage` (ARCHITECTURE.md §6, CODING_GUIDELINES.md §9).
//
// All inbound payloads are validated through `isWebviewToHostMessage` before
// reaching the handler — anything else is reported through `onInvalid` (or
// silently dropped if no handler is given). The bus owns its `vscode.Disposable`
// subscription, so the caller only has to dispose the bus itself.
//
// A separate `WebviewMessageBus` mirrors this surface inside the webview
// bundle. The split exists because the host bundle imports `vscode` and the
// webview bundle does not — sharing a single file would force one bundle to
// pull in the other's runtime.
export class HostMessageBus implements vscode.Disposable {
  private readonly subscription: vscode.Disposable;

  public constructor(
    private readonly webview: vscode.Webview,
    onMessage: (message: WebviewToHostMessage) => void,
    onInvalid?: (raw: unknown) => void
  ) {
    this.subscription = this.webview.onDidReceiveMessage((raw: unknown) => {
      if (isWebviewToHostMessage(raw)) {
        onMessage(raw);
        return;
      }
      onInvalid?.(raw);
    });
  }

  public post(message: HostToWebviewMessage): void {
    void this.webview.postMessage(message);
  }

  public dispose(): void {
    this.subscription.dispose();
  }
}
