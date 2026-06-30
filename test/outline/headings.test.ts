// Unit tests for the pure document-outline heading extraction (T-2.2).
//
// `parseHeadings` and `buildHeadingTree` import nothing from `vscode` or the
// DOM, so they run directly under the Node test runner. They are the only
// outline modules with non-trivial pure logic; `OutlineTreeProvider` and
// `registerOutline` are host-API glue exercised manually / in the Extension
// Host layer.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildHeadingTree,
  findHeadingLine,
  parseHeadings,
  type Heading
} from "../../src/outline/headings";

describe("parseHeadings — ATX", () => {
  it("returns an empty list for text without headings", () => {
    assert.deepEqual(parseHeadings("just a paragraph\nand another"), []);
  });

  it("extracts ATX headings with their level and 0-based line", () => {
    const text = ["# Title", "", "## Section", "", "### Sub"].join("\n");
    assert.deepEqual(parseHeadings(text), [
      { level: 1, text: "Title", line: 0 },
      { level: 2, text: "Section", line: 2 },
      { level: 3, text: "Sub", line: 4 }
    ]);
  });

  it("strips a trailing closing sequence of #s", () => {
    assert.deepEqual(parseHeadings("## Heading ##"), [
      { level: 2, text: "Heading", line: 0 }
    ]);
  });

  it("keeps trailing #s that are not a closing sequence (no space)", () => {
    assert.deepEqual(parseHeadings("## Heading##"), [
      { level: 2, text: "Heading##", line: 0 }
    ]);
  });

  it("treats an empty ATX heading as a blank-text heading", () => {
    assert.deepEqual(parseHeadings("#"), [{ level: 1, text: "", line: 0 }]);
  });

  it("ignores seven or more #s (not a heading)", () => {
    assert.deepEqual(parseHeadings("####### too deep"), []);
  });

  it("allows up to three leading spaces of indentation", () => {
    assert.deepEqual(parseHeadings("   ### Indented"), [
      { level: 3, text: "Indented", line: 0 }
    ]);
  });

  it("requires whitespace after the #s", () => {
    assert.deepEqual(parseHeadings("#NotAHeading"), []);
  });
});

describe("parseHeadings — fenced code blocks", () => {
  it("ignores #s inside a backtick fenced block", () => {
    const text = ["# Real", "```", "# not a heading", "```", "## After"].join(
      "\n"
    );
    assert.deepEqual(parseHeadings(text), [
      { level: 1, text: "Real", line: 0 },
      { level: 2, text: "After", line: 4 }
    ]);
  });

  it("ignores #s inside a tilde fenced block", () => {
    const text = ["~~~", "# nope", "~~~", "# yes"].join("\n");
    assert.deepEqual(parseHeadings(text), [{ level: 1, text: "yes", line: 3 }]);
  });
});

describe("parseHeadings — front matter", () => {
  it("skips a leading YAML front-matter block", () => {
    const text = [
      "---",
      "title: My Note",
      "tags: [a, b]",
      "---",
      "# Heading"
    ].join("\n");
    assert.deepEqual(parseHeadings(text), [
      { level: 1, text: "Heading", line: 4 }
    ]);
  });
});

describe("parseHeadings — setext", () => {
  it("reads a `=` underline as an h1 on the text line", () => {
    const text = ["My Title", "========", "", "body"].join("\n");
    assert.deepEqual(parseHeadings(text), [
      { level: 1, text: "My Title", line: 0 }
    ]);
  });

  it("reads a `-` underline as an h2", () => {
    const text = ["My Section", "----------"].join("\n");
    assert.deepEqual(parseHeadings(text), [
      { level: 2, text: "My Section", line: 0 }
    ]);
  });

  it("does not treat a `---` after a blank line as a heading", () => {
    const text = ["paragraph", "", "---", "more"].join("\n");
    assert.deepEqual(parseHeadings(text), []);
  });

  it("does not treat a `---` after a list item as a heading", () => {
    const text = ["- item", "---"].join("\n");
    assert.deepEqual(parseHeadings(text), []);
  });
});

describe("parseHeadings — line endings", () => {
  it("handles CRLF line endings", () => {
    assert.deepEqual(parseHeadings("# A\r\n## B"), [
      { level: 1, text: "A", line: 0 },
      { level: 2, text: "B", line: 1 }
    ]);
  });
});

describe("buildHeadingTree", () => {
  const h = (level: number, line: number): Heading => ({
    level,
    text: `h${level}`,
    line
  });

  it("returns an empty array for no headings", () => {
    assert.deepEqual(buildHeadingTree([]), []);
  });

  it("nests deeper headings under the preceding shallower one", () => {
    const tree = buildHeadingTree([h(1, 0), h(2, 1), h(2, 2), h(1, 3)]);
    assert.equal(tree.length, 2);
    assert.equal(tree[0].heading.line, 0);
    assert.equal(tree[0].children.length, 2);
    assert.equal(tree[0].children[0].heading.line, 1);
    assert.equal(tree[1].heading.line, 3);
    assert.equal(tree[1].children.length, 0);
  });

  it("handles non-contiguous levels (h1 then h3)", () => {
    const tree = buildHeadingTree([h(1, 0), h(3, 1)]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].children.length, 1);
    assert.equal(tree[0].children[0].heading.level, 3);
  });

  it("promotes a heading shallower than all before it to a root", () => {
    const tree = buildHeadingTree([h(2, 0), h(1, 1)]);
    assert.equal(tree.length, 2);
    assert.equal(tree[0].children.length, 0);
    assert.equal(tree[1].heading.level, 1);
  });
});

describe("findHeadingLine (T-4.1b navigation)", () => {
  const doc = [
    "# Title",
    "",
    "Intro paragraph.",
    "",
    "## Getting Started",
    "",
    "Body.",
    "",
    "## Reference"
  ].join("\n");

  it("returns the 0-based line of a matching heading", () => {
    assert.equal(findHeadingLine(doc, "Getting Started"), 4);
  });

  it("matches case-insensitively and trims the query", () => {
    assert.equal(findHeadingLine(doc, "  getting started  "), 4);
  });

  it("returns the first match's line for the top heading", () => {
    assert.equal(findHeadingLine(doc, "Title"), 0);
  });

  it("returns -1 when no heading matches", () => {
    assert.equal(findHeadingLine(doc, "Nonexistent"), -1);
  });

  it("returns -1 for an empty query", () => {
    assert.equal(findHeadingLine(doc, "   "), -1);
  });

  it("ignores a heading-like line inside a fenced code block", () => {
    const text = ["# Real", "", "```", "## Fake", "```"].join("\n");
    assert.equal(findHeadingLine(text, "Fake"), -1);
    assert.equal(findHeadingLine(text, "Real"), 0);
  });
});
