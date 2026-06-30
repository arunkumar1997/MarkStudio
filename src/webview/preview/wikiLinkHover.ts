// In-preview wiki-link hover handling (T-4.2, M4.2 — Phase 4).
//
// The read-side counterpart to `wikiLinkClick.ts`. T-3.4 renders `[[note]]` as
// an `a.markstudio-wikilink` carrying its target (and optional heading) in
// `data-*` attributes. This module mounts a **single delegated** pair of
// `pointerover` / `pointerout` listeners on the persistent preview root: when
// the pointer rests on a wiki-link for a short **dwell** it posts a
// `requestLinkPreview`; the host resolves the target and replies with a
// `linkPreviewContent` the webview routes to the hover card. Leaving the anchor
// cancels a pending dwell and asks the card to hide.
//
// Delegation (one pair of listeners, not one-per-anchor) keeps the hot
// render/patch path in PreviewRenderer untouched and survives every incremental
// DOM update — the listeners live on the preview pane, which is never replaced
// (ADR-0002).

import type { WebviewMessageBus } from "../../messaging/WebviewMessageBus";
import { WIKILINK_CLASS } from "./wikiLinks";

// Attribute names stamped on a rendered wiki-link anchor by `wikiLinks.ts`.
const TARGET_ATTR = "data-wikilink-target";
const HEADING_ATTR = "data-wikilink-heading";

// How long the pointer must rest on a wiki-link before a preview is requested.
// Short enough to feel responsive, long enough that sweeping the pointer across
// links does not fire a request per link.
const DEFAULT_DWELL_MS = 300;

export interface WikiLinkHoverOptions {
  // Dwell delay before a preview is requested (default ~300 ms). Exposed so
  // tests can drive the seam without waiting on a real timer.
  readonly dwellMs?: number;
  // Called when the pointer leaves the hovered anchor: the card should hide
  // (after its own small grace, so the pointer can travel into the card).
  readonly onRequestHide: () => void;
  // Called when the pointer re-enters the tracked anchor: cancel a pending hide.
  readonly onCancelHide: () => void;
}

interface ActiveRequest {
  readonly anchor: Element;
  readonly target: string;
  readonly heading: string | null;
}

export interface WikiLinkHover {
  // The anchor a preview was most recently requested for and the pointer is
  // still over, or `null` once the pointer has left. Used to position the card
  // and to drop a stale host response (the pointer may have moved on).
  getActiveAnchor(): Element | null;
  // Whether `target`/`heading` from a host reply still match the active request
  // — i.e. the reply is for the link the pointer is still resting on.
  matchesActiveRequest(target: string, heading: string | null): boolean;
}

// Mount the delegated wiki-link hover handler on `previewRoot` (the persistent
// preview pane). Bind once for the lifetime of the webview.
export function registerWikiLinkHover(
  previewRoot: HTMLElement,
  bus: WebviewMessageBus,
  options: WikiLinkHoverOptions
): WikiLinkHover {
  const dwellMs = options.dwellMs ?? DEFAULT_DWELL_MS;
  let dwellTimer: number | null = null;
  let hoveredAnchor: Element | null = null;
  let active: ActiveRequest | null = null;

  function clearDwell(): void {
    if (dwellTimer !== null) {
      window.clearTimeout(dwellTimer);
      dwellTimer = null;
    }
  }

  previewRoot.addEventListener("pointerover", (event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) {
      return;
    }
    const anchor = eventTarget.closest(`a.${WIKILINK_CLASS}`);
    if (anchor === null) {
      return;
    }
    if (anchor === hoveredAnchor) {
      // Moving within the same anchor (e.g. over a child span): keep the card.
      options.onCancelHide();
      return;
    }

    // Entered a new wiki-link.
    hoveredAnchor = anchor;
    active = null;
    options.onCancelHide();
    clearDwell();

    const target = anchor.getAttribute(TARGET_ATTR);
    // A same-document heading link (`[[#heading]]`) has no note target; there is
    // nothing to preview, so leave it inert (matches the click handler).
    if (target === null || target.length === 0) {
      return;
    }
    const heading = anchor.getAttribute(HEADING_ATTR);

    dwellTimer = window.setTimeout(() => {
      dwellTimer = null;
      active = { anchor, target, heading };
      bus.post({ type: "requestLinkPreview", target, heading });
    }, dwellMs);
  });

  previewRoot.addEventListener("pointerout", (event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) {
      return;
    }
    const anchor = eventTarget.closest(`a.${WIKILINK_CLASS}`);
    if (anchor === null || anchor !== hoveredAnchor) {
      return;
    }
    // Ignore moves to a descendant of the same anchor — the pointer has not
    // actually left the link.
    const related = event.relatedTarget;
    if (related instanceof Node && anchor.contains(related)) {
      return;
    }

    hoveredAnchor = null;
    active = null;
    clearDwell();
    options.onRequestHide();
  });

  return {
    getActiveAnchor: () => active?.anchor ?? null,
    matchesActiveRequest: (target, heading) =>
      active !== null && active.target === target && active.heading === heading
  };
}
