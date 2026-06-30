// In-preview wiki-link click handling (T-4.1b, M4.x — Phase 4).
//
// T-3.4 renders `[[note]]` as an `a.markstudio-wikilink` carrying its target
// (and optional heading) in `data-*` attributes but no `href`, so a click does
// nothing on its own. This module mounts a **single delegated** click listener
// on the persistent preview root: when a wiki-link is clicked it reads the
// `data-*` payload and posts an `openWikiLink` message; the host resolves the
// target against the active note and opens it (see MarkStudioEditorProvider).
//
// Delegation (one listener, not one-per-anchor) keeps the hot render/patch path
// in PreviewRenderer untouched and survives every incremental DOM update — the
// listener lives on the preview pane, which is never replaced (ADR-0002).

import type { WebviewMessageBus } from "../../messaging/WebviewMessageBus";
import { WIKILINK_CLASS } from "./wikiLinks";

// Attribute names stamped on a rendered wiki-link anchor by `wikiLinks.ts`.
const TARGET_ATTR = "data-wikilink-target";
const HEADING_ATTR = "data-wikilink-heading";

// Mount the delegated wiki-link click handler on `previewRoot` (the persistent
// preview pane). Clicks that land on — or inside — an `a.markstudio-wikilink`
// are intercepted: the default action is prevented and an `openWikiLink`
// message is posted with the link's target and optional heading. Clicks
// elsewhere are ignored. Bind once for the lifetime of the webview.
export function registerWikiLinkClicks(
  previewRoot: HTMLElement,
  bus: WebviewMessageBus
): void {
  previewRoot.addEventListener("click", (event) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) {
      return;
    }
    const anchor = eventTarget.closest(`a.${WIKILINK_CLASS}`);
    if (anchor === null) {
      return;
    }

    const target = anchor.getAttribute(TARGET_ATTR);
    // A same-document heading link (`[[#heading]]`) has no note target; there is
    // nothing to open, so leave it inert this sprint.
    if (target === null || target.length === 0) {
      return;
    }

    event.preventDefault();
    const heading = anchor.getAttribute(HEADING_ATTR);
    bus.post({ type: "openWikiLink", target, heading });
  });
}
