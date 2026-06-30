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

  it("resolves a bare basename to a .markdown note", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "Guide" }]),
      note("Guide.markdown", [])
    ]);
    assert.equal(index.backlinksFor("Guide.markdown").length, 1);
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

  it("does not self-backlink when the link case differs from the file name", () => {
    const index = buildLinkIndex([note("Notes.md", [{ target: "notes" }])]);
    assert.deepEqual(index.backlinksFor("Notes.md"), []);
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

describe("buildLinkIndex — resolveForward (T-4.1b navigation)", () => {
  // The index over a small vault; the notes carry no links because forward
  // resolution only needs the set of note paths, not their contents.
  const index = buildLinkIndex([
    note("A.md", []),
    note("B.md", []),
    note("docs/Guide.md", []),
    note("api/Guide.md", [])
  ]);

  it("resolves a bare basename to the matching note", () => {
    assert.deepEqual(index.resolveForward("A.md", "B"), ["B.md"]);
  });

  it("is case-insensitive on the target", () => {
    assert.deepEqual(index.resolveForward("A.md", "b"), ["B.md"]);
  });

  it("accepts a target written with the .md extension", () => {
    assert.deepEqual(index.resolveForward("A.md", "B.md"), ["B.md"]);
  });

  it("resolves a self-link to the source note (navigation keeps self)", () => {
    assert.deepEqual(index.resolveForward("A.md", "A"), ["A.md"]);
  });

  it("returns all matches for an ambiguous basename, in index order", () => {
    assert.deepEqual(index.resolveForward("A.md", "Guide"), [
      "docs/Guide.md",
      "api/Guide.md"
    ]);
  });

  it("resolves a path-qualified target relative to the source note first", () => {
    // From docs/Guide.md, `[[../api/Guide]]` should hit api/Guide.md, not the
    // sibling docs/Guide.md that shares the basename.
    assert.deepEqual(index.resolveForward("docs/Guide.md", "../api/Guide"), [
      "api/Guide.md"
    ]);
  });

  it("falls back to basename when a path-qualified target misses", () => {
    // `nope/B` has no relative match, so it falls back to the B.md basename.
    assert.deepEqual(index.resolveForward("A.md", "nope/B"), ["B.md"]);
  });

  it("returns an empty array for an unresolved target", () => {
    assert.deepEqual(index.resolveForward("A.md", "DoesNotExist"), []);
  });

  it("returns an empty array for an empty target", () => {
    assert.deepEqual(index.resolveForward("A.md", "   "), []);
  });
});

describe("buildLinkIndex — allEdges (M4.4 graph)", () => {
  it("returns one edge per resolved (from, to) pair", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      note("B.md", [{ target: "C" }]),
      note("C.md", [])
    ]);
    assert.deepEqual(
      [...index.allEdges()].sort(
        (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
      ),
      [
        { from: "A.md", to: "B.md", weight: 1 },
        { from: "B.md", to: "C.md", weight: 1 }
      ]
    );
  });

  it("collapses multi-links between the same pair into one edge with weight", () => {
    const index = buildLinkIndex([
      note("A.md", [
        { target: "B", line: 0 },
        { target: "B", line: 4 },
        { target: "B", line: 9 }
      ]),
      note("B.md", [])
    ]);
    const edges = index.allEdges();
    assert.equal(edges.length, 1);
    assert.equal(edges[0].from, "A.md");
    assert.equal(edges[0].to, "B.md");
    assert.equal(edges[0].weight, 3);
  });

  it("preserves direction (A→B and B→A are distinct edges)", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      note("B.md", [{ target: "A" }])
    ]);
    const edges = [...index.allEdges()].sort(
      (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
    );
    assert.equal(edges.length, 2);
    assert.deepEqual(edges, [
      { from: "A.md", to: "B.md", weight: 1 },
      { from: "B.md", to: "A.md", weight: 1 }
    ]);
  });

  it("excludes self-edges (a [[A]] inside A.md)", () => {
    const index = buildLinkIndex([note("A.md", [{ target: "A" }])]);
    assert.deepEqual(index.allEdges(), []);
  });

  it("returns no edges for a workspace with no links", () => {
    const index = buildLinkIndex([note("A.md", []), note("B.md", [])]);
    assert.deepEqual(index.allEdges(), []);
  });

  it("includes both edges from an ambiguous basename target", () => {
    const index = buildLinkIndex([
      note("A.md", [{ target: "Guide" }]),
      note("docs/Guide.md", []),
      note("archive/Guide.md", [])
    ]);
    const edges = [...index.allEdges()].sort(
      (a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
    );
    assert.equal(edges.length, 2);
    assert.deepEqual(edges.map((edge) => edge.to).sort(), [
      "archive/Guide.md",
      "docs/Guide.md"
    ]);
  });

  it("ignores unresolved targets (no phantom edges)", () => {
    const index = buildLinkIndex([note("A.md", [{ target: "Ghost" }])]);
    assert.deepEqual(index.allEdges(), []);
  });
});

// ---------------------------------------------------------------------------
// T-4.1a: Markdown-link resolution (kind = "markdown").
// ---------------------------------------------------------------------------

describe("buildLinkIndex — Markdown-link resolution (T-4.1a)", () => {
  it("resolves a relative ./note.md from notes/foo.md to notes/note.md", () => {
    const index = buildLinkIndex([
      {
        path: "notes/foo.md",
        links: [
          {
            target: "./note.md",
            heading: null,
            line: 0,
            snippet: "see [n](./note.md)",
            kind: "markdown"
          }
        ]
      },
      { path: "notes/note.md", links: [] }
    ]);
    const backlinks = index.backlinksFor("notes/note.md");
    assert.equal(backlinks.length, 1);
    assert.equal(backlinks[0].sourcePath, "notes/foo.md");
    assert.equal(backlinks[0].kind, "markdown");
  });

  it("resolves a `..` parent destination", () => {
    const index = buildLinkIndex([
      {
        path: "notes/sub/inner.md",
        links: [
          {
            target: "../note.md",
            heading: null,
            line: 0,
            snippet: "see [n](../note.md)",
            kind: "markdown"
          }
        ]
      },
      { path: "notes/note.md", links: [] }
    ]);
    assert.equal(index.backlinksFor("notes/note.md").length, 1);
  });

  it("matches the target path case-insensitively (filesystem-friendly)", () => {
    const index = buildLinkIndex([
      {
        path: "A.md",
        links: [
          {
            target: "./guide.md",
            heading: null,
            line: 0,
            snippet: "[g](./guide.md)",
            kind: "markdown"
          }
        ]
      },
      { path: "Guide.md", links: [] }
    ]);
    assert.equal(index.backlinksFor("Guide.md").length, 1);
  });

  it("does NOT fall back to basename when the explicit path misses", () => {
    // `[g](./Guide.md)` from `notes/foo.md` resolves to `notes/Guide.md`. If
    // only `archive/Guide.md` exists, the link is dropped — *not* fuzzy-matched
    // by basename like a wiki-link would be (ADR-0024 §"Decision").
    const index = buildLinkIndex([
      {
        path: "notes/foo.md",
        links: [
          {
            target: "./Guide.md",
            heading: null,
            line: 0,
            snippet: "[g](./Guide.md)",
            kind: "markdown"
          }
        ]
      },
      { path: "archive/Guide.md", links: [] }
    ]);
    assert.deepEqual(index.backlinksFor("archive/Guide.md"), []);
  });

  it("contributes a graph edge collapsed with wiki-link edges to the same pair", () => {
    // A has a wiki-link `[[B]]` *and* a Markdown link `[b](./B.md)` to B.
    // Both feed the same (A → B) edge; weight collapses across kinds.
    const index = buildLinkIndex([
      {
        path: "A.md",
        links: [
          {
            target: "B",
            heading: null,
            line: 0,
            snippet: "[[B]]"
            // no kind → wiki
          },
          {
            target: "./B.md",
            heading: null,
            line: 1,
            snippet: "[b](./B.md)",
            kind: "markdown"
          }
        ]
      },
      { path: "B.md", links: [] }
    ]);
    const edges = index.allEdges();
    assert.equal(edges.length, 1);
    assert.equal(edges[0].weight, 2);
  });

  it("excludes a Markdown self-link (no self-edge in the graph)", () => {
    const index = buildLinkIndex([
      {
        path: "notes/A.md",
        links: [
          {
            target: "./A.md",
            heading: null,
            line: 0,
            snippet: "[a](./A.md)",
            kind: "markdown"
          }
        ]
      }
    ]);
    assert.deepEqual(index.allEdges(), []);
  });

  it("preserves the wiki-link shape on the surfaced backlink (no kind field)", () => {
    // The pre-Sprint-6 deep-equal expectation: a wiki-link backlink is
    // `{ sourcePath, line, snippet, heading }` — `kind` must NOT appear.
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      note("B.md", [])
    ]);
    assert.deepEqual(index.backlinksFor("B.md"), [
      { sourcePath: "A.md", line: 0, snippet: "links to [[B]]", heading: null }
    ]);
  });
});

// ---------------------------------------------------------------------------
// T-4.1c: heading-line promotion (`targetLine` on the surfaced backlink).
// ---------------------------------------------------------------------------

describe("buildLinkIndex — heading-line promotion (T-4.1c)", () => {
  it("resolves a target heading to the 0-based line in the target note", () => {
    const targetText = "# Title\n\nintro\n\n## Setup\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "B", heading: "Setup" }]),
      { path: "B.md", text: targetText, links: [] }
    ]);
    const backlinks = index.backlinksFor("B.md");
    assert.equal(backlinks.length, 1);
    assert.equal(backlinks[0].heading, "Setup");
    assert.equal(backlinks[0].targetLine, 4); // "## Setup" is line 4 (0-based)
  });

  it("returns targetLine: null when the heading is not in the target", () => {
    const targetText = "# Title\n\n## Setup\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "B", heading: "MissingHeading" }]),
      { path: "B.md", text: targetText, links: [] }
    ]);
    const backlinks = index.backlinksFor("B.md");
    assert.equal(backlinks.length, 1);
    assert.equal(backlinks[0].targetLine, null);
  });

  it("omits targetLine entirely when the link has no heading", () => {
    // Pre-Sprint-6 wiki/no-heading backlinks must deep-equal against the
    // exact `{ sourcePath, line, snippet, heading }` shape — no targetLine.
    const targetText = "# Title\n\n## Setup\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "B" }]),
      { path: "B.md", text: targetText, links: [] }
    ]);
    assert.deepEqual(index.backlinksFor("B.md"), [
      { sourcePath: "A.md", line: 0, snippet: "links to [[B]]", heading: null }
    ]);
  });

  it("omits targetLine when the target note has no text supplied", () => {
    // Legacy fixtures that pre-date `ParsedNote.text` must continue to
    // produce file-level backlinks (no heading-line promotion). The link
    // still resolves to the file; only the heading promotion is skipped.
    const index = buildLinkIndex([
      note("A.md", [{ target: "B", heading: "Setup" }]),
      note("B.md", []) // no `text`
    ]);
    const backlinks = index.backlinksFor("B.md");
    assert.equal(backlinks.length, 1);
    assert.equal(backlinks[0].heading, "Setup");
    assert.equal(
      "targetLine" in backlinks[0],
      false,
      "targetLine must be absent when target text is not supplied"
    );
  });

  it("matches the heading case-insensitively", () => {
    const targetText = "# Title\n\n## Setup\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "B", heading: "SETUP" }]),
      { path: "B.md", text: targetText, links: [] }
    ]);
    assert.equal(index.backlinksFor("B.md")[0].targetLine, 2);
  });

  it("caches per (targetPath, heading) — many backlinks share one result", () => {
    // Multiple notes link to the same target heading; they must all surface
    // the same `targetLine`. (The cache itself is internal; this is the
    // user-visible contract.)
    const targetText = "# Title\n\n## API\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "T", heading: "API" }]),
      note("B.md", [{ target: "T", heading: "API" }]),
      note("C.md", [{ target: "T", heading: "API" }]),
      { path: "T.md", text: targetText, links: [] }
    ]);
    const backlinks = index.backlinksFor("T.md");
    assert.equal(backlinks.length, 3);
    for (const b of backlinks) {
      assert.equal(b.targetLine, 2);
    }
  });

  it("resolves heading promotion independently per heading on the same target", () => {
    const targetText = "# Title\n\n## Setup\n\nbody\n\n## Tear-down\n\ngone";
    const index = buildLinkIndex([
      note("A.md", [{ target: "T", heading: "Setup", line: 0 }]),
      note("A.md".replace("A", "B"), [
        { target: "T", heading: "Tear-down", line: 0 }
      ]),
      { path: "T.md", text: targetText, links: [] }
    ]);
    const backlinks = index.backlinksFor("T.md");
    const byHeading = Object.fromEntries(
      backlinks.map((b) => [b.heading, b.targetLine])
    );
    assert.equal(byHeading.Setup, 2);
    assert.equal(byHeading["Tear-down"], 6);
  });

  it("promotes a Markdown-link heading too (kind = markdown carries through)", () => {
    const targetText = "# Title\n\n## API\n\nbody";
    const index = buildLinkIndex([
      {
        path: "src/Caller.md",
        links: [
          {
            target: "./T.md",
            heading: "API",
            line: 0,
            snippet: "[t](./T.md#API)",
            kind: "markdown"
          }
        ]
      },
      { path: "src/T.md", text: targetText, links: [] }
    ]);
    const backlinks = index.backlinksFor("src/T.md");
    assert.equal(backlinks.length, 1);
    assert.equal(backlinks[0].kind, "markdown");
    assert.equal(backlinks[0].heading, "API");
    assert.equal(backlinks[0].targetLine, 2);
  });

  it("skips heading promotion inside fenced code in the target", () => {
    // `findHeadingLine` already skips fences (it shares `parseHeadings`);
    // this pins that the index inherits that behaviour for free.
    const targetText = "# Title\n\n```\n## Fake\n```\n\nbody";
    const index = buildLinkIndex([
      note("A.md", [{ target: "T", heading: "Fake" }]),
      { path: "T.md", text: targetText, links: [] }
    ]);
    assert.equal(index.backlinksFor("T.md")[0].targetLine, null);
  });
});
