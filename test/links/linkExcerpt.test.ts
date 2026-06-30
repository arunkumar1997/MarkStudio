// Unit tests for the pure hover-preview excerpt extractor (T-4.2, M4.2).
//
// `extractExcerpt` imports nothing from `vscode`, the file system, or the DOM
// (only the pure heading scanner), so it runs directly under the Node test
// runner. These tests pin the Producer's excerpt rules (plan §4): top-of-note
// by default, the `#heading` section when a heading is given, a fall back to
// the top when the heading is absent, and the line + character caps.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  extractExcerpt,
  MAX_EXCERPT_LINES,
  MAX_EXCERPT_CHARS
} from "../../src/links/linkExcerpt";

describe("extractExcerpt — top of note (no heading)", () => {
  it("returns the whole note when it is short", () => {
    const text = "# Title\n\nA paragraph.\n\nAnother.";
    assert.equal(
      extractExcerpt(text, null),
      "# Title\n\nA paragraph.\n\nAnother."
    );
  });

  it("treats an empty heading like no heading (top of note)", () => {
    const text = "Intro line\n\n## Section\n\nBody.";
    assert.equal(extractExcerpt(text, ""), "Intro line\n\n## Section\n\nBody.");
    assert.equal(
      extractExcerpt(text, "   "),
      "Intro line\n\n## Section\n\nBody."
    );
  });

  it("trims trailing blank lines", () => {
    assert.equal(extractExcerpt("Body text.\n\n\n", null), "Body text.");
  });
});

describe("extractExcerpt — heading-section slice", () => {
  const note = [
    "# Top",
    "",
    "Intro paragraph.",
    "",
    "## Alpha",
    "",
    "Alpha body.",
    "",
    "## Beta",
    "",
    "Beta body."
  ].join("\n");

  it("slices from the heading to the next same-level heading", () => {
    assert.equal(extractExcerpt(note, "Alpha"), "## Alpha\n\nAlpha body.");
  });

  it("slices the final section to the end of the note", () => {
    assert.equal(extractExcerpt(note, "Beta"), "## Beta\n\nBeta body.");
  });

  it("matches the heading case-insensitively", () => {
    assert.equal(extractExcerpt(note, "alpha"), "## Alpha\n\nAlpha body.");
  });

  it("stops a deeper section at the next shallower heading", () => {
    const nested = [
      "## Parent",
      "",
      "Parent body.",
      "",
      "### Child",
      "",
      "Child body.",
      "",
      "## Sibling",
      "",
      "Sibling body."
    ].join("\n");
    // The Parent section runs through its Child subsection up to Sibling.
    assert.equal(
      extractExcerpt(nested, "Parent"),
      "## Parent\n\nParent body.\n\n### Child\n\nChild body."
    );
    // The Child section stops at the next same-or-shallower heading (Sibling).
    assert.equal(extractExcerpt(nested, "Child"), "### Child\n\nChild body.");
  });

  it("falls back to the top of the note when the heading is not found", () => {
    assert.equal(extractExcerpt(note, "Missing"), note.replace(/\s+$/, ""));
  });
});

describe("extractExcerpt — caps", () => {
  it("caps to MAX_EXCERPT_LINES lines", () => {
    const text = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");
    const excerpt = extractExcerpt(text, null);
    assert.equal(excerpt.split("\n").length, MAX_EXCERPT_LINES);
    assert.equal(excerpt.split("\n")[0], "line 0");
  });

  it("caps to MAX_EXCERPT_CHARS characters when fewer lines exceed the budget", () => {
    // One very long line blows the character budget before the line budget.
    const text = "x".repeat(MAX_EXCERPT_CHARS * 2);
    const excerpt = extractExcerpt(text, null);
    assert.equal(excerpt.length, MAX_EXCERPT_CHARS);
  });
});
