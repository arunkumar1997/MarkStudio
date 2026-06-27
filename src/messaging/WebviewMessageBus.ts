import {
  isHostToWebviewMessage,
  type HostToWebviewMessage,
  type WebviewToHostMessage
} from "./messages";

// Minimal subset of the API returned by `acquireVsCodeApi()` inside a webview.
// Declared here so the webview bundle does not depend on `@types/vscode`
// (which is host-only).
interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

// Webview-side mirror of `HostMessageBus`. Validates inbound messages from the
// host before invoking the handler; invalid payloads are surfaced through
// `onInvalid` (or silently dropped if absent).
//
// The instance owns its `message` listener and the `acquireVsCodeApi()` handle.
// `acquireVsCodeApi()` may only be called once per webview, so callers should
// construct exactly one bus per page (see ADR-0002).
export class WebviewMessageBus {
  private readonly api: VsCodeApi;
  private readonly listener: (event: MessageEvent<unknown>) => void;

  public constructor(
    onMessage: (message: HostToWebviewMessage) => void,
    onInvalid?: (raw: unknown) => void
  ) {
    this.api = acquireVsCodeApi();
    this.listener = (event: MessageEvent<unknown>): void => {
      const data = event.data;
      if (isHostToWebviewMessage(data)) {
        onMessage(data);
        return;
      }
      onInvalid?.(data);
    };
    window.addEventListener("message", this.listener);
  }

  public post(message: WebviewToHostMessage): void {
    this.api.postMessage(message);
  }

  public getState(): unknown {
    return this.api.getState();
  }

  public setState(state: unknown): void {
    this.api.setState(state);
  }

  public dispose(): void {
    window.removeEventListener("message", this.listener);
  }
}
