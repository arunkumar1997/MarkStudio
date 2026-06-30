// Unit tests for the pure standard-Markdown-link target extractor
// (T-4.1a, Sprint 6 — ADR-0024).
//
// `parseMarkdownTargets` imports nothing from `vscode` or the DOM, so it runs
// directly under the Node test runner. Mirrors `parseWikiTargets.test.ts`
// structure: basic syntax, headings, skipped regions (front matter, fences,
// inline code), and rejected destinations (external URLs, bare anchors,
// reference-style links, non-`.md` extensions, workspace-absolute paths).

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { parseMarkdownTargets } from "../../src/links/parseMarkdownTargets";

describe("parseMarkdownTargets — basic syntax", () => {
  it("returns an empty list for text without Markdown links", () => {
    assert.deepEqual(parseMarkdownTargets("just a paragraph\nand another"), []);
  });

  it("extracts an inline [text](./note.md) with its 0-based line", () => {
    assert.deepEqual(parseMarkdownTargets("see [Guide](./Guide.md) here"), [
      { target: "./Guide.md", heading: null, line: 0 }
    ]);
  });

  it("extracts a bare-relative [text](note.md) without leading ./", () => {
    assert.deepEqual(parseMarkdownTargets("see [Guide](Guide.md) here"), [
      { target: "Guide.md", heading: null, line: 0 }
    ]);
  });

  it("captures the heading for [text](./note.md#section)", () => {
    assert.deepEqual(parseMarkdownTargets("[g](./Guide.md#Setup)"), [
      { target: "./Guide.md", heading: "Setup", line: 0 }
    ]);
  });

  it("strips an optional title after the destination", () => {
    assert.deepEqual(parseMarkdownTargets('[g](./Guide.md "the guide")'), [
      { target: "./Guide.md", heading: null, line: 0 }
    ]);
  });

  it("supports an angle-bracket-wrapped destination", () => {
    assert.deepEqual(parseMarkdownTargets("[g](<./Side Note.md>)"), [
      { target: "./Side Note.md", heading: null, line: 0 }
    ]);
  });

  it("supports an angle-bracket destination with a heading anchor", () => {
    assert.deepEqual(parseMarkdownTargets("[g](<./Side Note.md#Top>)"), [
      { target: "./Side Note.md", heading: "Top", line: 0 }
    ]);
  });

  it("supports a `.markdown` extension as well as `.md`", () => {
    assert.deepEqual(parseMarkdownTargets("[g](./Guide.markdown)"), [
      { target: "./Guide.markdown", heading: null, line: 0 }
    ]);
  });

  it("supports parents like [g](../sibling/note.md)", () => {
    assert.deepEqual(parseMarkdownTargets("[g](../sibling/note.md)"), [
      { target: "../sibling/note.md", heading: null, line: 0 }
    ]);
  });

  it("strips a `?query` from the destination", () => {
    assert.deepEqual(parseMarkdownTargets("[g](./Guide.md?v=2)"), [
      { target: "./Guide.md", heading: null, line: 0 }
    ]);
  });

  it("captures the heading after stripping a `?query`", () => {
    assert.deepEqual(parseMarkdownTargets("[g](./Guide.md?v=2#Setup)"), [
      { target: "./Guide.md", heading: "Setup", line: 0 }
    ]);
  });

  it("preserves balanced parentheses inside the destination", () => {
    assert.deepEqual(parseMarkdownTargets("[g](./note(1).md)"), [
      { target: "./note(1).md", heading: null, line: 0 }
    ]);
  });

  it("returns multiple links on the same line in document order", () => {
    assert.deepEqual(
      parseMarkdownTargets("see [a](./A.md) and [b](./B.md)"),
      [
        { target: "./A.md", heading: null, line: 0 },
        { target: "./B.md", heading: null, line: 0 }
      ]
    );
  });

  it("records the correct 0-based line index for multi-line documents", () => {
    const text = "line 0\nlink on [two](./two.md)\nline 2";
    assert.deepEqual(parseMarkdownTargets(text), [
      { target: "./two.md", heading: null, line: 1 }
    ]);
  });

  it("does not double-index a wiki-link `[[…]]`", () => {
    // `[[Guide]]` is the wiki path's responsibility — `parseMarkdownTargets`
    // must skip over it and not treat `[Guide]` as a link label.
    assert.deepEqual(parseMarkdownTargets("see [[Guide]] not a md link"), []);
  });
});

describe("parseMarkdownTargets — rejected destinations", () => {
  it("skips a bare anchor [text](#section)", () => {
    assert.deepEqual(parseMarkdownTargets("[here](#section)"), []);
  });

  it("skips an absolute http(s) URL", () => {
    assert.deepEqual(parseMarkdownTargets("[ext](https://example.com)"), []);
  });

  it("skips an absolute `mailto:` URL", () => {
    assert.deepEqual(parseMarkdownTargets("[mail](mailto:a@b.example)"), []);
  });

  it("skips a `vscode:` URL", () => {
    assert.deepEqual(parseMarkdownTargets("[cmd](vscode://...)"), []);
  });

  it("skips a protocol-relative `//host/path` URL", () => {
    assert.deepEqual(parseMarkdownTargets("[x](//cdn.example/a.md)"), []);
  });

  it("skips a workspace-absolute `/docs/x.md` (v1 deferral)", () => {
    assert.deepEqual(parseMarkdownTargets("[x](/docs/Guide.md)"), []);
  });

  it("skips a non-`.md` destination (e.g. an image)", () => {
    assert.deepEqual(parseMarkdownTargets("[x](./assets/pic.png)"), []);
  });

  it("skips a destination with no extension", () => {
    assert.deepEqual(parseMarkdownTargets("[x](./Guide)"), []);
  });

  it("skips a reference-style link `[text][id]`", () => {
    assert.deepEqual(
      parseMarkdownTargets("[guide][g]\n\n[g]: ./Guide.md"),
      []
    );
  });

  it("skips an empty destination `[text]()`", () => {
    assert.deepEqual(parseMarkdownTargets("[x]()"), []);
  });

  it("ignores a label that is not followed by `(`", () => {
    assert.deepEqual(parseMarkdownTargets("just [a label] alone"), []);
  });

  it("skips a destination that closes outside the same line", () => {
    // Line-wrapped link destinations are out of scope for v1.
    assert.deepEqual(parseMarkdownTargets("[x](./note.md\n)"), []);
  });
});

describe("parseMarkdownTargets — skipped regions", () => {
  it("skips links inside a fenced code block", () => {
    const text = "```\n[g](./Guide.md)\n```\n[h](./Real.md)";
    assert.deepEqual(parseMarkdownTargets(text), [
      { target: "./Real.md", heading: null, line: 3 }
    ]);
  });

  it("skips links inside a tilde-fenced code block", () => {
    const text = "~~~\n[g](./Guide.md)\n~~~";
    assert.deepEqual(parseMarkdownTargets(text), []);
  });

  it("skips links in a leading YAML front matter block", () => {
    const text = "---\ntitle: [g](./Guide.md)\n---\n[h](./Real.md)";
    assert.deepEqual(parseMarkdownTargets(text), [
      { target: "./Real.md", heading: null, line: 3 }
    ]);
  });

  it("skips links inside inline code spans", () => {
    assert.deepEqual(parseMarkdownTargets("see `[g](./Guide.md)` not a link"), []);
  });

  it("indexes links outside an inline code span on the same line", () => {
    assert.deepEqual(
      parseMarkdownTargets("`code` then [g](./Guide.md)"),
      [{ target: "./Guide.md", heading: null, line: 0 }]
    );
  });

  it("does not treat unterminated front matter as content", () => {
    // Mirrors `parseWikiTargets`: an unterminated `---` opener swallows the
    // whole document.
    const text = "---\nbroken metadata\n[g](./Guide.md)";
    assert.deepEqual(parseMarkdownTargets(text), []);
  });
});
