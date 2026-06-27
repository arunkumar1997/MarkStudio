// Builds the MarkStudio source editor: a single, long-lived CodeMirror 6
// `EditorView` constructed exactly once per webview (ADR-0002, T-104).
//
// Host → CM6: `setContentFromHost(text)` dispatches a transaction tagged with
//   the `RemoteSync` annotation so the local update listener ignores it.
// CM6 → host: every other document change is forwarded as a minimal diff
//   batch (`EditChange[]`) plus the resulting full text (used by the host's
//   echo guard, see MarkStudioEditorProvider).
//
// T-109 adds optional restore-on-mount of a cursor + scroll snapshot, and
// emits a debounced snapshot whenever the user moves the cursor or scrolls.

import { Annotation, EditorSelection, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  buildExtensions,
  lineNumbersCompartment,
  lineNumbersExtension
} from "./extensions";
import type { MarkStudioConfig } from "../../messaging/messages";

// Tags transactions that originate from the host (init, setContent) so the
// update listener does not echo them back as `edit` messages.
const RemoteSync = Annotation.define<true>();

// 250 ms is short enough that a snapshot is rarely older than the user
// expects on reload, and long enough that arrow-key bursts coalesce into a
// single `setState` write. The snapshot is only consumed on the next reload,
// so the exact value is not load-bearing.
const SNAPSHOT_DEBOUNCE_MS = 250;

export interface ChangeBatch {
  readonly changes: ReadonlyArray<{
    readonly from: number;
    readonly to: number;
    readonly insert: string;
  }>;
  readonly text: string;
}

export interface CursorSnapshot {
  readonly anchor: number;
  readonly head: number;
}

export interface EditorSnapshot {
  readonly cursor: CursorSnapshot;
  readonly scrollTop: number;
}

export interface CreateEditorOptions {
  readonly parent: HTMLElement;
  readonly initialText: string;
  readonly initialConfig: MarkStudioConfig;
  readonly initialCursor?: CursorSnapshot | null;
  readonly initialScrollTop?: number;
  readonly onLocalChange: (batch: ChangeBatch) => void;
  readonly onSnapshotChange?: (snapshot: EditorSnapshot) => void;
}

export interface MarkStudioEditor {
  readonly view: EditorView;
  setContentFromHost(text: string): void;
  setConfig(config: MarkStudioConfig): void;
  focus(): void;
  destroy(): void;
}

export function createEditor(options: CreateEditorOptions): MarkStudioEditor {
  const {
    parent,
    initialText,
    initialConfig,
    initialCursor,
    initialScrollTop,
    onLocalChange,
    onSnapshotChange
  } = options;

  const updateListener = EditorView.updateListener.of((update) => {
    if (!update.docChanged) {
      return;
    }
    const isRemote = update.transactions.some(
      (tr) => tr.annotation(RemoteSync) === true
    );
    if (isRemote) {
      return;
    }
    const changes: Array<{ from: number; to: number; insert: string }> = [];
    update.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
      changes.push({ from: fromA, to: toA, insert: inserted.toString() });
    });
    if (changes.length === 0) {
      return;
    }
    onLocalChange({ changes, text: update.state.doc.toString() });
  });

  const snapshotListener = onSnapshotChange
    ? EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          scheduleSnapshot();
        }
      })
    : EditorView.updateListener.of(() => {
        /* no-op: snapshots not requested */
      });

  const initialSelection = resolveInitialSelection(
    initialCursor,
    initialText.length
  );

  const view = new EditorView({
    parent,
    state: EditorState.create({
      doc: initialText,
      selection: initialSelection,
      extensions: [
        ...buildExtensions(initialConfig),
        updateListener,
        snapshotListener
      ]
    })
  });

  let snapshotTimer: number | undefined;
  let disposed = false;

  const flushSnapshot = (): void => {
    snapshotTimer = undefined;
    if (disposed || onSnapshotChange === undefined) {
      return;
    }
    const sel = view.state.selection.main;
    onSnapshotChange({
      cursor: { anchor: sel.anchor, head: sel.head },
      scrollTop: view.scrollDOM.scrollTop
    });
  };

  function scheduleSnapshot(): void {
    if (onSnapshotChange === undefined || disposed) {
      return;
    }
    if (snapshotTimer !== undefined) {
      return;
    }
    snapshotTimer = window.setTimeout(flushSnapshot, SNAPSHOT_DEBOUNCE_MS);
  }

  const onScroll = (): void => scheduleSnapshot();
  view.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

  // Scroll restoration needs the editor laid out, which CM6 does on the
  // next animation frame. Setting `scrollTop` before that point is a no-op
  // because `scrollHeight` is still 0.
  if (
    typeof initialScrollTop === "number" &&
    Number.isFinite(initialScrollTop) &&
    initialScrollTop > 0
  ) {
    const targetScrollTop = initialScrollTop;
    requestAnimationFrame(() => {
      if (disposed) {
        return;
      }
      view.scrollDOM.scrollTop = targetScrollTop;
    });
  }

  return {
    view,
    setContentFromHost(text: string): void {
      const current = view.state.doc.toString();
      if (current === text) {
        return;
      }
      // Reconcile authoritative host content (revert, external on-disk
      // change, edit from another text editor — T-110) as a single
      // minimal change instead of a full-document replace. CM6 maps the
      // existing selection across the change, so the cursor stays put
      // whenever the external edit does not touch the cursor's region.
      view.dispatch({
        changes: computeMinimalChange(current, text),
        annotations: RemoteSync.of(true)
      });
    },
    setConfig(config: MarkStudioConfig): void {
      // Reconfigure only the affected compartment so the editor updates
      // live without a rebuild (T-111). Reconfiguring to the same value
      // is a cheap no-op in CM6.
      view.dispatch({
        effects: lineNumbersCompartment.reconfigure(
          lineNumbersExtension(config.lineNumbers)
        )
      });
    },
    focus(): void {
      view.focus();
    },
    destroy(): void {
      disposed = true;
      if (snapshotTimer !== undefined) {
        window.clearTimeout(snapshotTimer);
        snapshotTimer = undefined;
      }
      view.scrollDOM.removeEventListener("scroll", onScroll);
      view.destroy();
    }
  };
}

function resolveInitialSelection(
  cursor: CursorSnapshot | null | undefined,
  docLength: number
): EditorSelection | undefined {
  if (cursor === null || cursor === undefined) {
    return undefined;
  }
  const anchor = clampOffset(cursor.anchor, docLength);
  const head = clampOffset(cursor.head, docLength);
  return EditorSelection.create([EditorSelection.range(anchor, head)]);
}

function clampOffset(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  if (value > max) {
    return max;
  }
  return Math.floor(value);
}

// Reduce a whole-document replacement to its single changed span by trimming
// the common prefix and common suffix shared by the old and new text. The
// returned change replaces `[from, to)` of the old text with `insert`, leaving
// every unchanged character (and the selection mapped across it) untouched.
// Offsets are UTF-16 code units, matching CodeMirror's document model.
function computeMinimalChange(
  current: string,
  next: string
): { readonly from: number; readonly to: number; readonly insert: string } {
  const currentLength = current.length;
  const nextLength = next.length;

  const maxPrefix = Math.min(currentLength, nextLength);
  let prefix = 0;
  while (
    prefix < maxPrefix &&
    current.charCodeAt(prefix) === next.charCodeAt(prefix)
  ) {
    prefix++;
  }

  // The suffix scan must not reach back past the prefix in either string.
  const maxSuffix = Math.min(currentLength - prefix, nextLength - prefix);
  let suffix = 0;
  while (
    suffix < maxSuffix &&
    current.charCodeAt(currentLength - 1 - suffix) ===
      next.charCodeAt(nextLength - 1 - suffix)
  ) {
    suffix++;
  }

  return {
    from: prefix,
    to: currentLength - suffix,
    insert: next.slice(prefix, nextLength - suffix)
  };
}
