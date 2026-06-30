// Unit tests for the graph panel's inbound message guard (`src/graph/GraphService.ts`).
//
// The graph webview is a tiny IIFE with a tight contract: it only ever sends
// `ready` and `openGraphNode`. This guard is the security boundary that turns
// arbitrary `unknown` postMessage payloads into typed `WebviewToHostMessage`s
// before the host acts on them (CODING_GUIDELINES.md §9). Anything else MUST
// be rejected — including well-formed editor-side messages (edits, layout
// changes, etc.) that the graph webview must never post.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { coerceWebviewToHostMessage } from "../../src/graph/GraphService";

describe("coerceWebviewToHostMessage — accepts the contract", () => {
  it("accepts a well-formed `ready`", () => {
    const out = coerceWebviewToHostMessage({ type: "ready" });
    assert.deepEqual(out, { type: "ready" });
  });

  it("accepts a well-formed `openGraphNode` with a non-empty path", () => {
    const out = coerceWebviewToHostMessage({
      type: "openGraphNode",
      path: "notes/a.md"
    });
    assert.deepEqual(out, { type: "openGraphNode", path: "notes/a.md" });
  });

  it("ignores extra unknown fields on a well-formed message", () => {
    const out = coerceWebviewToHostMessage({
      type: "openGraphNode",
      path: "notes/a.md",
      extra: 123
    });
    // The guard returns the narrowed shape; extra fields are not copied.
    assert.deepEqual(out, { type: "openGraphNode", path: "notes/a.md" });
  });
});

describe("coerceWebviewToHostMessage — rejects unknown shapes", () => {
  it("rejects null, undefined, primitives, and arrays", () => {
    assert.equal(coerceWebviewToHostMessage(null), null);
    assert.equal(coerceWebviewToHostMessage(undefined), null);
    assert.equal(coerceWebviewToHostMessage("ready"), null);
    assert.equal(coerceWebviewToHostMessage(42), null);
    assert.equal(coerceWebviewToHostMessage(true), null);
    assert.equal(coerceWebviewToHostMessage([]), null);
  });

  it("rejects an object with no `type`", () => {
    assert.equal(coerceWebviewToHostMessage({}), null);
    assert.equal(coerceWebviewToHostMessage({ path: "x" }), null);
  });

  it("rejects an unknown `type`", () => {
    assert.equal(
      coerceWebviewToHostMessage({ type: "doSomethingDangerous" }),
      null
    );
  });
});

describe("coerceWebviewToHostMessage — refuses editor-side messages", () => {
  // Defence-in-depth: even if a compromised graph webview tried to post an
  // edit, layout, or backlinks message, the guard at the graph panel boundary
  // must reject it. The editor-side bus is the only place those messages may
  // be accepted.

  it("rejects an `edit` payload", () => {
    assert.equal(
      coerceWebviewToHostMessage({
        type: "edit",
        changes: [{ from: 0, to: 0, insert: "x" }]
      }),
      null
    );
  });

  it("rejects an `openWikiLink` payload", () => {
    assert.equal(
      coerceWebviewToHostMessage({
        type: "openWikiLink",
        target: "Other",
        heading: null
      }),
      null
    );
  });

  it("rejects an `openMarkdownLink` payload", () => {
    assert.equal(
      coerceWebviewToHostMessage({
        type: "openMarkdownLink",
        href: "./other.md",
        target: "other.md",
        heading: null
      }),
      null
    );
  });
});

describe("coerceWebviewToHostMessage — rejects malformed openGraphNode", () => {
  it("rejects a missing `path`", () => {
    assert.equal(coerceWebviewToHostMessage({ type: "openGraphNode" }), null);
  });

  it("rejects an empty-string `path`", () => {
    assert.equal(
      coerceWebviewToHostMessage({ type: "openGraphNode", path: "" }),
      null
    );
  });

  it("rejects a non-string `path` (number, boolean, object)", () => {
    assert.equal(
      coerceWebviewToHostMessage({ type: "openGraphNode", path: 42 }),
      null
    );
    assert.equal(
      coerceWebviewToHostMessage({ type: "openGraphNode", path: true }),
      null
    );
    assert.equal(
      coerceWebviewToHostMessage({ type: "openGraphNode", path: { x: 1 } }),
      null
    );
    assert.equal(
      coerceWebviewToHostMessage({ type: "openGraphNode", path: null }),
      null
    );
  });
});
