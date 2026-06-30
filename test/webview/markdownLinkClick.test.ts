// Unit tests for the standard-markdown-link click classifier helpers
// (ADR-0021 2026-06-30 amendment, extended). `isExternalHref` and
// `parseLocalMarkdownHref` live in the webview bundle but import nothing from
// the DOM, so they run under the pure unit harness.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  isExternalHref,
  parseLocalMarkdownHref
} from "../../src/webview/preview/markdownLinkClick";

describe("isExternalHref", () => {
  it("flags every recognised URL scheme", () => {
    for (const href of [
      "http://example.com",
      "https://example.com/a.md",
      "mailto:user@example.com",
      "vscode://settings",
      "command:foo",
      "file:///c:/x.md",
      "MAILTO:User@Example.com"
    ]) {
      assert.equal(isExternalHref(href), true, `expected external: ${href}`);
    }
  });

  it("does not flag relative or workspace-absolute paths", () => {
    for (const href of [
      "./Other.md",
      "Other.md",
      "../Other.md",
      "subdir/Other.md",
      "/docs/Other.md",
      "Other.md#Section",
      "#Section",
      ""
    ]) {
      assert.equal(isExternalHref(href), false, `expected local: ${href}`);
    }
  });
});

describe("parseLocalMarkdownHref", () => {
  it("parses a bare relative `.md` path with no heading", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.md"), {
      target: "./Other.md",
      heading: null
    });
    assert.deepEqual(parseLocalMarkdownHref("Other.md"), {
      target: "Other.md",
      heading: null
    });
  });

  it("parses a subdir / parent / workspace-absolute path", () => {
    assert.deepEqual(parseLocalMarkdownHref("subdir/Other.md"), {
      target: "subdir/Other.md",
      heading: null
    });
    assert.deepEqual(parseLocalMarkdownHref("../Other.md"), {
      target: "../Other.md",
      heading: null
    });
    assert.deepEqual(parseLocalMarkdownHref("/docs/Other.md"), {
      target: "/docs/Other.md",
      heading: null
    });
  });

  it("parses a `.markdown` extension", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.markdown"), {
      target: "./Other.markdown",
      heading: null
    });
  });

  it("splits and URL-decodes a `#heading` fragment", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.md#Section"), {
      target: "./Other.md",
      heading: "Section"
    });
    assert.deepEqual(parseLocalMarkdownHref("./Other.md#Sub%20Section"), {
      target: "./Other.md",
      heading: "Sub Section"
    });
  });

  it("URL-decodes spaces in the path", () => {
    assert.deepEqual(parseLocalMarkdownHref("./My%20Note.md"), {
      target: "./My Note.md",
      heading: null
    });
  });

  it("treats an empty fragment as null heading", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.md#"), {
      target: "./Other.md",
      heading: null
    });
  });

  it("returns null for a same-document fragment-only link", () => {
    assert.equal(parseLocalMarkdownHref("#Section"), null);
  });

  it("returns null for an empty href", () => {
    assert.equal(parseLocalMarkdownHref(""), null);
  });

  it("returns null for an external scheme", () => {
    assert.equal(parseLocalMarkdownHref("https://example.com/a.md"), null);
    assert.equal(parseLocalMarkdownHref("mailto:user@example.com"), null);
    assert.equal(parseLocalMarkdownHref("vscode://settings"), null);
  });

  it("returns null for a non-markdown extension", () => {
    assert.equal(parseLocalMarkdownHref("./image.png"), null);
    assert.equal(parseLocalMarkdownHref("./script.ts"), null);
    assert.equal(parseLocalMarkdownHref("./doc.pdf"), null);
    assert.equal(parseLocalMarkdownHref("./Other"), null);
  });

  it("strips a trailing `?query` before extension matching", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.md?cache=1"), {
      target: "./Other.md",
      heading: null
    });
    assert.deepEqual(parseLocalMarkdownHref("./Other.md?cache=1#Section"), {
      target: "./Other.md",
      heading: "Section"
    });
  });

  it("accepts a case-insensitive extension", () => {
    assert.deepEqual(parseLocalMarkdownHref("./Other.MD"), {
      target: "./Other.MD",
      heading: null
    });
    assert.deepEqual(parseLocalMarkdownHref("./Other.Markdown"), {
      target: "./Other.Markdown",
      heading: null
    });
  });
});
