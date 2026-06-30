// Integration test for the in-preview wiki-link click seam (T-4.1b).
//
// `registerWikiLinkClicks` mounts a single delegated click listener on the
// preview root that turns a click on an `a.markstudio-wikilink` into an
// `openWikiLink` message. The listener uses real DOM APIs (`addEventListener`,
// `Element.closest`, `dispatchEvent`), so it runs under the jsdom harness. The
// `WebviewMessageBus` it posts through is imported **type-only** by the source
// module, so a minimal fake bus that records posts is sufficient here.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { registerWikiLinkClicks } from "../../src/webview/preview/wikiLinkClick";
import { WIKILINK_CLASS } from "../../src/webview/preview/wikiLinks";
import type { WebviewMessageBus } from "../../src/messaging/WebviewMessageBus";
import type { WebviewToHostMessage } from "../../src/messaging/messages";
import { createContainer, removeContainer } from "./_setup/dom";

// A fake bus that records every posted message. Cast to the bus type — the
// source only needs `.post`.
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

// Build a wiki-link anchor like the one `wikiLinks.ts` renders.
function wikiAnchor(
  target: string,
  heading: string | null,
  label = target
): HTMLAnchorElement {
  const anchor = document.createElement("a");
  anchor.className = WIKILINK_CLASS;
  anchor.setAttribute("data-wikilink-target", target);
  if (heading !== null) {
    anchor.setAttribute("data-wikilink-heading", heading);
  }
  anchor.textContent = label;
  return anchor;
}

describe("registerWikiLinkClicks — click to openWikiLink", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = createContainer();
  });

  afterEach(() => {
    removeContainer(root);
  });

  it("posts openWikiLink with the target and a null heading", () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    root.append(wikiAnchor("Note", null));

    root
      .querySelector("a")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );

    assert.deepEqual(posted, [
      { type: "openWikiLink", target: "Note", heading: null }
    ]);
  });

  it("carries the heading when present", () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    root.append(wikiAnchor("Note", "Section"));

    root
      .querySelector("a")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );

    assert.deepEqual(posted, [
      { type: "openWikiLink", target: "Note", heading: "Section" }
    ]);
  });

  it("resolves from a click on an element nested inside the anchor", () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    const anchor = wikiAnchor("Note", null, "");
    const inner = document.createElement("span");
    inner.textContent = "Note";
    anchor.append(inner);
    root.append(anchor);

    inner.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, "openWikiLink");
  });

  it("prevents the default action for a wiki-link click", () => {
    const { bus } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    root.append(wikiAnchor("Note", null));

    const event = new MouseEvent("click", {
      bubbles: true,
      cancelable: true
    });
    root.querySelector("a")?.dispatchEvent(event);

    assert.equal(event.defaultPrevented, true);
  });

  it("ignores clicks that are not on a wiki-link", () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    const ordinary = document.createElement("a");
    ordinary.textContent = "plain link";
    root.append(ordinary);

    ordinary.dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true })
    );

    assert.deepEqual(posted, []);
  });

  it("stays inert for a same-document heading link (empty target)", () => {
    const { bus, posted } = createFakeBus();
    registerWikiLinkClicks(root, bus);
    // A `[[#heading]]` link renders with an empty target.
    root.append(wikiAnchor("", "Section", "Section"));

    root
      .querySelector("a")
      ?.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true })
      );

    assert.deepEqual(posted, []);
  });
});
