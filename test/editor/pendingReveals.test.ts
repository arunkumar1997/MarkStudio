// Unit tests for the pending-reveal registry (ADR-0021).
//
// `PendingReveals` imports nothing from `vscode` or the DOM, so it runs
// directly under the Node test runner. It backs the click-navigation /
// backlinks handshake: when a `.md` target is not yet open, the requested
// reveal line is parked here keyed by `uri.toString()` and applied once the
// target's MarkStudio webview reports `ready`.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { PendingReveals } from "../../src/editor/pendingReveals";

const KEY = "file:///notes/target.md";
const OTHER = "file:///notes/other.md";

describe("PendingReveals.take", () => {
  it("returns undefined when nothing is pending", () => {
    const reveals = new PendingReveals();
    assert.equal(reveals.take(KEY), undefined);
  });

  it("returns a recorded reveal line", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 12);
    assert.equal(reveals.take(KEY), 12);
  });

  it("is one-shot: a second take returns undefined", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 7);
    assert.equal(reveals.take(KEY), 7);
    assert.equal(reveals.take(KEY), undefined);
  });

  it("preserves a recorded line of 0 (top of file)", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 0);
    assert.equal(reveals.take(KEY), 0);
  });
});

describe("PendingReveals.set", () => {
  it("keeps reveals for different URIs independent", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 3);
    reveals.set(OTHER, 9);
    assert.equal(reveals.take(KEY), 3);
    assert.equal(reveals.take(OTHER), 9);
  });

  it("lets the most recent navigation win for the same URI", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 3);
    reveals.set(KEY, 20);
    assert.equal(reveals.take(KEY), 20);
  });
});

describe("PendingReveals.clear", () => {
  it("drops a pending reveal without applying it", () => {
    const reveals = new PendingReveals();
    reveals.set(KEY, 5);
    reveals.clear(KEY);
    assert.equal(reveals.take(KEY), undefined);
  });

  it("is a no-op for a URI with nothing pending", () => {
    const reveals = new PendingReveals();
    assert.doesNotThrow(() => reveals.clear(KEY));
  });
});
