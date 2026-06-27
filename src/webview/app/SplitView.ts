// Resizable split between two existing flex children (T-106).
//
// The split itself is plain CSS — both panes have `flex-grow` set from the
// current ratio and the gutter is a `<div>` with `flex: 0 0 <width>`. Drag is
// handled with pointer events so we get correct touch + pen support and so
// we can `setPointerCapture` to keep receiving moves even when the cursor
// crosses the iframe edge. Ratio updates during the drag are coalesced to
// the next animation frame to avoid layout thrash (CODING_GUIDELINES.md §8).

const MIN_PANE_PX = 160;

export interface SplitViewOptions {
  readonly before: HTMLElement;
  readonly gutter: HTMLElement;
  readonly after: HTMLElement;
  readonly container: HTMLElement;
  readonly initialRatio: number;
  readonly onChange: (ratio: number) => void;
  readonly onCommit: (ratio: number) => void;
}

export interface SplitView {
  setRatio(ratio: number): void;
  reapply(): void;
  clearInlineSizing(): void;
  destroy(): void;
}

export function createSplitView(options: SplitViewOptions): SplitView {
  const { before, gutter, after, container, initialRatio, onChange, onCommit } =
    options;

  let ratio = initialRatio;
  applyRatio(before, after, ratio);

  let dragState: {
    pointerId: number;
    startX: number;
    startRatio: number;
    containerWidth: number;
  } | null = null;
  let pendingRatio: number | null = null;
  let rafHandle: number | null = null;

  function onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    const rect = container.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startRatio: ratio,
      containerWidth: rect.width
    };
    gutter.setPointerCapture(event.pointerId);
    gutter.classList.add("markstudio-gutter--active");
    event.preventDefault();
  }

  function onPointerMove(event: PointerEvent): void {
    if (dragState === null || event.pointerId !== dragState.pointerId) {
      return;
    }
    const deltaPx = event.clientX - dragState.startX;
    const containerWidth = dragState.containerWidth;
    const minRatio = MIN_PANE_PX / containerWidth;
    const maxRatio = 1 - MIN_PANE_PX / containerWidth;
    let next = dragState.startRatio + deltaPx / containerWidth;
    if (minRatio < maxRatio) {
      if (next < minRatio) next = minRatio;
      if (next > maxRatio) next = maxRatio;
    } else {
      // Container is too narrow to honour both minimums; centre the gutter.
      next = 0.5;
    }
    schedule(next);
  }

  function onPointerEnd(event: PointerEvent): void {
    if (dragState === null || event.pointerId !== dragState.pointerId) {
      return;
    }
    if (gutter.hasPointerCapture(event.pointerId)) {
      gutter.releasePointerCapture(event.pointerId);
    }
    gutter.classList.remove("markstudio-gutter--active");
    dragState = null;
    flush();
    onCommit(ratio);
  }

  function schedule(next: number): void {
    pendingRatio = next;
    if (rafHandle !== null) {
      return;
    }
    rafHandle = window.requestAnimationFrame(() => {
      rafHandle = null;
      flush();
    });
  }

  function flush(): void {
    if (pendingRatio === null) {
      return;
    }
    ratio = pendingRatio;
    pendingRatio = null;
    applyRatio(before, after, ratio);
    onChange(ratio);
  }

  function onDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    ratio = 0.5;
    applyRatio(before, after, ratio);
    onChange(ratio);
    onCommit(ratio);
  }

  gutter.addEventListener("pointerdown", onPointerDown);
  gutter.addEventListener("pointermove", onPointerMove);
  gutter.addEventListener("pointerup", onPointerEnd);
  gutter.addEventListener("pointercancel", onPointerEnd);
  gutter.addEventListener("dblclick", onDoubleClick);

  return {
    setRatio(next: number): void {
      ratio = next;
      applyRatio(before, after, ratio);
    },
    reapply(): void {
      applyRatio(before, after, ratio);
    },
    clearInlineSizing(): void {
      before.style.flexGrow = "";
      after.style.flexGrow = "";
    },
    destroy(): void {
      if (rafHandle !== null) {
        window.cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      gutter.removeEventListener("pointerdown", onPointerDown);
      gutter.removeEventListener("pointermove", onPointerMove);
      gutter.removeEventListener("pointerup", onPointerEnd);
      gutter.removeEventListener("pointercancel", onPointerEnd);
      gutter.removeEventListener("dblclick", onDoubleClick);
    }
  };
}

function applyRatio(
  before: HTMLElement,
  after: HTMLElement,
  ratio: number
): void {
  before.style.flexGrow = String(ratio);
  after.style.flexGrow = String(1 - ratio);
}
