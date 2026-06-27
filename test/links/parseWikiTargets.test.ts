// Unit tests for the pure wiki-link target extractor (T-4.1, M4.1).
//
// `parseWikiTargets` imports nothing from `vscode` or the DOM, so it runs
// directly under the Node test runner. It is the host-side counterpart of the
// preview's inline rule (T-3.4 / ADR-0018): same `[[target]]` /
// `[[target|alias]]` / `[[target#heading]]` syntax, same rejection of newlines
// and nested brackets.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseWikiTargets } from "../../src/links/parseWikiTargets";

describe("parseWikiTargets — basic syntax", () => {
  it("returns an empty list for text without wiki-links", () => {
    assert.deepEqual(parseWikiTargets("just a paragraph\nand another"), []);
  });

  it("extracts a bare [[target]] with its 0-based line", () => {
    assert.deepEqual(parseWikiTargets("see [[Note]] here"), [
      { target: "Note", heading: null, line: 0 }
    ]);
  });

  it("uses the target, not the alias, for [[target|alias]]", () => {
    assert.deepEqual(parseWikiTargets("[[home|the home page]]"), [
      { target: "home", heading: null, line: 0 }
    ]);
  });

  it("captures the heading for [[target#heading]]", () => {
    assert.deepEqual(parseWikiTargets("[[Guide#Setup]]"), [
      { target: "Guide", heading: "Setup", line: 0 }
    ]);
  });

  it("captures target + heading for [[target#heading|alias]]", () => {
    assert.deepEqual(parseWikiTargets("[[Guide#Setup|read this]]"), [
      { target: "Guide", heading: "Setup", line: 0 }
    ]);
  });

  it("trims whitespace around the target and heading", () => {
    assert.deepEqual(parseWikiTargets("[[  Note  #  Section  ]]"), [
      { target: "Note", heading: "Section", line: 0 }
    ]);
  });

  it("preserves a path-qualified target verbatim", () => {
    assert.deepEqual(parseWikiTargets("[[docs/Guide]]"), [
      { target: "docs/Guide", heading: null, line: 0 }
    ]);
  });

  it("finds multiple links on one line in order", () => {
    assert.deepEqual(parseWikiTargets("[[A]] and [[B|b]] and [[C#x]]"), [
      { target: "A", heading: null, line: 0 },
      { target: "B", heading: null, line: 0 },
      { target: "C", heading: "x", line: 0 }
    ]);
  });

  it("reports the correct line for links across lines", () => {
    const text = ["# Title", "", "links to [[B]]", "and [[C]]"].join("\n");
    assert.deepEqual(parseWikiTargets(text), [
      { target: "B", heading: null, line: 2 },
      { target: "C", heading: null, line: 3 }
    ]);
  });
});

describe("parseWikiTargets — rejections", () => {
  it("ignores an empty [[]]", () => {
    assert.deepEqual(parseWikiTargets("[[]]"), []);
  });

  it("ignores a same-document [[#heading]] link (no note target)", () => {
    assert.deepEqual(parseWikiTargets("[[#Section]]"), []);
  });

  it("does not match an ordinary [text](url) link", () => {
    assert.deepEqual(parseWikiTargets("see [text](note.md) here"), []);
  });

  it("rejects a link containing a nested bracket", () => {
    assert.deepEqual(parseWikiTargets("[[a]b]]"), []);
    assert.deepEqual(parseWikiTargets("[[a[b]]"), []);
  });

  it("does not span across lines", () => {
    assert.deepEqual(parseWikiTargets("[[a\nb]]"), []);
  });
});

describe("parseWikiTargets — skipped regions", () => {
  it("ignores links inside a fenced code block", () => {
    const text = ["[[Real]]", "```", "[[NotALink]]", "```", "[[After]]"].join(
      "\n"
    );
    assert.deepEqual(parseWikiTargets(text), [
      { target: "Real", heading: null, line: 0 },
      { target: "After", heading: null, line: 4 }
    ]);
  });

  it("ignores links inside a tilde fenced block", () => {
    const text = ["~~~", "[[nope]]", "~~~", "[[yes]]"].join("\n");
    assert.deepEqual(parseWikiTargets(text), [
      { target: "yes", heading: null, line: 3 }
    ]);
  });

  it("skips leading YAML front matter", () => {
    const text = ["---", "title: [[NotALink]]", "---", "[[Real]]"].join("\n");
    assert.deepEqual(parseWikiTargets(text), [
      { target: "Real", heading: null, line: 3 }
    ]);
  });

  it("ignores a link inside an inline code span", () => {
    assert.deepEqual(parseWikiTargets("use `[[note]]` syntax"), []);
  });

  it("matches a link after an inline code span on the same line", () => {
    assert.deepEqual(parseWikiTargets("`code` then [[Note]]"), [
      { target: "Note", heading: null, line: 0 }
    ]);
  });

  it("treats an unterminated backtick run as literal", () => {
    assert.deepEqual(parseWikiTargets("a ` b [[Note]]"), [
      { target: "Note", heading: null, line: 0 }
    ]);
  });
});
