// Editor ⇄ preview scroll synchronisation (T-2.1).
//
// Keeps the CodeMirror source pane and the markdown-it preview pane aligned in
// `split` mode: scrolling either pane scrolls the other to the matching
// Markdown block. The mapping anchors on the per-block DOM nodes the
// `PreviewRenderer` already produces — each block knows the 1-based source line
// it starts at (from the markdown-it token map), and CodeMirror can convert a
// source line to / from a vertical pixel offset. Positions are interpolated
// between consecutive block anchors so the sync is smooth, not block-snapped.
//
// Feedback is suppressed per direction: programmatically scrolling one pane
// fires a `scroll` event whose echo must not drive the other pane back. Each
// flag swallows exactly the one echo our own write produces (and is only armed
// when the scroll value actually changes, so a no-op write cannot leave it
// stuck). The handlers no-op unless `isActive()` reports `split` mode, so
// `editor-only` / `preview-only` cost nothing (CODING_GUIDELINES.md §8).

import type { EditorView } from "@codemirror/view";
import type { PreviewBlock } from "./PreviewRenderer";

export interface ScrollSyncOptions {
    readonly editorView: EditorView;
    // The preview's scroll container (the pane element with `overflow: auto`).
    readonly previewScroller: HTMLElement;
    readonly getBlocks: () => ReadonlyArray<PreviewBlock>;
    // True only when both panes are visible (split mode); the handlers no-op
    // otherwise.
    readonly isActive: () => boolean;
}

export interface ScrollSync {
    // Re-align the preview to the editor's current position. Useful when split
    // mode is (re)entered and the panes may have drifted while one was hidden.
    syncFromEditor(): void;
    destroy(): void;
}

export function createScrollSync(options: ScrollSyncOptions): ScrollSync {
    const { editorView, previewScroller, getBlocks, isActive } = options;

    // Directional echo guards (see file header).
    let ignoreEditorScroll = false;
    let ignorePreviewScroll = false;

    function onEditorScroll(): void {
        if (ignoreEditorScroll) {
            ignoreEditorScroll = false;
            return;
        }
        if (!isActive()) {
            return;
        }
        syncEditorToPreview();
    }

    function onPreviewScroll(): void {
        if (ignorePreviewScroll) {
            ignorePreviewScroll = false;
            return;
        }
        if (!isActive()) {
            return;
        }
        syncPreviewToEditor();
    }

    function syncEditorToPreview(): void {
        const blocks = getBlocks();
        if (blocks.length === 0) {
            return;
        }
        const line = editorTopLine(editorView);
        const target = previewTopForLine(blocks, previewScroller, line);
        if (target === null) {
            return;
        }
        setPreviewScroll(target);
    }

    function syncPreviewToEditor(): void {
        const blocks = getBlocks();
        if (blocks.length === 0) {
            return;
        }
        const line = lineForPreviewTop(blocks, previewScroller);
        if (line === null) {
            return;
        }
        setEditorScroll(editorTopForLine(editorView, line));
    }

    function setPreviewScroll(target: number): void {
        const max = previewScroller.scrollHeight - previewScroller.clientHeight;
        const clamped = clamp(target, 0, Math.max(max, 0));
        if (Math.abs(previewScroller.scrollTop - clamped) < 1) {
            return;
        }
        ignorePreviewScroll = true;
        previewScroller.scrollTop = clamped;
    }

    function setEditorScroll(target: number): void {
        const scroller = editorView.scrollDOM;
        const max = scroller.scrollHeight - scroller.clientHeight;
        const clamped = clamp(target, 0, Math.max(max, 0));
        if (Math.abs(scroller.scrollTop - clamped) < 1) {
            return;
        }
        ignoreEditorScroll = true;
        scroller.scrollTop = clamped;
    }

    editorView.scrollDOM.addEventListener("scroll", onEditorScroll, {
        passive: true
    });
    previewScroller.addEventListener("scroll", onPreviewScroll, {
        passive: true
    });

    return {
        syncFromEditor(): void {
            if (!isActive()) {
                return;
            }
            syncEditorToPreview();
        },
        destroy(): void {
            editorView.scrollDOM.removeEventListener("scroll", onEditorScroll);
            previewScroller.removeEventListener("scroll", onPreviewScroll);
        }
    };
}

// The fractional 1-based source line at the top of the editor viewport. The
// integer part is the document line; the fraction is how far the viewport top
// has scrolled into that line's block (so a half-scrolled tall line reads as
// `n.5`), giving sub-line resolution for the interpolation.
function editorTopLine(view: EditorView): number {
    const scrollTop = view.scrollDOM.scrollTop;
    const block = view.lineBlockAtHeight(scrollTop);
    const lineNumber = view.state.doc.lineAt(block.from).number;
    const frac =
        block.height > 0 ? clamp((scrollTop - block.top) / block.height, 0, 1) : 0;
    return lineNumber + frac;
}

// The editor `scrollTop` that puts the given fractional source line at the
// viewport top — the inverse of `editorTopLine`.
function editorTopForLine(view: EditorView, line: number): number {
    const doc = view.state.doc;
    const lineNumber = clamp(Math.floor(line), 1, doc.lines);
    const frac = clamp(line - lineNumber, 0, 1);
    const block = view.lineBlockAt(doc.line(lineNumber).from);
    return block.top + frac * block.height;
}

// Map a fractional source line to a preview `scrollTop` by interpolating
// between the two block anchors that bracket it.
function previewTopForLine(
    blocks: ReadonlyArray<PreviewBlock>,
    scroller: HTMLElement,
    line: number
): number | null {
    if (line <= blocks[0].startLine) {
        return 0;
    }
    // Largest index whose block starts at or before `line`.
    let lo = 0;
    let hi = blocks.length - 1;
    let idx = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (blocks[mid].startLine <= line) {
            idx = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    const baseTop = scroller.getBoundingClientRect().top;
    const baseScroll = scroller.scrollTop;
    const topOf = (block: PreviewBlock): number =>
        block.node.getBoundingClientRect().top - baseTop + baseScroll;

    const current = blocks[idx];
    const next = blocks[idx + 1];
    if (next === undefined) {
        return topOf(current);
    }
    const span = next.startLine - current.startLine;
    const t = span > 0 ? clamp((line - current.startLine) / span, 0, 1) : 0;
    const top = topOf(current);
    return top + t * (topOf(next) - top);
}

// Map the preview's current `scrollTop` to a fractional source line by
// interpolating between the two block anchors that bracket the viewport top —
// the inverse of `previewTopForLine`.
function lineForPreviewTop(
    blocks: ReadonlyArray<PreviewBlock>,
    scroller: HTMLElement
): number | null {
    const scrollTop = scroller.scrollTop;
    const baseTop = scroller.getBoundingClientRect().top;
    const baseScroll = scroller.scrollTop;
    const topOf = (block: PreviewBlock): number =>
        block.node.getBoundingClientRect().top - baseTop + baseScroll;

    if (scrollTop <= topOf(blocks[0])) {
        return blocks[0].startLine;
    }
    // Largest index whose block top is at or before the viewport top.
    let lo = 0;
    let hi = blocks.length - 1;
    let idx = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (topOf(blocks[mid]) <= scrollTop) {
            idx = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }

    const current = blocks[idx];
    const next = blocks[idx + 1];
    if (next === undefined) {
        return current.startLine;
    }
    const topCurrent = topOf(current);
    const span = topOf(next) - topCurrent;
    const t = span > 0 ? clamp((scrollTop - topCurrent) / span, 0, 1) : 0;
    return current.startLine + t * (next.startLine - current.startLine);
}

function clamp(value: number, min: number, max: number): number {
    if (value < min) {
        return min;
    }
    if (value > max) {
        return max;
    }
    return value;
}
