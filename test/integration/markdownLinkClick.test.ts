// Integration test for the in-preview standard-markdown-link click seam
// (ADR-0021 2026-06-30 amendment, extended for standard markdown links).
//
// `registerMarkdownLinkClicks` mounts a single delegated click listener on the
// preview root: a click on an `<a href>` whose path resolves to a workspace
// `.md` / `.markdown` file is turned into an `openMarkdownLink` message; every
// other click — external URLs, modifier-held opens, fragment-only links,
// non-markdown extensions, and wiki-link anchors — is left to the webview's
// default behaviour. The listener uses real DOM APIs, so it runs under the
// jsdom harness; the `WebviewMessageBus` is imported type-only so a minimal
// fake bus that records posts is sufficient here.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { registerMarkdownLinkClicks } from "../../src/webview/preview/markdownLinkClick";
import { WIKILINK_CLASS } from "../../src/webview/preview/wikiLinks";
import type { WebviewMessageBus } from "../../src/messaging/WebviewMessageBus";
import type { WebviewToHostMessage } from "../../src/messaging/messages";
import { createContainer, removeContainer } from "./_setup/dom";

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

function anchor(href: string, label = href): HTMLAnchorElement {
  const a = document.createElement("a");
  a.setAttribute("href", href);
  a.textContent = label;
  return a;
}

function click(element: Element, init?: MouseEventInit): MouseEvent {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    ...init
  });
  element.dispatchEvent(event);
  return event;
}

describe("registerMarkdownLinkClicks — click to openMarkdownLink", () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = createContainer();
  });

  afterEach(() => {
    removeContainer(root);
  });

  it("posts openMarkdownLink for a relative `.md` href with no heading", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("./Other.md", "Other"));

    const event = click(root.querySelector("a")!);

    assert.deepEqual(posted, [
      {
        type: "openMarkdownLink",
        href: "./Other.md",
        target: "./Other.md",
        heading: null
      }
    ]);
    assert.equal(event.defaultPrevented, true);
  });

  it("carries the heading for a `#fragment` href", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("./Other.md#Section", "Section"));

    click(root.querySelector("a")!);

    assert.deepEqual(posted, [
      {
        type: "openMarkdownLink",
        href: "./Other.md#Section",
        target: "./Other.md",
        heading: "Section"
      }
    ]);
  });

  it("posts for a workspace-absolute `/docs/x.md` href", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("/docs/Other.md", "Other"));

    click(root.querySelector("a")!);

    assert.deepEqual(posted, [
      {
        type: "openMarkdownLink",
        href: "/docs/Other.md",
        target: "/docs/Other.md",
        heading: null
      }
    ]);
  });

  it("posts for a `.markdown` extension", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("./Note.markdown", "Note"));

    click(root.querySelector("a")!);

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, "openMarkdownLink");
  });

  it("resolves from a click on an element nested inside the anchor", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    const a = anchor("./Other.md", "");
    const inner = document.createElement("span");
    inner.textContent = "Other";
    a.append(inner);
    root.append(a);

    click(inner);

    assert.equal(posted.length, 1);
    assert.equal(posted[0].type, "openMarkdownLink");
  });

  it("does NOT post for an external `https:` URL", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("https://example.com/a.md", "external"));

    const event = click(root.querySelector("a")!);

    assert.deepEqual(posted, []);
    assert.equal(event.defaultPrevented, false);
  });

  it("does NOT post for `mailto:` / `vscode:` / `command:` hrefs", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    for (const href of [
      "mailto:user@example.com",
      "vscode://settings",
      "command:foo"
    ]) {
      root.append(anchor(href));
    }

    for (const a of root.querySelectorAll("a")) {
      const event = click(a);
      assert.equal(event.defaultPrevented, false);
    }
    assert.deepEqual(posted, []);
  });

  it("does NOT post for a same-document `#fragment` link", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("#Section"));

    const event = click(root.querySelector("a")!);

    assert.deepEqual(posted, []);
    assert.equal(event.defaultPrevented, false);
  });

  it("does NOT post for a non-markdown extension (.png / .pdf / .ts)", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    for (const href of ["./image.png", "./doc.pdf", "./script.ts"]) {
      root.append(anchor(href));
    }

    for (const a of root.querySelectorAll("a")) {
      const event = click(a);
      assert.equal(event.defaultPrevented, false);
    }
    assert.deepEqual(posted, []);
  });

  it("does NOT post when a modifier key is held", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("./Other.md"));

    for (const modifier of [
      { ctrlKey: true },
      { metaKey: true },
      { shiftKey: true },
      { altKey: true }
    ]) {
      const event = click(root.querySelector("a")!, modifier);
      assert.equal(event.defaultPrevented, false);
    }
    assert.deepEqual(posted, []);
  });

  it("ignores a wiki-link anchor (owned by wikiLinkClick.ts)", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    // A wiki-link anchor carries `data-wikilink-target` and has no `href`.
    // Even if a wiki-link somehow grew an href (it shouldn't), this handler
    // must stay strictly disjoint.
    const wikiAnchor = document.createElement("a");
    wikiAnchor.className = WIKILINK_CLASS;
    wikiAnchor.setAttribute("data-wikilink-target", "Other");
    wikiAnchor.setAttribute("href", "./Other.md");
    wikiAnchor.textContent = "Other";
    root.append(wikiAnchor);

    const event = click(wikiAnchor);

    assert.deepEqual(posted, []);
    assert.equal(event.defaultPrevented, false);
  });

  it("does not act on a click whose default is already prevented", () => {
    const { bus, posted } = createFakeBus();
    // Pre-prevent: a hypothetical earlier handler claimed this click.
    root.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
      },
      true
    );
    registerMarkdownLinkClicks(root, bus);
    root.append(anchor("./Other.md"));

    click(root.querySelector("a")!);

    assert.deepEqual(posted, []);
  });

  it("ignores clicks that are not on an anchor at all", () => {
    const { bus, posted } = createFakeBus();
    registerMarkdownLinkClicks(root, bus);
    const div = document.createElement("div");
    div.textContent = "not a link";
    root.append(div);

    const event = click(div);

    assert.deepEqual(posted, []);
    assert.equal(event.defaultPrevented, false);
  });
});
