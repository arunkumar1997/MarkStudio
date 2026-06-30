import * as vscode from "vscode";
import { HostMessageBus } from "../messaging/HostMessageBus";
import { MarkStudioDocument } from "./MarkStudioDocument";
import { buildWebviewHtml } from "./webviewHtml";
import { PendingReveals } from "./pendingReveals";
import { findHeadingLine } from "../outline/headings";
import { extractExcerpt } from "../links/linkExcerpt";
import type { FocusablePane, LayoutMode } from "../messaging/messages";
import type { StateStore } from "../services/StateStore";
import type { ConfigurationService } from "../services/ConfigurationService";
import type { LinkIndexService } from "../links/LinkIndexService";

// Defence-in-depth scheme check for `openMarkdownLink` (ADR-0021 amendment):
// the webview already filters external schemes (`isExternalHref` in
// `markdownLinkClick.ts`), but the host re-checks before resolving so a
// malformed message can never round-trip an external URL into navigation.
// Matches RFC 3986 scheme syntax.
const EXTERNAL_HREF = /^[a-z][a-z0-9+\-.]*:/i;

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

  // Every resolved MarkStudio editor, keyed by `uri.toString()`. The custom
  // editor is registered with `supportsMultipleEditorsPerDocument: false`, so
  // there is at most one controller per document. Used by click-navigation and
  // the Backlinks panel to detect an already-open target (focus + reveal in
  // place, no duplicate) and to apply a pending reveal once a freshly opened
  // editor reports `ready` (ADR-0021). Independent of the active-editor
  // tracking above, which still drives commands and the word-count indicator.
  private readonly controllersByUri = new Map<
    string,
    MarkStudioEditorController
  >();

  // Reveals requested for targets that were not yet open. `vscode.openWith`
  // drives `resolveCustomTextEditor`; the recorded line is applied when that
  // new webview reports `ready` (ADR-0021 pending-reveal handshake).
  private readonly pendingReveals = new PendingReveals();

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
  // note in MarkStudio. `target` is resolved relative to the clicked note
  // (`fromUri`) through the shared `LinkIndexService` — the same resolver the
  // Backlinks panel uses, so navigation and backlinks agree. When a `heading`
  // is given, the heading's line is revealed (falling back to the top of the
  // file if it is not found); otherwise the file opens at line 0. An ambiguous
  // basename opens the first match; an unresolved target shows a transient
  // status-bar message. If the resolved target fails to open (e.g. it was
  // deleted inside the watcher debounce window, so the index still lists it),
  // the same transient status-bar fallback is shown. This method never throws —
  // the caller invokes it fire-and-forget via `void`.
  //
  // The note opens in the MarkStudio custom editor via `openInMarkStudio`
  // (ADR-0021): MarkStudio is the markdown experience, so click-navigation
  // stays in it rather than dropping the user into the raw text editor. Because
  // a MarkStudio editor is a webview, the line is revealed through a
  // `revealLine` message (the pending-reveal handshake) rather than
  // `showTextDocument`'s selection.
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
      await this.openInMarkStudio(targetUri, safeLine);
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

  // Resolve a standard markdown link clicked in the preview (ADR-0021
  // 2026-06-30 amendment, extended for standard markdown links) and open the
  // target `.md` / `.markdown` file in MarkStudio. `href` is the raw attribute
  // value as it appeared in the preview (used only for the user-facing
  // fallback message), `target` is the URL-decoded path part (before `#`), and
  // `heading` is the URL-decoded fragment or `null`. Resolution is plain URI
  // math — *not* the workspace link index, which only knows about wiki-link
  // basenames: a `/`-prefixed path is workspace-absolute (resolved against the
  // source note's workspace folder, falling back to the first folder for an
  // out-of-workspace source), and any other path is relative to the source
  // note's directory. The resolved URI must point at an existing file inside a
  // workspace folder; anything else degrades to the same transient status-bar
  // message the wiki-link path uses, so a broken link is never silently
  // navigated. Heading reveal reuses `findHeadingLine` (miss → top of file),
  // and the open itself goes through `openInMarkStudio` so the pending-reveal
  // handshake is identical to the wiki-link / backlinks paths. External-scheme
  // hrefs are already filtered webview-side; a defence-in-depth scheme check
  // here ensures a malformed message can never round-trip an external URL.
  // Never throws — the caller invokes it fire-and-forget via `void`.
  public async openMarkdownLink(
    fromUri: vscode.Uri,
    href: string,
    target: string,
    heading: string | null
  ): Promise<void> {
    if (
      target.length === 0 ||
      EXTERNAL_HREF.test(href) ||
      EXTERNAL_HREF.test(target)
    ) {
      return;
    }

    const targetUri = this.resolveMarkdownLinkUri(fromUri, target);
    if (targetUri === null) {
      void vscode.window.setStatusBarMessage(
        `MarkStudio: no note found at "${href}"`,
        4000
      );
      return;
    }

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
      await this.openInMarkStudio(targetUri, safeLine);
    } catch {
      void vscode.window.setStatusBarMessage(
        `MarkStudio: could not open note at "${href}"`,
        4000
      );
    }
  }

  // Resolve `target` (a path written in `fromUri`'s preview) to a candidate
  // `.md` URI, or `null` when no workspace context is available for a
  // workspace-absolute path. The candidate is returned even if the file does
  // not exist on disk — the caller's `openTextDocument` is the existence
  // check, so a broken link still surfaces the transient status-bar message.
  private resolveMarkdownLinkUri(
    fromUri: vscode.Uri,
    target: string
  ): vscode.Uri | null {
    if (target.startsWith("/")) {
      // Workspace-absolute: resolve against the source's workspace folder. If
      // the source is not in any folder (e.g. an ad-hoc file open), fall back
      // to the first workspace folder, mirroring `asRelativePath`'s preference
      // for the active workspace.
      const folder =
        vscode.workspace.getWorkspaceFolder(fromUri) ??
        vscode.workspace.workspaceFolders?.[0];
      if (folder === undefined) {
        return null;
      }
      const trimmed = target.replace(/^\/+/, "");
      return vscode.Uri.joinPath(folder.uri, trimmed);
    }

    // Relative: resolve against the source note's containing directory.
    return vscode.Uri.joinPath(fromUri, "..", target);
  }

  // Open `targetUri` in the MarkStudio custom editor and reveal `line` (a
  // 0-based, already-clamped source line). Shared by in-preview click-
  // navigation (T-4.1b) and the Backlinks panel (T-4.1, ADR-0020) so both open
  // notes in MarkStudio rather than the built-in text editor (ADR-0021).
  //
  // Reveal cannot ride `showTextDocument`'s `selection` because a MarkStudio
  // editor is a webview; instead the line is delivered as a host → webview
  // `revealLine` message (the same one the outline tree uses). Two cases:
  //   - Target already open: `vscode.openWith` focuses its existing tab (no
  //     duplicate, since `supportsMultipleEditorsPerDocument: false`) and the
  //     line is revealed immediately on the live controller.
  //   - Target not yet open: the line is recorded in `pendingReveals` keyed by
  //     the URI *before* `openWith`, which drives `resolveCustomTextEditor`;
  //     the reveal is applied once that new webview reports `ready`.
  // The caller invokes this fire-and-forget via `void`.
  public async openInMarkStudio(
    targetUri: vscode.Uri,
    line: number
  ): Promise<void> {
    const key = targetUri.toString();
    const existing = this.controllersByUri.get(key);
    if (existing === undefined) {
      // Record before opening: `openWith` may resolve the new editor and have
      // it report `ready` before the await below returns.
      this.pendingReveals.set(key, line);
    }

    await vscode.commands.executeCommand(
      "vscode.openWith",
      targetUri,
      MarkStudioEditorProvider.viewType
    );

    if (existing !== undefined) {
      existing.revealLine(line);
    }
  }

  // Apply a pending reveal for `uri` once its webview reports `ready`. A no-op
  // when no reveal is pending or the controller is gone. Part of the ADR-0021
  // pending-reveal handshake.
  private applyPendingReveal(uri: vscode.Uri): void {
    const key = uri.toString();
    const line = this.pendingReveals.take(key);
    if (line === undefined) {
      return;
    }
    this.controllersByUri.get(key)?.revealLine(line);
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
            // Apply a reveal requested before this editor existed (ADR-0021
            // pending-reveal handshake): the webview is now ready to receive
            // the `revealLine` message.
            this.applyPendingReveal(document.uri);
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
          case "openMarkdownLink":
            void this.openMarkdownLink(
              document.uri,
              message.href,
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
    this.controllersByUri.set(document.uri.toString(), controller);
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
      const key = document.uri.toString();
      if (this.controllersByUri.get(key) === controller) {
        this.controllersByUri.delete(key);
      }
      // Drop a reveal that was queued for an editor that closed before it ever
      // reported `ready`, so it cannot leak onto a later editor for this URI.
      this.pendingReveals.clear(key);
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
