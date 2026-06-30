// Integration tests for the Backlinks tree pipeline (Sprint 6, Phase D).
//
// Drives a fixture vault with mixed wiki + Markdown links and heading anchors
// through the real `buildLinkIndex` → real `BacklinksTreeProvider` rendering
// path, exercising the per-kind icon (T-4.1a) and the description /
// tooltip heading suffix (T-4.1c) Producer-pinned in ADR-0024. The tests
// stand up a small fake `LinkIndexService` that just adapts the pure index's
// `Backlink` records to `ResolvedBacklink` so the tree provider can render
// them — no file I/O, no `FileSystemWatcher`, no exthost surface (Producer
// rule: "zero new exthost").

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type * as vscode from "vscode";

import {
  TreeItem,
  TreeItemCollapsibleState,
  ThemeIcon,
  MarkdownString,
  EventEmitter,
  Uri as MockUri
} from "../_mocks/vscode";
import {
  buildLinkIndex,
  type NoteLink,
  type ParsedNote
} from "../../src/links/linkIndex";
import {
  BacklinksTreeProvider,
  BACKLINKS_COMMAND_IDS
} from "../../src/links/BacklinksTreeProvider";
import type {
  LinkIndexService,
  ResolvedBacklink
} from "../../src/links/LinkIndexService";

// The test bundler aliases `vscode` → `test/_mocks/vscode.ts`, so at runtime
// `MockUri.file(...)` produces a value that satisfies the surface the units
// under test touch. The compiler does *not* see that alias (it resolves to
// the real `@types/vscode`), so we cast at the boundary the same way the
// pre-existing `MarkStudioDocument` tests do for their fake `TextDocument`.
function uri(path: string): vscode.Uri {
  return MockUri.file(path) as unknown as vscode.Uri;
}

// ─── Fixture vault helpers ──────────────────────────────────────────────────

// A `ParsedNote` with text threaded through so the heading-line cache in
// `buildLinkIndex` can resolve `#heading` anchors against this note as a
// target. Mirrors how `LinkIndexService.indexFile` stores notes.
function note(
  path: string,
  text: string,
  links: ReadonlyArray<Partial<NoteLink> & { target: string }>
): ParsedNote {
  return {
    path,
    text,
    links: links.map((link) => ({
      target: link.target,
      heading: link.heading ?? null,
      line: link.line ?? 0,
      snippet: link.snippet ?? `links to ${link.target}`,
      ...(link.kind === "markdown" ? { kind: "markdown" as const } : {})
    }))
  };
}

// Stand-in for the live `LinkIndexService`. Implements only the surface the
// `BacklinksTreeProvider` actually touches: `backlinksFor(uri)`. The real
// service does much more (workspace scan, watcher, debounced rebuild), but
// the pipeline under test starts at the resolved-backlinks boundary.
function makeFakeService(notes: ReadonlyArray<ParsedNote>): LinkIndexService {
  const index = buildLinkIndex(notes);
  const uriByPath = new Map<string, vscode.Uri>();
  for (const n of notes) {
    uriByPath.set(n.path, uri(`/vault/${n.path}`));
  }
  return {
    backlinksFor(target: vscode.Uri): ResolvedBacklink[] {
      // Mirror `LinkIndexService.backlinksFor`'s "build by hand so absent
      // optionals stay absent" discipline so the rendering paths see the
      // same shape the real service produces.
      const path = target.path.replace(/^\/vault\//, "");
      const out: ResolvedBacklink[] = [];
      for (const b of index.backlinksFor(path)) {
        const sourceUri = uriByPath.get(b.sourcePath);
        if (!sourceUri) continue;
        const record: {
          sourceUri: vscode.Uri;
          line: number;
          snippet: string;
          heading: string | null;
          kind?: "wiki" | "markdown";
          targetLine?: number | null;
        } = {
          sourceUri,
          line: b.line,
          snippet: b.snippet,
          heading: b.heading
        };
        if (b.kind === "markdown") record.kind = "markdown";
        if (b.targetLine !== undefined) record.targetLine = b.targetLine;
        out.push(record as ResolvedBacklink);
      }
      return out;
    }
  } as unknown as LinkIndexService;
}

// Find the rendered tree item for the backlink whose source note has the given
// basename. The pure index's `backlinksFor` emits entries in a deterministic
// but kind-dependent order; tests that don't care about *that* ordering pin
// the per-source-note rendering by looking up by basename.
function renderFrom(
  provider: BacklinksTreeProvider,
  sourceBasename: string
): { backlink: ResolvedBacklink; item: TreeItem } {
  const children = provider.getChildren() as ResolvedBacklink[];
  const backlink = children.find((b) =>
    b.sourceUri.path.endsWith(`/${sourceBasename}`)
  );
  assert.ok(backlink, `expected a backlink from ${sourceBasename}`);
  return { backlink, item: provider.getTreeItem(backlink) as TreeItem };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("BacklinksTreeProvider — mixed wiki + Markdown vault (T-4.1a, T-4.1c)", () => {
  // A vault with:
  //   - target.md  (the note we view backlinks for; has two headings)
  //   - alpha.md   wiki link to [[target#Section One]] on line 0
  //   - beta.md    Markdown link [...](./target.md#Section%20Two) on line 1
  //   - gamma.md   wiki link to [[target]] (no heading) on line 2
  //   - delta.md   Markdown link [...](./target.md) (no heading) on line 3
  function vault(): ReadonlyArray<ParsedNote> {
    return [
      note(
        "target.md",
        "# Target\n\n## Section One\n\nbody A\n\n## Section Two\n\nbody B\n",
        []
      ),
      note("alpha.md", "alpha body", [
        { target: "target", heading: "Section One", line: 0 }
      ]),
      note("beta.md", "beta body", [
        {
          target: "target.md",
          heading: "Section Two",
          line: 1,
          kind: "markdown"
        }
      ]),
      note("gamma.md", "gamma body", [{ target: "target", line: 2 }]),
      note("delta.md", "delta body", [
        { target: "target.md", line: 3, kind: "markdown" }
      ])
    ];
  }

  it("returns the backlinks as a flat list in deterministic index order", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    const children = provider.getChildren() as ResolvedBacklink[];
    assert.equal(children.length, 4);
    // The pure index emits one `Backlink` per (target, source-note) pair in
    // a deterministic order; we don't pin that order here — the panel's
    // contract is that every backlink shows up exactly once. The per-kind
    // sub-ordering is asserted indirectly through the icon / description
    // tests below, which look the rendering up by source basename.
    const paths = children.map((b) => b.sourceUri.path).sort();
    assert.deepEqual(paths, [
      "/vault/alpha.md",
      "/vault/beta.md",
      "/vault/delta.md",
      "/vault/gamma.md"
    ]);
    // A leaf node returns no children (flat list — plan §4).
    assert.deepEqual(provider.getChildren(children[0]), []);
  });

  it("uses $(symbol-reference) for wiki and $(link) for Markdown backlinks", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    const alpha = renderFrom(provider, "alpha.md"); // wiki + heading
    const beta = renderFrom(provider, "beta.md"); // markdown + heading
    const gamma = renderFrom(provider, "gamma.md"); // wiki, no heading
    const delta = renderFrom(provider, "delta.md"); // markdown, no heading

    assert.ok(alpha.item.iconPath instanceof ThemeIcon);
    assert.equal((alpha.item.iconPath as ThemeIcon).id, "symbol-reference");
    assert.ok(beta.item.iconPath instanceof ThemeIcon);
    assert.equal((beta.item.iconPath as ThemeIcon).id, "link");
    assert.equal((gamma.item.iconPath as ThemeIcon).id, "symbol-reference");
    assert.equal((delta.item.iconPath as ThemeIcon).id, "link");
  });

  it("adds ' → <heading>' to the description only when the heading resolved", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    // alpha.md → target#Section One (heading resolves)
    const alpha = renderFrom(provider, "alpha.md");
    assert.equal(
      alpha.item.description,
      "line 1 → Section One · links to target"
    );

    // beta.md → target.md#Section Two (heading resolves)
    const beta = renderFrom(provider, "beta.md");
    assert.equal(
      beta.item.description,
      "line 2 → Section Two · links to target.md"
    );

    // gamma.md → target (no heading anchor → no suffix)
    const gamma = renderFrom(provider, "gamma.md");
    assert.equal(gamma.item.description, "line 3 · links to target");

    // delta.md → target.md (no heading anchor → no suffix)
    const delta = renderFrom(provider, "delta.md");
    assert.equal(delta.item.description, "line 4 · links to target.md");
  });

  it("places the target line in the tooltip only when the heading resolved", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    const alpha = renderFrom(provider, "alpha.md");
    assert.ok(alpha.item.tooltip instanceof MarkdownString);
    // `Section One` is on 0-based line 2 of target.md; tooltip is 1-based.
    assert.match(
      (alpha.item.tooltip as MarkdownString).value,
      /→ Section One \(line 3\)/
    );

    const beta = renderFrom(provider, "beta.md");
    assert.ok(beta.item.tooltip instanceof MarkdownString);
    // `Section Two` is on 0-based line 6 of target.md; tooltip is 1-based.
    assert.match(
      (beta.item.tooltip as MarkdownString).value,
      /→ Section Two \(line 7\)/
    );

    // gamma has no heading anchor → no arrow in tooltip.
    const gamma = renderFrom(provider, "gamma.md");
    assert.doesNotMatch((gamma.item.tooltip as MarkdownString).value, /→/);
  });

  it("falls back to no suffix when the heading anchor misses", () => {
    // Same as alpha but pointing at a heading that does not exist in target.md.
    const notes: ParsedNote[] = [
      note("target.md", "# Target\n\n## Real Heading\n\nbody\n", []),
      note("alpha.md", "alpha body", [
        { target: "target", heading: "Phantom Heading", line: 0 }
      ])
    ];
    const provider = new BacklinksTreeProvider(makeFakeService(notes));
    provider.setActiveDocument(uri("/vault/target.md"));

    const item = provider.getTreeItem(
      (provider.getChildren() as ResolvedBacklink[])[0]
    ) as TreeItem;
    // Heading is present on the link but the lookup missed → no suffix
    // (matches the M4.2 unresolved-heading policy).
    assert.equal(item.description, "line 1 · links to target");
    assert.doesNotMatch((item.tooltip as MarkdownString).value, /→/);
  });

  it("emits the canonical 'open source note' command with line argument", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    const alpha = renderFrom(provider, "alpha.md");
    assert.ok(alpha.item.command);
    assert.equal(alpha.item.command?.command, BACKLINKS_COMMAND_IDS.open);
    assert.deepEqual(alpha.item.command?.arguments, [
      alpha.backlink.sourceUri,
      0
    ]);
  });

  it("preserves the pre-Sprint-6 shape for wiki backlinks without a heading", () => {
    // A pure wiki-only vault should produce backlinks with no `kind` and no
    // `targetLine` field — confirming the byte-for-byte backwards-compat
    // discipline that ADR-0024 mandates.
    const notes: ParsedNote[] = [
      note("target.md", "# Target\n", []),
      note("alpha.md", "alpha body", [{ target: "target", line: 0 }])
    ];
    const service = makeFakeService(notes);
    const backlinks = service.backlinksFor(uri("/vault/target.md"));
    assert.equal(backlinks.length, 1);
    assert.equal("kind" in backlinks[0]!, false);
    assert.equal("targetLine" in backlinks[0]!, false);
  });

  it("refresh() rebuilds tree items + fires a change event", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    let fired = 0;
    const emitter = new EventEmitter<void>();
    emitter.event(() => {
      fired += 1;
    });
    provider.onDidChangeTreeData(() => {
      fired += 1;
    });
    provider.refresh();
    assert.ok(fired >= 1, "refresh() must fire onDidChangeTreeData");
    assert.equal(provider.backlinkCount, 4);
  });

  it("setActiveDocument(null) clears the tree", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));
    assert.equal(provider.backlinkCount, 4);
    provider.setActiveDocument(null);
    assert.equal(provider.backlinkCount, 0);
    assert.deepEqual(provider.getChildren(), []);
  });

  it("renders a TreeItem with collapsibleState=None (leaf) and a resourceUri", () => {
    const provider = new BacklinksTreeProvider(makeFakeService(vault()));
    provider.setActiveDocument(uri("/vault/target.md"));

    const alpha = renderFrom(provider, "alpha.md");
    assert.equal(alpha.item.collapsibleState, TreeItemCollapsibleState.None);
    assert.equal(alpha.item.label, "alpha.md");
    assert.equal(alpha.item.resourceUri?.path, "/vault/alpha.md");
  });
});
