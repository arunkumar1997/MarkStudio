// Integration tests for the markdown-it preview seam (T-113, ADR-0012).
//
// `createPreviewRenderer` (T-105, ADR-0008) is the other DOM-bound webview
// seam the unit layer could not reach. Its headline guarantee is **incremental
// patching**: an edit must mutate only the changed blocks' DOM nodes and leave
// every unchanged block's `Element` reference untouched, so VS Code's webview
// repaint cost is bounded by the size of the edit, not the document. These
// tests assert that node identity directly, plus the source-line mapping that
// scroll sync (T-2.1) depends on.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  createPreviewRenderer,
  type PreviewRenderer
} from "../../src/webview/preview/PreviewRenderer";
import { createContainer, removeContainer } from "./_setup/dom";

// The renderer debounces updates by 40 ms; wait past that to read the result.
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 80));
}

describe("createPreviewRenderer — incremental DOM patching", () => {
  let container: HTMLElement;
  let renderer: PreviewRenderer;

  beforeEach(() => {
    container = createContainer();
    renderer = createPreviewRenderer(container);
  });

  afterEach(() => {
    renderer.destroy();
    removeContainer(container);
  });

  function root(): HTMLElement {
    const el = container.querySelector(".markstudio-preview-content");
    assert.ok(el, "preview root should exist");
    return el as HTMLElement;
  }

  it("renders top-level blocks into the persistent preview root", async () => {
    renderer.update("# Title\n\nA paragraph.");
    await flush();

    const children = Array.from(root().children);
    assert.equal(children.length, 2);
    assert.equal(children[0].tagName, "H1");
    assert.equal(children[0].textContent, "Title");
    assert.equal(children[1].tagName, "P");
    assert.equal(children[1].textContent, "A paragraph.");
  });

  it("preserves unchanged block nodes and replaces only the edited block", async () => {
    renderer.update("# A\n\nB\n\nC");
    await flush();

    const before = Array.from(root().children);
    assert.equal(before.length, 3);

    // Edit only the middle block.
    renderer.update("# A\n\nB changed\n\nC");
    await flush();

    const after = Array.from(root().children);
    assert.equal(after.length, 3);

    // Unchanged blocks keep their exact DOM node (identity, not just markup).
    assert.equal(after[0], before[0], "heading node should be reused");
    assert.equal(
      after[2],
      before[2],
      "trailing paragraph node should be reused"
    );
    // The edited block is a new node with the new text.
    assert.notEqual(
      after[1],
      before[1],
      "edited paragraph node should be replaced"
    );
    assert.equal(after[1].textContent, "B changed");
    // The reused heading node still carries its original text.
    assert.equal(after[0].textContent, "A");
  });

  it("maps each rendered block to its 1-based source line", async () => {
    renderer.update("# Heading\n\nFirst paragraph.\n\nSecond paragraph.");
    await flush();

    const blocks = renderer.getBlocks();
    assert.equal(blocks.length, 3);
    assert.deepEqual(
      blocks.map((b) => b.startLine),
      [1, 3, 5]
    );
    assert.equal(blocks[0].node.tagName, "H1");
  });

  it("coalesces rapid updates and renders only the latest text", async () => {
    renderer.update("first");
    renderer.update("second");
    renderer.update("third");
    await flush();

    const children = Array.from(root().children);
    assert.equal(children.length, 1);
    assert.equal(children[0].textContent, "third");
  });
});
