// Unit tests for the MessageBus boundary guards (T-112).
//
// `src/messaging/messages.ts` imports nothing from `vscode` or the DOM, so
// these guards are pure and run directly under `node:test`. Everything crossing
// the bus is untrusted input (CODING_GUIDELINES.md §9); the guards must accept
// every well-formed message and reject everything else, including the new
// `isMarkStudioConfig`-backed `init` / `configChanged` cases (T-111).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isHostToWebviewMessage,
  isWebviewToHostMessage
} from "../../src/messaging/messages";

const VALID_CONFIG = {
  lineNumbers: true,
  wordWrap: true,
  math: true,
  mermaid: true,
  callouts: true,
  wikiLinks: true
};

describe("isHostToWebviewMessage", () => {
  it("rejects non-objects", () => {
    assert.equal(isHostToWebviewMessage(null), false);
    assert.equal(isHostToWebviewMessage(undefined), false);
    assert.equal(isHostToWebviewMessage(42), false);
    assert.equal(isHostToWebviewMessage("init"), false);
  });

  it("rejects an unknown message type", () => {
    assert.equal(isHostToWebviewMessage({ type: "nope" }), false);
    assert.equal(isHostToWebviewMessage({}), false);
  });

  describe("init", () => {
    it("accepts a well-formed init with config", () => {
      assert.equal(
        isHostToWebviewMessage({
          type: "init",
          text: "# Hi",
          config: VALID_CONFIG
        }),
        true
      );
    });

    it("accepts init with a valid initialLayoutMode", () => {
      assert.equal(
        isHostToWebviewMessage({
          type: "init",
          text: "",
          config: VALID_CONFIG,
          initialLayoutMode: "split"
        }),
        true
      );
    });

    it("rejects init without text", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "init", config: VALID_CONFIG }),
        false
      );
    });

    it("rejects init without config", () => {
      assert.equal(isHostToWebviewMessage({ type: "init", text: "x" }), false);
    });

    it("rejects init whose config is malformed (lineNumbers not boolean)", () => {
      assert.equal(
        isHostToWebviewMessage({
          type: "init",
          text: "x",
          config: { lineNumbers: "yes" }
        }),
        false
      );
    });

    it("rejects init with an invalid initialLayoutMode", () => {
      assert.equal(
        isHostToWebviewMessage({
          type: "init",
          text: "x",
          config: VALID_CONFIG,
          initialLayoutMode: "zoomed"
        }),
        false
      );
    });
  });

  describe("configChanged", () => {
    it("accepts a well-formed configChanged", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "configChanged", config: VALID_CONFIG }),
        true
      );
    });

    it("rejects configChanged with a malformed config", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "configChanged", config: {} }),
        false
      );
      assert.equal(isHostToWebviewMessage({ type: "configChanged" }), false);
    });
  });

  describe("revealLine", () => {
    it("accepts a numeric line", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "revealLine", line: 12 }),
        true
      );
      assert.equal(
        isHostToWebviewMessage({ type: "revealLine", line: 0 }),
        true
      );
    });

    it("rejects a missing or non-numeric line", () => {
      assert.equal(isHostToWebviewMessage({ type: "revealLine" }), false);
      assert.equal(
        isHostToWebviewMessage({ type: "revealLine", line: "3" }),
        false
      );
    });
  });

  describe("setContent", () => {
    it("accepts text and rejects non-string text", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "setContent", text: "x" }),
        true
      );
      assert.equal(
        isHostToWebviewMessage({ type: "setContent", text: 1 }),
        false
      );
    });
  });

  describe("setLayoutMode", () => {
    it("accepts each valid mode", () => {
      for (const mode of ["split", "editor-only", "preview-only"]) {
        assert.equal(
          isHostToWebviewMessage({ type: "setLayoutMode", mode }),
          true
        );
      }
    });

    it("rejects an unknown mode", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "setLayoutMode", mode: "zen" }),
        false
      );
    });
  });

  describe("togglePreview / toggleSplit", () => {
    it("accept with only a type", () => {
      assert.equal(isHostToWebviewMessage({ type: "togglePreview" }), true);
      assert.equal(isHostToWebviewMessage({ type: "toggleSplit" }), true);
    });
  });

  describe("focusPane", () => {
    it("accepts editor and preview", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "focusPane", pane: "editor" }),
        true
      );
      assert.equal(
        isHostToWebviewMessage({ type: "focusPane", pane: "preview" }),
        true
      );
    });

    it("rejects an unknown pane", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "focusPane", pane: "sidebar" }),
        false
      );
    });
  });

  describe("error", () => {
    it("accepts a string message and rejects otherwise", () => {
      assert.equal(
        isHostToWebviewMessage({ type: "error", message: "boom" }),
        true
      );
      assert.equal(
        isHostToWebviewMessage({ type: "error", message: 5 }),
        false
      );
    });
  });
});

describe("isWebviewToHostMessage", () => {
  it("rejects non-objects and unknown types", () => {
    assert.equal(isWebviewToHostMessage(null), false);
    assert.equal(isWebviewToHostMessage({ type: "init", text: "x" }), false);
  });

  it("accepts ready", () => {
    assert.equal(isWebviewToHostMessage({ type: "ready" }), true);
  });

  describe("edit", () => {
    it("accepts a well-formed edit", () => {
      assert.equal(
        isWebviewToHostMessage({
          type: "edit",
          text: "hello",
          changes: [{ from: 0, to: 0, insert: "h" }]
        }),
        true
      );
    });

    it("accepts an empty change list", () => {
      assert.equal(
        isWebviewToHostMessage({ type: "edit", text: "", changes: [] }),
        true
      );
    });

    it("rejects edit without text", () => {
      assert.equal(
        isWebviewToHostMessage({ type: "edit", changes: [] }),
        false
      );
    });

    it("rejects edit whose changes is not an array", () => {
      assert.equal(
        isWebviewToHostMessage({ type: "edit", text: "x", changes: {} }),
        false
      );
    });

    it("rejects edit with a malformed change", () => {
      assert.equal(
        isWebviewToHostMessage({
          type: "edit",
          text: "x",
          changes: [{ from: 0, to: "1", insert: "y" }]
        }),
        false
      );
      assert.equal(
        isWebviewToHostMessage({
          type: "edit",
          text: "x",
          changes: [{ from: 0, to: 1 }]
        }),
        false
      );
    });
  });

  describe("layoutModeChanged", () => {
    it("accepts a valid mode and rejects an invalid one", () => {
      assert.equal(
        isWebviewToHostMessage({
          type: "layoutModeChanged",
          mode: "editor-only"
        }),
        true
      );
      assert.equal(
        isWebviewToHostMessage({ type: "layoutModeChanged", mode: "full" }),
        false
      );
    });
  });

  describe("error", () => {
    it("accepts a string message", () => {
      assert.equal(
        isWebviewToHostMessage({ type: "error", message: "x" }),
        true
      );
      assert.equal(isWebviewToHostMessage({ type: "error" }), false);
    });
  });
});
