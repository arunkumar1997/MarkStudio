// Unit tests for the pure reverse link-index + basename resolver (T-4.1, M4.1).
//
// `buildLinkIndex` imports nothing from `vscode` or the file system, so it runs
// directly under the Node test runner with plain `ParsedNote` data. These tests
// pin the Producer's resolution rules (plan §4): case-insensitive basename
// matching, path-qualified targets resolving relative first, ambiguous
// basenames linking all matches, and no self-backlinks.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildLinkIndex,
  type NoteLink,
  type ParsedNote
} from "../../src/links/linkIndex";

// Small helper: a note with one link to `target` on `line`.
function note(
  path: string,
  links: ReadonlyArray<Partial<NoteLink> & { target: string }>
): ParsedNote {
  return {
    path,
    links: links.map((link) => ({
      target: link.target,
      heading: link.heading ?? null,
      line: link.line ?? 0,
      snippet: link.snippet ?? `links to [[${link.target}]]`
    }))
  };
}

describe("buildLinkIndex — basic resolution", () => {
  it("resolves [[B]] from A as a backlink to B.md", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      note("B.md", [])
    ]);
    assert.deepEqual(index.backlinksFor("B.md"), [
      {
        sourcePath: "A.md",
        line: 0,
        snippet: "links to [[B]]",
        heading: null
      }
    ]);
  });

  it("returns an empty list for a note nobody links to", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      note("B.md", [])
    ]);
    assert.deepEqual(index.backlinksFor("A.md"), []);
  });

  it("matches the basename case-insensitively", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "guide" }]),
      note("Guide.md", [])
    ]);
    assert.equal(index.backlinksFor("Guide.md").length, 1);
    // The query side is case-insensitive too.
    assert.equal(index.backlinksFor("guide.md").length, 1);
  });

  it("matches a target written with a .md extension", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B.md" }]),
      note("B.md", [])
    ]);
    assert.equal(index.backlinksFor("B.md").length, 1);
  });

  it("carries the heading anchor through to the backlink", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B", heading: "Setup" }]),
      note("B.md", [])
    ]);
    assert.equal(index.backlinksFor("B.md")[0].heading, "Setup");
  });

  it("ignores a target that matches no note", () => {
    const index = buildLinkIndex([note("A.md", [{ target: "Ghost" }])]);
    assert.deepEqual(index.backlinksFor("Ghost.md"), []);
  });
});

describe("buildLinkIndex — basename matches a note in any folder", () => {
  it("links a bare basename to a note nested in a folder", () => {
    const index = buildLinkIndex([
      note("notes/A.md", [{ target: "Guide" }]),
      note("docs/Guide.md", [])
    ]);
    assert.equal(index.backlinksFor("docs/Guide.md").length, 1);
  });

  it("links all notes sharing an ambiguous basename", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "Guide" }]),
      note("docs/Guide.md", []),
      note("archive/Guide.md", [])
    ]);
    assert.equal(index.backlinksFor("docs/Guide.md").length, 1);
    assert.equal(index.backlinksFor("archive/Guide.md").length, 1);
  });
});

describe("buildLinkIndex — path-qualified resolution", () => {
  it("resolves a path-qualified target relative to the source note first", () => {
    const index = buildLinkIndex([
      note("a/Note.md", [{ target: "../b/Guide" }]),
      note("a/Guide.md", []),
      note("b/Guide.md", [])
    ]);
    // The relative path points at b/Guide.md, not the basename twin a/Guide.md.
    assert.equal(index.backlinksFor("b/Guide.md").length, 1);
    assert.equal(index.backlinksFor("a/Guide.md").length, 0);
  });

  it("falls back to basename when the relative path matches no note", () => {
    const index = buildLinkIndex([
      note("a/Note.md", [{ target: "missing/Guide" }]),
      note("docs/Guide.md", [])
    ]);
    assert.equal(index.backlinksFor("docs/Guide.md").length, 1);
  });

  it("resolves a same-folder path-qualified target", () => {
    const index = buildLinkIndex([
      note("docs/Note.md", [{ target: "docs/Guide" }]),
      note("docs/Guide.md", [])
    ]);
    assert.equal(index.backlinksFor("docs/Guide.md").length, 1);
  });
});

describe("buildLinkIndex — self-links and duplicates", () => {
  it("does not list a note as its own backlink", () => {
    const index = buildLinkIndex([note("A.md", [{ target: "A" }])]);
    assert.deepEqual(index.backlinksFor("A.md"), []);
  });

  it("collapses two links to the same target on one line", () => {
    const index = buildLinkIndex([
      note("A.md", [
        { target: "B", line: 3 },
        { target: "B", heading: "x", line: 3 }
      ]),
      note("B.md", [])
    ]);
    assert.equal(index.backlinksFor("B.md").length, 1);
  });

  it("keeps separate links on different lines", () => {
    const index = buildLinkIndex([
      note("A.md", [
        { target: "B", line: 2 },
        { target: "B", line: 9 }
      ]),
      note("B.md", [])
    ]);
    assert.equal(index.backlinksFor("B.md").length, 2);
  });
});

describe("buildLinkIndex — ordering", () => {
  it("sorts backlinks by source path then line", () => {
    const index = buildLinkIndex([
      note("zeta.md", [{ target: "B", line: 1 }]),
      note("alpha.md", [
        { target: "B", line: 7 },
        { target: "B", line: 2 }
      ]),
      note("B.md", [])
    ]);
    assert.deepEqual(
      index.backlinksFor("B.md").map((b) => [b.sourcePath, b.line]),
      [
        ["alpha.md", 2],
        ["alpha.md", 7],
        ["zeta.md", 1]
      ]
    );
  });
});
