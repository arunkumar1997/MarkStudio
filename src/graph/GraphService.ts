import * as vscode from "vscode";
import type {
  HostToWebviewMessage,
  WebviewToHostMessage
} from "../messaging/messages";
import { buildGraph } from "./graphModel";
import { buildGraphWebviewHtml } from "./webviewHtml";
import type { LinkIndexService } from "../links/LinkIndexService";
import type { MarkStudioEditorProvider } from "../editor/MarkStudioEditorProvider";

// M4.4 Graph View — host-side controller for the workspace graph panel.
//
// Owns:
//   • a single `vscode.WebviewPanel` (free-standing — no document backs it;
//     ADR-0023). `retainContextWhenHidden` so positions and pan/zoom survive
//     when the panel is moved out of view.
//   • the `markstudio.graph.show` command (the only surface — no setting,
//     no view-container, per Producer decision in `docs/sprint-5/plan.md` §4).
//   • the subscription to `LinkIndexService.onDidChangeIndex` and the
//     provider's active-document signal that produce a fresh `graphData`.
//
// Communication with the webview is via the same typed `HostToWebviewMessage`
// / `WebviewToHostMessage` contract the editor webview uses (`messages.ts`).
// Inbound payloads are boundary-guarded — the only message the graph sends is
// `openGraphNode`, validated via `coerceHostToWebviewMessage`'s peer
// `coerceWebviewToHostMessage` below.

// Coalesce a burst of index rebuilds (e.g. a multi-file find/replace) into one
// `graphData` post. Long enough to absorb a save storm, short enough that the
// graph feels live.
const POST_DEBOUNCE_MS = 250;

export class GraphService implements vscode.Disposable {
  public static readonly viewType = "markstudio.graph";
  public static readonly showCommand = "markstudio.graph.show";

  // Public so the Extension Host suite can drive it without re-registering the
  // command (the same pattern PR #4 established for the provider).
  public static register(
    context: vscode.ExtensionContext,
    provider: MarkStudioEditorProvider,
    linkIndex: LinkIndexService
  ): { service: GraphService; disposable: vscode.Disposable } {
    const service = new GraphService(context, provider, linkIndex);
    const disposable = vscode.commands.registerCommand(
      GraphService.showCommand,
      () => service.show()
    );
    return { service, disposable };
  }

  private panel: vscode.WebviewPanel | null = null;
  private panelDisposables: vscode.Disposable[] = [];
  private postTimer: ReturnType<typeof setTimeout> | undefined;
  private webviewReady = false;
  private disposed = false;

  public constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly provider: MarkStudioEditorProvider,
    private readonly linkIndex: LinkIndexService
  ) {}

  // Reveal the existing panel, or create one. Called by the command and by
  // the exthost test suite.
  public show(): void {
    if (this.disposed) {
      return;
    }
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.Beside, false);
      return;
    }
    this.createPanel();
  }

  // Test seam: the exthost suite asserts the open path goes through
  // `provider.openInMarkStudio`. Mirrors the public surface the provider
  // exposes for its own click paths (PR #4).
  public async handleOpenGraphNode(path: string): Promise<void> {
    if (typeof path !== "string" || path.length === 0) {
      return;
    }
    const uri = this.linkIndex.uriFor(path);
    if (!uri) {
      // The node was in the last `graphData` but the file was deleted between
      // the post and the click. Surface a status-bar diagnostic and drop.
      vscode.window.setStatusBarMessage(
        `MarkStudio: no note found for "${path}"`,
        3000
      );
      return;
    }
    await this.provider.openInMarkStudio(uri, 0);
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    if (this.postTimer !== undefined) {
      clearTimeout(this.postTimer);
      this.postTimer = undefined;
    }
    this.tearDownPanel();
  }

  private createPanel(): void {
    const panel = vscode.window.createWebviewPanel(
      GraphService.viewType,
      "MarkStudio Graph",
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(this.context.extensionUri, "dist")
        ]
      }
    );
    panel.webview.html = buildGraphWebviewHtml(
      panel.webview,
      this.context.extensionUri
    );

    this.panel = panel;
    this.webviewReady = false;

    this.panelDisposables.push(
      panel.webview.onDidReceiveMessage((raw) =>
        this.onWebviewMessage(raw as unknown)
      ),
      panel.onDidDispose(() => this.tearDownPanel()),
      this.linkIndex.onDidChangeIndex(() => this.schedulePost()),
      this.provider.onDidChangeActiveDocument(() => this.postNow())
    );
  }

  private tearDownPanel(): void {
    for (const d of this.panelDisposables) {
      try {
        d.dispose();
      } catch {
        // Disposal must never throw during cleanup.
      }
    }
    this.panelDisposables = [];
    if (this.postTimer !== undefined) {
      clearTimeout(this.postTimer);
      this.postTimer = undefined;
    }
    const p = this.panel;
    this.panel = null;
    this.webviewReady = false;
    p?.dispose();
  }

  // Coalesce rebuilds: a burst of `onDidChangeIndex` triggers a single post.
  private schedulePost(): void {
    if (this.postTimer !== undefined) {
      return;
    }
    this.postTimer = setTimeout(() => {
      this.postTimer = undefined;
      this.postNow();
    }, POST_DEBOUNCE_MS);
  }

  private postNow(): void {
    if (!this.panel || !this.webviewReady || this.disposed) {
      return;
    }
    const paths = this.linkIndex.getNotePaths();
    const edges = this.linkIndex.getEdges();
    const active = this.provider.getActiveDocument();
    const currentPath = active ? this.linkIndex.pathFor(active.uri) : null;
    const graph = buildGraph(paths, edges, currentPath);

    const message: HostToWebviewMessage = {
      type: "graphData",
      nodes: graph.nodes.map((n) => ({
        path: n.path,
        label: n.label,
        isCurrent: n.isCurrent
      })),
      edges: graph.edges.map((e) => ({
        from: e.from,
        to: e.to,
        weight: e.weight
      })),
      currentPath: currentPath
    };
    void this.panel.webview.postMessage(message);
  }

  private onWebviewMessage(raw: unknown): void {
    const msg = coerceWebviewToHostMessage(raw);
    if (!msg) {
      return;
    }
    switch (msg.type) {
      case "ready":
        this.webviewReady = true;
        this.postNow();
        return;
      case "openGraphNode":
        void this.handleOpenGraphNode(msg.path);
        return;
      default:
        // Unknown but well-formed message — ignore (forward-compat).
        return;
    }
  }
}

// Thin local guard for the only inbound payloads the graph panel accepts.
// We deliberately do not reuse the editor-side `isWebviewToHostMessage`
// because the editor accepts many messages (edits, layout, etc.) the graph
// webview must never post; rejecting them at the boundary is the simplest
// way to enforce that.
function coerceWebviewToHostMessage(
  value: unknown
): WebviewToHostMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.type !== "string") {
    return null;
  }
  if (obj.type === "ready") {
    return { type: "ready" };
  }
  if (obj.type === "openGraphNode") {
    if (typeof obj.path !== "string" || obj.path.length === 0) {
      return null;
    }
    return { type: "openGraphNode", path: obj.path };
  }
  return null;
}
