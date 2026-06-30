// Unit tests for the pure graph model (M4.4 graph view).
//
// `buildGraph` imports nothing from `vscode` or the DOM, so it runs directly
// under the Node test runner with plain string/object data. These tests pin
// the Producer-decided properties (plan §4 / design/graph-view.md): isolated
// notes are nodes, self-edges are dropped, multi-links collapse with weight,
// direction is preserved, the current note is marked, edges referencing
// unknown paths are defensively dropped, and output ordering is deterministic.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildGraph } from "../../src/graph/graphModel";

describe("buildGraph — node basics", () => {
  it("returns an empty graph for an empty workspace", () => {
    assert.deepEqual(buildGraph([], [], null), { nodes: [], edges: [] });
  });

  it("returns one isolated node for a note with no links", () => {
    const graph = buildGraph(["A.md"], [], null);
    assert.deepEqual(graph.nodes, [
      { path: "A.md", label: "A", isCurrent: false }
    ]);
    assert.deepEqual(graph.edges, []);
  });

  it("keeps isolated nodes alongside connected ones", () => {
    const graph = buildGraph(
      ["A.md", "B.md", "Orphan.md"],
      [{ from: "A.md", to: "B.md", weight: 1 }],
      null
    );
    assert.deepEqual(
      graph.nodes.map((node) => node.path),
      ["A.md", "B.md", "Orphan.md"]
    );
    assert.deepEqual(graph.edges, [{ from: "A.md", to: "B.md", weight: 1 }]);
  });

  it("sorts nodes by path for deterministic output", () => {
    const graph = buildGraph(["zeta.md", "alpha.md", "Mid.md"], [], null);
    assert.deepEqual(
      graph.nodes.map((node) => node.path),
      ["Mid.md", "alpha.md", "zeta.md"]
    );
  });

  it("derives the label from the basename, stripping the .md extension", () => {
    const graph = buildGraph(
      ["docs/Guide.md", "notes/A.markdown", "Root.md"],
      [],
      null
    );
    assert.deepEqual(
      graph.nodes.map((node) => ({ path: node.path, label: node.label })),
      [
        { path: "Root.md", label: "Root" },
        { path: "docs/Guide.md", label: "Guide" },
        { path: "notes/A.markdown", label: "A" }
      ]
    );
  });
});

describe("buildGraph — currentPath marking", () => {
  it("marks the matching node as current", () => {
    const graph = buildGraph(["A.md", "B.md"], [], "A.md");
    assert.equal(
      graph.nodes.find((node) => node.path === "A.md")?.isCurrent,
      true
    );
    assert.equal(
      graph.nodes.find((node) => node.path === "B.md")?.isCurrent,
      false
    );
  });

  it("matches currentPath case-insensitively", () => {
    const graph = buildGraph(["docs/Guide.md"], [], "DOCS/GUIDE.MD");
    assert.equal(graph.nodes[0].isCurrent, true);
  });

  it("marks no node when currentPath is null", () => {
    const graph = buildGraph(["A.md"], [], null);
    assert.equal(graph.nodes[0].isCurrent, false);
  });

  it("marks no node when currentPath does not match any known note", () => {
    const graph = buildGraph(["A.md"], [], "ghost.md");
    assert.equal(graph.nodes[0].isCurrent, false);
  });
});

describe("buildGraph — edge basics", () => {
  it("emits the edge between two known notes", () => {
    const graph = buildGraph(
      ["A.md", "B.md"],
      [{ from: "A.md", to: "B.md", weight: 1 }],
      null
    );
    assert.deepEqual(graph.edges, [{ from: "A.md", to: "B.md", weight: 1 }]);
  });

  it("preserves direction — A→B and B→A are two distinct edges", () => {
    const graph = buildGraph(
      ["A.md", "B.md"],
      [
        { from: "A.md", to: "B.md", weight: 1 },
        { from: "B.md", to: "A.md", weight: 1 }
      ],
      null
    );
    assert.equal(graph.edges.length, 2);
    assert.deepEqual(graph.edges, [
      { from: "A.md", to: "B.md", weight: 1 },
      { from: "B.md", to: "A.md", weight: 1 }
    ]);
  });

  it("keeps the supplied weight for multi-linked pairs", () => {
    const graph = buildGraph(
      ["A.md", "B.md"],
      [{ from: "A.md", to: "B.md", weight: 4 }],
      null
    );
    assert.equal(graph.edges[0].weight, 4);
  });

  it("dedupes a repeated (from, to) edge to a single entry", () => {
    const graph = buildGraph(
      ["A.md", "B.md"],
      [
        { from: "A.md", to: "B.md", weight: 1 },
        { from: "A.md", to: "B.md", weight: 1 }
      ],
      null
    );
    assert.equal(graph.edges.length, 1);
  });

  it("drops a self-edge defensively even if upstream slips one through", () => {
    const graph = buildGraph(
      ["A.md"],
      [{ from: "A.md", to: "A.md", weight: 1 }],
      null
    );
    assert.deepEqual(graph.edges, []);
  });

  it("drops an edge whose endpoints are not in paths", () => {
    const graph = buildGraph(
      ["A.md"],
      [
        { from: "A.md", to: "Ghost.md", weight: 1 },
        { from: "Phantom.md", to: "A.md", weight: 1 }
      ],
      null
    );
    assert.deepEqual(graph.edges, []);
  });

  it("treats a non-positive weight as 1", () => {
    const graph = buildGraph(
      ["A.md", "B.md"],
      [
        { from: "A.md", to: "B.md", weight: 0 },
        { from: "B.md", to: "A.md", weight: -3 }
      ],
      null
    );
    const aToB = graph.edges.find((edge) => edge.from === "A.md");
    const bToA = graph.edges.find((edge) => edge.from === "B.md");
    assert.equal(aToB?.weight, 1);
    assert.equal(bToA?.weight, 1);
  });

  it("sorts edges deterministically by (from, to)", () => {
    const graph = buildGraph(
      ["A.md", "B.md", "C.md"],
      [
        { from: "C.md", to: "A.md", weight: 1 },
        { from: "A.md", to: "C.md", weight: 1 },
        { from: "B.md", to: "C.md", weight: 1 }
      ],
      null
    );
    assert.deepEqual(
      graph.edges.map((edge) => `${edge.from}->${edge.to}`),
      ["A.md->C.md", "B.md->C.md", "C.md->A.md"]
    );
  });
});

describe("buildGraph — determinism", () => {
  it("returns equal output for equal input regardless of input order", () => {
    const a = buildGraph(
      ["B.md", "A.md", "C.md"],
      [
        { from: "B.md", to: "C.md", weight: 1 },
        { from: "A.md", to: "B.md", weight: 1 }
      ],
      "A.md"
    );
    const b = buildGraph(
      ["A.md", "C.md", "B.md"],
      [
        { from: "A.md", to: "B.md", weight: 1 },
        { from: "B.md", to: "C.md", weight: 1 }
      ],
      "A.md"
    );
    assert.deepEqual(a, b);
  });
});
