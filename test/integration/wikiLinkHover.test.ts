// Integration tests for the in-preview wiki-link hover seam (T-4.2).
//
// Two DOM-bound seams under jsdom:
//   - `registerWikiLinkHover` — a delegated pointerover/pointerout pair on the
//     preview root that, after a dwell, posts a `requestLinkPreview` and tracks
//     the active anchor so stale host replies can be dropped.
//   - `createHoverCard` — the floating card that shows the rendered excerpt or
//     a "no note found" fallback and dismisses on Escape.
//
// jsdom cannot measure layout, so these assert behaviour and DOM state (posts,
// active-anchor tracking, visible/hidden, rendered content) — never pixel
// geometry. That is left to the manual F5 matrix (plan §9).

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { registerWikiLinkHover } from "../../src/webview/preview/wikiLinkHover";
import { createHoverCard } from "../../src/webview/preview/HoverCard";
import {
  createPreviewRenderer,
  type PreviewRenderer
} from "../../src/webview/preview/PreviewRenderer";
import { WIKILINK_CLASS } from "../../src/webview/preview/wikiLinks";
import type { WebviewMessageBus } from "../../src/messaging/WebviewMessageBus";
import type {
  MarkStudioConfig,
  WebviewToHostMessage
} from "../../src/messaging/messages";
import { createContainer, removeContainer } from "./_setup/dom";

const CONFIG: MarkStudioConfig = {
  lineNumbers: true,
  wordWrap: true,
  math: true,
  mermaid: true,
  callouts: true,
  wikiLinks: true,
  footnotes: true,
  taskLists: true,
  tables: true,
  strikethrough: true
};

function createFakeBus(): {
  bus: WebviewMessageBus;
  posted: WebviewToHostMessage[];
} {
  const posted: WebviewToHostMessage[] = [];
  const bus = {
    post(message: WebviewToHostMessage): void {
      posted.push(message);
    }
  } as unknown as WebviewMessageBus;
  return { bus, posted };
}

function wikiAnchor(target: string, heading: string | null): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.className = WIKILINK_CLASS;
  anchor.setAttribute("data-wikilink-target", target);
  if (heading !== null) {
    anchor.setAttribute("data-wikilink-heading", heading);
  }
  anchor.textContent = target;
  return anchor;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("registerWikiLinkHover — dwell to requestLinkPreview", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = createContainer();
  });

  afterEach(() => {
    removeContainer(root);
  });

  it("posts requestLinkPreview after the dwell delay", async () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkHover(root, bus, {
      dwellMs: 5,
      onRequestHide: () => {},
      onCancelHide: () => {}
    });
    const anchor = wikiAnchor("Note", "Section");
    root.append(anchor);

    anchor.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
    await wait(25);

    assert.deepEqual(posted, [
      { type: "requestLinkPreview", target: "Note", heading: "Section" }
    ]);
  });

  it("does not post for a same-document heading link (empty target)", async () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkHover(root, bus, {
      dwellMs: 5,
      onRequestHide: () => {},
      onCancelHide: () => {}
    });
    const anchor = wikiAnchor("", "Section");
    root.append(anchor);

    anchor.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
    await wait(25);

    assert.deepEqual(posted, []);
  });

  it("cancels the pending request when the pointer leaves before the dwell", async () => {
    const { bus, posted } = createFakeBus();
    let hideRequested = false;
    registerWikiLinkHover(root, bus, {
      dwellMs: 30,
      onRequestHide: () => {
        hideRequested = true;
      },
      onCancelHide: () => {}
    });
    const anchor = wikiAnchor("Note", null);
    root.append(anchor);

    anchor.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
    anchor.dispatchEvent(
      new MouseEvent("pointerout", { bubbles: true, relatedTarget: root })
    );
    await wait(50);

    assert.deepEqual(posted, []);
    assert.equal(hideRequested, true);
  });

  it("tracks the active anchor and drops it once the pointer leaves", async () => {
    const { bus } = createFakeBus();
    const hover = registerWikiLinkHover(root, bus, {
      dwellMs: 5,
      onRequestHide: () => {},
      onCancelHide: () => {}
    });
    const anchor = wikiAnchor("Note", "Section");
    root.append(anchor);

    anchor.dispatchEvent(new MouseEvent("pointerover", { bubbles: true }));
    await wait(25);

    assert.equal(hover.getActiveAnchor(), anchor);
    assert.equal(hover.matchesActiveRequest("Note", "Section"), true);
    // A reply for a different link is stale.
    assert.equal(hover.matchesActiveRequest("Other", null), false);

    anchor.dispatchEvent(
      new MouseEvent("pointerout", { bubbles: true, relatedTarget: root })
    );
    assert.equal(hover.getActiveAnchor(), null);
    assert.equal(hover.matchesActiveRequest("Note", "Section"), false);
  });
});

describe("createHoverCard — show, fallback, dismiss", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer | null;
  let card: ReturnType<typeof createHoverCard> | null;

  beforeEach(() => {
    container = createContainer();
    renderer = null;
    card = null;
  });

  afterEach(() => {
    renderer?.destroy();
    card?.destroy();
    removeContainer(container);
  });

  function flush(): Promise<void> {
    return wait(80);
  }

  it("renders the excerpt into the card body via the reused renderer", async () => {
    card = createHoverCard({ parent: container });
    renderer = createPreviewRenderer(card.contentElement, CONFIG);
    const anchor = wikiAnchor("Note", null);
    container.append(anchor);

    renderer.update("# Hello\n\nWorld paragraph.");
    card.showContent(anchor);
    await flush();

    const cardEl = container.querySelector(".markstudio-hover-card");
    assert.ok(cardEl, "card element should exist");
    assert.equal((cardEl as HTMLElement).hidden, false);
    const heading = card.contentElement.querySelector("h1");
    assert.ok(heading, "rendered excerpt heading should exist");
    assert.equal(heading?.textContent, "Hello");
  });

  it("shows the fallback for a missing target", () => {
    card = createHoverCard({ parent: container });
    const anchor = wikiAnchor("Ghost", null);
    container.append(anchor);

    card.showMissing(anchor);

    const cardEl = container.querySelector(
      ".markstudio-hover-card"
    ) as HTMLElement;
    const fallback = container.querySelector(
      ".markstudio-hover-card-missing"
    ) as HTMLElement;
    assert.equal(cardEl.hidden, false);
    assert.equal(fallback.hidden, false);
    assert.equal(card.contentElement.hidden, true);
    assert.equal(fallback.textContent, "No note found");
  });

  it("dismisses on Escape", () => {
    card = createHoverCard({ parent: container });
    const anchor = wikiAnchor("Note", null);
    container.append(anchor);

    card.showMissing(anchor);
    const cardEl = container.querySelector(
      ".markstudio-hover-card"
    ) as HTMLElement;
    assert.equal(cardEl.hidden, false);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    assert.equal(cardEl.hidden, true);
  });
});
