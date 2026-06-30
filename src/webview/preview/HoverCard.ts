// Floating hover-preview card for wiki-links (T-4.2, M4.2 — Phase 4).
//
// One persistent card element, created once and appended under the webview
// root. `wikiLinkHover.ts` decides *when* to request a preview; this module
// owns the card: positioning it near the hovered anchor, toggling between the
// rendered-excerpt body and a quiet "no note found" fallback, and dismissing
// itself on pointer-leave (with a small grace so the pointer can travel into
// the card), scroll, click, and Escape.
//
// The excerpt is rendered into `contentElement` by the caller using the
// existing markdown-it preview renderer (`html: false` preserved) — the card
// never renders Markdown itself, so theming and safety match the main preview.
// The card is themed with the VS Code hover-widget tokens.

let stylesInjected = false;

const CARD_CLASS = "markstudio-hover-card";
// Grace before hiding after the pointer leaves the anchor, so it can travel
// across the gap into the card without the card vanishing.
const DEFAULT_HIDE_GRACE_MS = 140;
// Gap between the anchor and the card edge.
const CARD_GAP_PX = 6;

export interface HoverCardOptions {
  // Element the card is appended under (the webview root). The card uses
  // `position: fixed`, so any stable ancestor works.
  readonly parent: HTMLElement;
  // Hide grace after the pointer leaves the anchor (default ~140 ms).
  readonly hideGraceMs?: number;
}

export interface HoverCard {
  // The body the caller renders the Markdown excerpt into.
  readonly contentElement: HTMLElement;
  // Reveal the card next to `anchor` showing the rendered excerpt body.
  showContent(anchor: Element): void;
  // Reveal the card next to `anchor` showing the "no note found" fallback.
  showMissing(anchor: Element): void;
  // Hide immediately.
  hide(): void;
  // Hide after the grace delay (cancellable by `cancelHide`).
  scheduleHide(): void;
  // Cancel a pending grace-delayed hide.
  cancelHide(): void;
  destroy(): void;
}

export function createHoverCard(options: HoverCardOptions): HoverCard {
  injectHoverCardStyles();
  const hideGraceMs = options.hideGraceMs ?? DEFAULT_HIDE_GRACE_MS;

  const card = document.createElement("div");
  card.className = CARD_CLASS;
  card.setAttribute("role", "tooltip");
  card.hidden = true;

  const content = document.createElement("div");
  content.className = "markstudio-hover-card-body";

  const fallback = document.createElement("div");
  fallback.className = "markstudio-hover-card-missing";
  fallback.textContent = "No note found";
  fallback.hidden = true;

  card.append(content, fallback);
  options.parent.append(card);

  let hideTimer: number | null = null;

  function cancelHide(): void {
    if (hideTimer !== null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function hide(): void {
    cancelHide();
    card.hidden = true;
  }

  function scheduleHide(): void {
    cancelHide();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      card.hidden = true;
    }, hideGraceMs);
  }

  function reveal(anchor: Element, missing: boolean): void {
    cancelHide();
    content.hidden = missing;
    fallback.hidden = !missing;
    card.hidden = false;
    position(anchor);
  }

  // Position the card below the anchor by default, flipping above when it would
  // overflow the viewport bottom, and clamping horizontally to the viewport.
  // jsdom reports zero geometry, so under test the card simply pins at (0,0);
  // the real geometry is verified in the manual F5 pass (plan §9).
  function position(anchor: Element): void {
    const rect = anchor.getBoundingClientRect();
    card.style.left = "0px";
    card.style.top = "0px";
    const cardRect = card.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    let top = rect.bottom + CARD_GAP_PX;
    const flippedTop = rect.top - CARD_GAP_PX - cardRect.height;
    if (top + cardRect.height > viewportHeight && flippedTop >= 0) {
      top = flippedTop;
    }

    let left = rect.left;
    if (left + cardRect.width > viewportWidth) {
      left = viewportWidth - cardRect.width - CARD_GAP_PX;
    }

    card.style.left = `${Math.max(0, left)}px`;
    card.style.top = `${Math.max(0, top)}px`;
  }

  // Keep the card alive while the pointer is over it; hide once it leaves.
  card.addEventListener("pointerenter", cancelHide);
  card.addEventListener("pointerleave", scheduleHide);

  // Dismiss on scroll, any click outside the card, and Escape. Capture phase so
  // the card hides even when an inner handler stops propagation.
  const onScroll = (): void => hide();
  const onClick = (event: MouseEvent): void => {
    if (event.target instanceof Node && card.contains(event.target)) {
      return;
    }
    hide();
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      hide();
    }
  };
  window.addEventListener("scroll", onScroll, true);
  window.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKeyDown, true);

  return {
    contentElement: content,
    showContent: (anchor) => reveal(anchor, false),
    showMissing: (anchor) => reveal(anchor, true),
    hide,
    scheduleHide,
    cancelHide,
    destroy(): void {
      cancelHide();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("keydown", onKeyDown, true);
      card.remove();
    }
  };
}

function injectHoverCardStyles(): void {
  if (stylesInjected) {
    return;
  }
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .${CARD_CLASS} {
      position: fixed;
      z-index: 1000;
      max-width: 480px;
      max-height: 320px;
      overflow: auto;
      padding: 4px 8px;
      box-sizing: border-box;
      color: var(--vscode-editorHoverWidget-foreground, var(--vscode-editor-foreground));
      background-color: var(--vscode-editorHoverWidget-background, var(--vscode-editorWidget-background));
      border: 1px solid var(--vscode-editorHoverWidget-border, var(--vscode-widget-border, transparent));
      border-radius: 4px;
      box-shadow: 0 2px 8px var(--vscode-widget-shadow, rgba(0, 0, 0, 0.36));
      font-size: var(--vscode-font-size);
    }
    .${CARD_CLASS}[hidden] {
      display: none;
    }
    /* The reused preview renderer mounts its article inside the body; trim the
       default block margins so the card has no empty top/bottom gap. */
    .${CARD_CLASS} .markstudio-preview-content {
      padding: 4px 0;
    }
    .markstudio-hover-card-missing {
      padding: 2px 0;
      color: var(--vscode-descriptionForeground, var(--vscode-editorHoverWidget-foreground));
      font-style: italic;
    }
  `;
  document.head.append(style);
}
