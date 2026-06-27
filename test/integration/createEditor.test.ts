// Integration tests for the CodeMirror 6 editor seam (T-113, ADR-0012).
//
// These exercise `createEditor` against a real CodeMirror `EditorView` under
// the jsdom harness — the seam the unit layer (T-112) could not reach because
// CodeMirror needs a DOM. The headline guarantee is the `RemoteSync` echo path
// (ADR-0004, T-104): content the host pushes in via `setContentFromHost` must
// update the document but must **not** round-trip back to the host as a local
// `edit`, or every external change would feed back as a phantom user edit.

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  createEditor,
  type ChangeBatch
} from "../../src/webview/editor/createEditor";
import type { MarkStudioConfig } from "../../src/messaging/messages";
import { createContainer, removeContainer } from "./_setup/dom";

const CONFIG: MarkStudioConfig = { lineNumbers: true };

describe("createEditor — host/local edit seam", () => {
  let container: HTMLElement;
  let batches: ChangeBatch[];

  beforeEach(() => {
    container = createContainer();
    batches = [];
  });

  afterEach(() => {
    removeContainer(container);
  });

  function build(
    initialText: string,
    initialCursor?: { anchor: number; head: number }
  ) {
    return createEditor({
      parent: container,
      initialText,
      initialConfig: CONFIG,
      initialCursor: initialCursor ?? null,
      onLocalChange: (batch) => batches.push(batch)
    });
  }

  it("applies host content without echoing it back as a local edit", () => {
    const editor = build("hello");
    editor.setContentFromHost("hello world");

    assert.equal(editor.view.state.doc.toString(), "hello world");
    assert.equal(
      batches.length,
      0,
      "host content must not round-trip as an edit"
    );

    editor.destroy();
  });

  it("ignores host content identical to the current document (no-op)", () => {
    const editor = build("same text");
    editor.setContentFromHost("same text");

    assert.equal(editor.view.state.doc.toString(), "same text");
    assert.equal(batches.length, 0);

    editor.destroy();
  });

  it("forwards a user edit to onLocalChange as a minimal diff batch", () => {
    const editor = build("hello world");

    // Simulate the user replacing "world" (offsets 6..11) with "there".
    editor.view.dispatch({ changes: { from: 6, to: 11, insert: "there" } });

    assert.equal(editor.view.state.doc.toString(), "hello there");
    assert.equal(batches.length, 1);
    const [batch] = batches;
    assert.equal(batch.text, "hello there");
    assert.deepEqual(
      batch.changes.map((c) => ({ from: c.from, to: c.to, insert: c.insert })),
      [{ from: 6, to: 11, insert: "there" }]
    );

    editor.destroy();
  });

  it("preserves the cursor when host content changes a region after it", () => {
    // Cursor sits in the middle line; the host edit replaces the last line.
    const editor = build("AAAA\nBBBB\nCCCC", { anchor: 7, head: 7 });
    assert.equal(editor.view.state.selection.main.head, 7);

    editor.setContentFromHost("AAAA\nBBBB\nDDDD");

    // The change was entirely after the cursor, so its offset is unchanged
    // (minimal-diff reconciliation, T-110) and it produced no local edit.
    assert.equal(editor.view.state.selection.main.head, 7);
    assert.equal(batches.length, 0);

    editor.destroy();
  });
});
