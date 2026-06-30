// Unit tests for the M4.4 graph view's pure 2D force simulation
// (`src/webview/graph/forceSimulation.ts`, ADR-0023).
//
// The simulation has no DOM, no `vscode`, no `Math.random` — every property we
// care about (determinism, settling, fixed-node pinning, edge attraction) can
// be verified by stepping the pure functions and inspecting the mutated arrays.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_OPTIONS,
  seedPosition,
  step,
  type SimEdge,
  type SimNode
} from "../../../src/webview/graph/forceSimulation";

function node(path: string, x: number, y: number, fixed = false): SimNode {
  return { path, x, y, vx: 0, vy: 0, fixed };
}

function distance(a: SimNode, b: SimNode): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

describe("forceSimulation — step", () => {
  it("returns 0 kinetic energy and is a no-op for an empty node list", () => {
    const nodes: SimNode[] = [];
    const ke = step(nodes, []);
    assert.equal(ke, 0);
    assert.equal(nodes.length, 0);
  });

  it("pushes two co-located nodes apart so they never share a position", () => {
    const a = node("A.md", 0, 0);
    const b = node("B.md", 0, 0);
    step([a, b], []);
    assert.notEqual(a.x === b.x && a.y === b.y, true);
  });

  it("attracts edge endpoints — connected pair gets closer than disconnected pair", () => {
    // Two pairs at identical starting separation. Only one has an edge.
    const a1 = node("A.md", -200, 0);
    const a2 = node("B.md", 200, 0);
    const b1 = node("C.md", -200, 100);
    const b2 = node("D.md", 200, 100);
    const edges: SimEdge[] = [{ from: "A.md", to: "B.md", weight: 1 }];
    for (let i = 0; i < 80; i++) {
      step([a1, a2, b1, b2], edges);
    }
    assert.ok(
      distance(a1, a2) < distance(b1, b2),
      `connected pair should sit closer: connected=${distance(a1, a2).toFixed(1)} unconnected=${distance(b1, b2).toFixed(1)}`
    );
  });

  it("settles a small connected graph below the kinetic-energy epsilon", () => {
    const nodes = [
      node("A.md", -100, 0),
      node("B.md", 100, 0),
      node("C.md", 0, -100),
      node("D.md", 0, 100)
    ];
    const edges: SimEdge[] = [
      { from: "A.md", to: "B.md", weight: 1 },
      { from: "B.md", to: "C.md", weight: 1 },
      { from: "C.md", to: "D.md", weight: 1 },
      { from: "D.md", to: "A.md", weight: 1 }
    ];
    let ke = Infinity;
    for (let i = 0; i < 400 && ke > 0.05; i++) {
      ke = step(nodes, edges);
    }
    assert.ok(
      ke <= 0.05,
      `expected the simulation to settle below 0.05 kinetic energy, got ${ke}`
    );
  });

  it("never moves a node whose `fixed` flag is true", () => {
    const fixed = node("A.md", 50, 50, true);
    const free = node("B.md", -50, -50);
    const edges: SimEdge[] = [{ from: "A.md", to: "B.md", weight: 5 }];
    for (let i = 0; i < 50; i++) {
      step([fixed, free], edges);
    }
    assert.equal(fixed.x, 50, "fixed.x must stay pinned");
    assert.equal(fixed.y, 50, "fixed.y must stay pinned");
    assert.equal(fixed.vx, 0, "fixed velocity must be cleared each step");
    assert.equal(fixed.vy, 0);
  });

  it("caps per-step displacement so a node cannot teleport across the canvas", () => {
    // A huge spring on a fresh node should not move it past `maxDisplacement`
    // in a single step, no matter how strong the force is.
    const a = node("A.md", -10000, 0);
    const b = node("B.md", 10000, 0, true);
    const x0 = a.x;
    step([a, b], [{ from: "A.md", to: "B.md", weight: 1 }]);
    const moved = Math.abs(a.x - x0);
    assert.ok(
      moved <= DEFAULT_OPTIONS.maxDisplacement + 0.0001,
      `expected step to cap displacement at ${DEFAULT_OPTIONS.maxDisplacement}, moved ${moved}`
    );
  });

  it("drops edges whose endpoints are not in the node array", () => {
    const a = node("A.md", -50, 0);
    const b = node("B.md", 50, 0);
    const before = distance(a, b);
    // The unresolved edge should be a no-op; only repulsion + gravity act.
    step([a, b], [{ from: "A.md", to: "GHOST.md", weight: 100 }]);
    // Repulsion has pushed them slightly further apart, never pulled them in.
    assert.ok(
      distance(a, b) >= before - 0.001,
      "an unresolved edge must not pull nodes together"
    );
  });

  it("kinetic energy is monotonically non-increasing after the warm-up phase", () => {
    const nodes = [
      node("A.md", -100, 0),
      node("B.md", 100, 0),
      node("C.md", 0, -50)
    ];
    const edges: SimEdge[] = [
      { from: "A.md", to: "B.md", weight: 1 },
      { from: "B.md", to: "C.md", weight: 1 }
    ];
    // Warm up so we are past the initial transient.
    for (let i = 0; i < 80; i++) step(nodes, edges);
    let prev = step(nodes, edges);
    for (let i = 0; i < 40; i++) {
      const ke = step(nodes, edges);
      assert.ok(
        ke <= prev + 0.05,
        `kinetic energy should not grow after warm-up: prev=${prev.toFixed(3)} ke=${ke.toFixed(3)}`
      );
      prev = ke;
    }
  });
});

describe("forceSimulation — seedPosition", () => {
  it("is deterministic — same path returns the same coordinates", () => {
    const a = seedPosition("notes/foo.md", 100);
    const b = seedPosition("notes/foo.md", 100);
    assert.equal(a.x, b.x);
    assert.equal(a.y, b.y);
  });

  it("places the point exactly on the requested radius", () => {
    const r = 137.5;
    const p = seedPosition("anything.md", r);
    const actualR = Math.sqrt(p.x * p.x + p.y * p.y);
    assert.ok(
      Math.abs(actualR - r) < 1e-9,
      `expected radius ${r}, got ${actualR}`
    );
  });

  it("spreads distinct paths to distinct positions (no obvious collisions)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const p = seedPosition(`note-${i}.md`, 200);
      const key = `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      assert.ok(!seen.has(key), `seed collision on note-${i}.md`);
      seen.add(key);
    }
  });

  it("handles an empty path string without throwing or NaN", () => {
    const p = seedPosition("", 50);
    assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  });
});
