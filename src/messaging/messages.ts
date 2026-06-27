// Shared message contract between the MarkStudio extension host and the webview
// (ARCHITECTURE.md §6, ADR-0002). Payloads are plain JSON: no `vscode` objects,
// DOM nodes, or functions. This file imports nothing from `vscode` or the DOM
// so both bundles (Node host and browser webview) can consume it safely.
//
// The discriminated unions below are the source of truth — the matching API
// reference lives in docs/api/message-protocol.md.

// ─── Host → Webview ─────────────────────────────────────────────────────────

// The three layout modes the App Shell supports (T-106). `split` shows both
// panes side-by-side with a draggable gutter; the single-pane modes hide one
// pane without unmounting its renderer.
export type LayoutMode = "split" | "editor-only" | "preview-only";

const LAYOUT_MODES: ReadonlyArray<LayoutMode> = [
  "split",
  "editor-only",
  "preview-only"
];

// The resolved MarkStudio settings the webview needs to honour (T-111).
// Read host-side from `markstudio.*` by the ConfigurationService and sent on
// `init` (and again on every `configChanged`). Plain JSON — no `vscode` types.
export interface MarkStudioConfig {
  // `markstudio.editor.lineNumbers` — show the CM6 line-number gutter.
  readonly lineNumbers: boolean;
  // `markstudio.editor.wordWrap` — soft-wrap long lines in the source editor.
  readonly wordWrap: boolean;
}

// First content load. Sent once the webview signals `ready`.
//
// `initialLayoutMode` is the host-authoritative layout mode read from the
// Memento (T-109). When present it wins over the value the webview cached
// via `vscode.setState()`, so the layout the user last left a given file in
// survives extension reloads, not just tab switches.
//
// `config` is the resolved `markstudio.*` settings snapshot (T-111); the
// webview applies it as it builds the editor so the very first paint already
// reflects the user's preferences.
export interface InitMessage {
  readonly type: "init";
  readonly text: string;
  readonly config: MarkStudioConfig;
  readonly initialLayoutMode?: LayoutMode;
}

// Authoritative content from the host (revert, external file change, edit
// from another text editor). The webview reconciles without recreating its
// editor surface.
export interface SetContentMessage {
  readonly type: "setContent";
  readonly text: string;
}

// Host requests a layout-mode switch (e.g. from a command-palette command).
// The webview applies the mode without remounting CodeMirror or the preview.
export interface SetLayoutModeMessage {
  readonly type: "setLayoutMode";
  readonly mode: LayoutMode;
}

// Host asks the webview to toggle preview visibility (T-108). The webview is
// authoritative for the current mode (it owns the `vscode.getState()` value),
// so it computes the next mode itself: `editor-only` → `split`, anything else
// → `editor-only`. Matches the built-in `markdown.showPreview` semantics.
export interface TogglePreviewMessage {
  readonly type: "togglePreview";
}

// Host asks the webview to toggle between split and editor-only (T-108).
// `split` → `editor-only`; any other mode → `split`. Keeps a single key
// usable for "open the second pane".
export interface ToggleSplitMessage {
  readonly type: "toggleSplit";
}

// The two panes that can receive keyboard focus (T-108).
export type FocusablePane = "editor" | "preview";

const FOCUSABLE_PANES: ReadonlyArray<FocusablePane> = ["editor", "preview"];

// Host asks the webview to move keyboard focus to one of the panes (T-108).
// The webview focuses CM6 (`view.focus()`) for `editor` or the preview pane
// element for `preview`; in single-pane modes targeting the hidden pane is
// a no-op.
export interface FocusPaneMessage {
  readonly type: "focusPane";
  readonly pane: FocusablePane;
}

// A `markstudio.*` setting changed (T-111). The host re-reads the full config
// and sends the new snapshot; the webview applies it live (e.g. toggling the
// CM6 line-number gutter via a `Compartment`) without a reload.
export interface ConfigChangedMessage {
  readonly type: "configChanged";
  readonly config: MarkStudioConfig;
}

// Either direction. Carries a human-readable diagnostic.
export interface ErrorMessage {
  readonly type: "error";
  readonly message: string;
}

export type HostToWebviewMessage =
  | InitMessage
  | SetContentMessage
  | SetLayoutModeMessage
  | TogglePreviewMessage
  | ToggleSplitMessage
  | FocusPaneMessage
  | ConfigChangedMessage
  | ErrorMessage;

// ─── Webview → Host ─────────────────────────────────────────────────────────

// The webview has built its shell and is ready to receive content.
export interface ReadyMessage {
  readonly type: "ready";
}

// One contiguous change against the document text the webview last knew.
// `from` and `to` are character offsets into that pre-change text; `insert`
// replaces the slice `[from, to)`. This is the wire form of a CodeMirror 6
// change description and the input shape of `MarkStudioDocument.applyChanges`.
export interface EditChange {
  readonly from: number;
  readonly to: number;
  readonly insert: string;
}

// The webview proposes a content change as a batch of minimal `changes`
// (the diff). `text` is the post-change document text the webview now has,
// included so the host can suppress the `onDidChangeTextDocument` echo it
// will see after applying the edit (the same equality guard introduced in
// T-102). Sending both keeps the wire form small *and* the host authoritative.
export interface EditMessage {
  readonly type: "edit";
  readonly changes: ReadonlyArray<EditChange>;
  readonly text: string;
}

// The webview notifies the host that the App Shell's layout mode has
// changed (T-109). The host persists the new value in a Memento via
// `StateStore` so it can be replayed on the next `init`.
export interface LayoutModeChangedMessage {
  readonly type: "layoutModeChanged";
  readonly mode: LayoutMode;
}

export type WebviewToHostMessage =
  | ReadyMessage
  | EditMessage
  | LayoutModeChangedMessage
  | ErrorMessage;

// ─── Boundary guards ────────────────────────────────────────────────────────
//
// Everything crossing the MessageBus is treated as untrusted input
// (CODING_GUIDELINES.md §9). These guards narrow `unknown` to the concrete
// shapes above and reject anything that does not match.

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isEditChange(value: unknown): value is EditChange {
  return (
    isObject(value) &&
    typeof value.from === "number" &&
    typeof value.to === "number" &&
    typeof value.insert === "string"
  );
}

function isMarkStudioConfig(value: unknown): value is MarkStudioConfig {
  return (
    isObject(value) &&
    typeof value.lineNumbers === "boolean" &&
    typeof value.wordWrap === "boolean"
  );
}

export function isHostToWebviewMessage(
  value: unknown
): value is HostToWebviewMessage {
  if (!isObject(value)) {
    return false;
  }
  switch (value.type) {
    case "init":
      if (typeof value.text !== "string") {
        return false;
      }
      if (!isMarkStudioConfig(value.config)) {
        return false;
      }
      if (
        value.initialLayoutMode !== undefined &&
        !(LAYOUT_MODES as ReadonlyArray<string>).includes(
          value.initialLayoutMode as string
        )
      ) {
        return false;
      }
      return true;
    case "setContent":
      return typeof value.text === "string";
    case "setLayoutMode":
      return (
        typeof value.mode === "string" &&
        (LAYOUT_MODES as ReadonlyArray<string>).includes(value.mode)
      );
    case "togglePreview":
    case "toggleSplit":
      return true;
    case "focusPane":
      return (
        typeof value.pane === "string" &&
        (FOCUSABLE_PANES as ReadonlyArray<string>).includes(value.pane)
      );
    case "configChanged":
      return isMarkStudioConfig(value.config);
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}

export function isWebviewToHostMessage(
  value: unknown
): value is WebviewToHostMessage {
  if (!isObject(value)) {
    return false;
  }
  switch (value.type) {
    case "ready":
      return true;
    case "edit":
      return (
        typeof value.text === "string" &&
        Array.isArray(value.changes) &&
        value.changes.every(isEditChange)
      );
    case "layoutModeChanged":
      return (
        typeof value.mode === "string" &&
        (LAYOUT_MODES as ReadonlyArray<string>).includes(value.mode)
      );
    case "error":
      return typeof value.message === "string";
    default:
      return false;
  }
}
