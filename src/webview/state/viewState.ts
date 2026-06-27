// Persisted webview view-state (T-106 / T-109).
//
// VS Code gives every webview a small JSON-shaped state slot via
// `vscode.setState()` / `vscode.getState()`. The state survives tab switches
// for retained webviews (ADR-0002) and is restored when the webview is
// rehydrated. This module owns the shape and the read/write/validation —
// nothing else in the webview talks to `setState` directly.
//
// The slot carries: the split-view layout (ratio + mode, T-106), and the
// CodeMirror cursor + scroll snapshot (T-109). New fields are backward
// compatible: `parse()` falls back to defaults for any missing or malformed
// field, so older persisted state continues to load.

import type { LayoutMode } from "../../messaging/messages";

export type { LayoutMode };

export interface CursorSnapshot {
  readonly anchor: number;
  readonly head: number;
}

export interface ViewState {
  readonly splitRatio: number;
  readonly layoutMode: LayoutMode;
  readonly cursor: CursorSnapshot | null;
  readonly scrollTop: number;
}

export const DEFAULT_VIEW_STATE: ViewState = {
  splitRatio: 0.5,
  layoutMode: "preview-only",
  cursor: null,
  scrollTop: 0
};

const MIN_RATIO = 0.05;
const MAX_RATIO = 0.95;

export interface ViewStateStore {
  read(): ViewState;
  patch(update: Partial<ViewState>): void;
}

interface VsCodeStateApi {
  getState(): unknown;
  setState(state: unknown): void;
}

export function createViewStateStore(api: VsCodeStateApi): ViewStateStore {
  let current = parse(api.getState());
  return {
    read: () => current,
    patch: (update) => {
      const next: ViewState = {
        splitRatio:
          update.splitRatio !== undefined
            ? clampRatio(update.splitRatio)
            : current.splitRatio,
        layoutMode:
          update.layoutMode !== undefined
            ? update.layoutMode
            : current.layoutMode,
        cursor:
          update.cursor !== undefined
            ? resolveCursorUpdate(update.cursor)
            : current.cursor,
        scrollTop:
          update.scrollTop !== undefined
            ? clampScrollTop(update.scrollTop)
            : current.scrollTop
      };
      if (
        next.splitRatio === current.splitRatio &&
        next.layoutMode === current.layoutMode &&
        next.scrollTop === current.scrollTop &&
        cursorsEqual(next.cursor, current.cursor)
      ) {
        return;
      }
      current = next;
      api.setState(current);
    }
  };
}

export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_VIEW_STATE.splitRatio;
  }
  if (value < MIN_RATIO) {
    return MIN_RATIO;
  }
  if (value > MAX_RATIO) {
    return MAX_RATIO;
  }
  return value;
}

function clampScrollTop(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value;
}

function normalizeCursor(value: CursorSnapshot): CursorSnapshot {
  return {
    anchor: clampOffset(value.anchor),
    head: clampOffset(value.head)
  };
}

function resolveCursorUpdate(value: CursorSnapshot | null): CursorSnapshot | null {
  return value === null ? null : normalizeCursor(value);
}

function clampOffset(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  // Document length is validated when the snapshot is applied to CM6 — here
  // we only normalize to a non-negative integer so persistence stays sane.
  return Math.floor(value);
}

function cursorsEqual(a: CursorSnapshot | null, b: CursorSnapshot | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return a.anchor === b.anchor && a.head === b.head;
}

function parse(raw: unknown): ViewState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_VIEW_STATE;
  }
  const candidate = raw as Record<string, unknown>;
  const splitRatio =
    typeof candidate.splitRatio === "number"
      ? clampRatio(candidate.splitRatio)
      : DEFAULT_VIEW_STATE.splitRatio;
  const layoutMode = isLayoutMode(candidate.layoutMode)
    ? candidate.layoutMode
    : DEFAULT_VIEW_STATE.layoutMode;
  const cursor = parseCursor(candidate.cursor);
  const scrollTop =
    typeof candidate.scrollTop === "number"
      ? clampScrollTop(candidate.scrollTop)
      : DEFAULT_VIEW_STATE.scrollTop;
  return { splitRatio, layoutMode, cursor, scrollTop };
}

function parseCursor(raw: unknown): CursorSnapshot | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.anchor !== "number" || typeof candidate.head !== "number") {
    return null;
  }
  return normalizeCursor({
    anchor: candidate.anchor,
    head: candidate.head
  });
}

function isLayoutMode(value: unknown): value is LayoutMode {
  return (
    value === "split" || value === "editor-only" || value === "preview-only"
  );
}
