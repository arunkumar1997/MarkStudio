// Unit tests for MarkStudioDocument (T-112).
//
// `applyChanges` maps each CM6 change (character offsets into the pre-change
// text) onto a `vscode.Range` via `document.positionAt`, then funnels the batch
// through a single `WorkspaceEdit` so the edit lands as one undo step (ADR-0001,
// T-104). The test bundler aliases `vscode` to `test/_mocks/vscode.ts`, so we
// can assert the exact ranges/inserts handed to `WorkspaceEdit.replace` and the
// applyEdit result without a live Extension Host.

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type * as vscode from "vscode";

import { MarkStudioDocument } from "../../src/editor/MarkStudioDocument";
import {
  Position,
  __getLastAppliedEdit,
  __reset,
  __setApplyEditResult
} from "../_mocks/vscode";

// A minimal stand-in for `vscode.TextDocument`. `positionAt` models a single
// line so the offset survives onto `Position.character`, letting the tests read
// the offset → range mapping straight off the recorded edit.
function fakeDocument(text: string): vscode.TextDocument {
  return {
    uri: { toString: () => "file:///doc.md" },
    version: 1,
    getText: () => text,
    positionAt: (offset: number) => new Position(0, offset)
  } as unknown as vscode.TextDocument;
}

describe("MarkStudioDocument.applyChanges", () => {
  beforeEach(() => {
    __reset();
  });

  it("no-ops (returns true) for an empty change list", async () => {
    const doc = new MarkStudioDocument(fakeDocument("hello"));
    const ok = await doc.applyChanges([]);
    assert.equal(ok, true);
    assert.equal(__getLastAppliedEdit(), null);
  });

  it("maps a single change's offsets onto a range and insert", async () => {
    const doc = new MarkStudioDocument(fakeDocument("hello world"));
    const ok = await doc.applyChanges([{ from: 6, to: 11, insert: "there" }]);
    assert.equal(ok, true);

    const edit = __getLastAppliedEdit();
    assert.ok(edit);
    assert.equal(edit.replacements.length, 1);
    const [replacement] = edit.replacements;
    assert.equal(replacement.range.start.character, 6);
    assert.equal(replacement.range.end.character, 11);
    assert.equal(replacement.insert, "there");
  });

  it("batches multiple changes into a single WorkspaceEdit", async () => {
    const doc = new MarkStudioDocument(fakeDocument("abcdef"));
    await doc.applyChanges([
      { from: 0, to: 1, insert: "X" },
      { from: 3, to: 3, insert: "Y" }
    ]);

    const edit = __getLastAppliedEdit();
    assert.ok(edit);
    assert.equal(edit.replacements.length, 2);
    assert.deepEqual(
      edit.replacements.map((r) => [
        r.range.start.character,
        r.range.end.character,
        r.insert
      ]),
      [
        [0, 1, "X"],
        [3, 3, "Y"]
      ]
    );
  });

  it("propagates a failed applyEdit", async () => {
    __setApplyEditResult(false);
    const doc = new MarkStudioDocument(fakeDocument("abc"));
    const ok = await doc.applyChanges([{ from: 0, to: 0, insert: "z" }]);
    assert.equal(ok, false);
  });
});
