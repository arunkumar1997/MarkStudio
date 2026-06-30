// Hand-rolled 2D force-directed layout for the M4.4 Graph View (ADR-0023:
// zero new runtime dependencies). Loosely Fruchterman–Reingold:
//
//   • Every pair of nodes repels with `k² / d` (Coulomb-like).
//   • Every edge attracts its endpoints with `d² / k` (Hookean spring).
//   • Each node is dragged toward the centre with a weak gravity well.
//   • Velocities are integrated each step with an exponential decay so the
//     simulation comes to rest instead of oscillating.
//
// Pure: no DOM, no `vscode`, no `Math.random`. Determinism comes from the
// caller seeding initial positions (the webview hashes the sorted node paths
// — see `docs/design/graph-view.md` §7). All inputs are read at `step()` time
// so the host can swap node/edge arrays between steps to re-warm on
// merge-by-path updates.

export interface SimNode {
  // Identity from the host payload — used to merge across `graphData` updates.
  readonly path: string;

  // Position. Mutated in place by `step()` so the render loop can read it
  // without allocating per-frame.
  x: number;
  y: number;

  // Velocity. Mutated in place.
  vx: number;
  vy: number;

  // When true the node is pinned (drag): forces still accumulate around it
  // but `step()` will not move it. The pointer code clears this on mouseup.
  fixed: boolean;
}

export interface SimEdge {
  readonly from: string;
  readonly to: string;
  // Multi-link weight (≥ 1). Used to scale spring stiffness so heavily-linked
  // pairs sit closer.
  readonly weight: number;
}

export interface SimulationOptions {
  // Target spring length in pixels. Larger → graph spreads out. The library
  // default (50) is tuned for ~200 nodes inside a ~900×600 panel.
  readonly springLength: number;

  // Repulsion strength. Higher → nodes push apart more aggressively. Squared
  // distance softens the singularity when nodes overlap.
  readonly repulsion: number;

  // Centre-gravity pull strength. Keeps disconnected components from drifting
  // off-screen.
  readonly gravity: number;

  // Per-step velocity decay (0 < d ≤ 1). 0.85 settles in ~60–120 steps for
  // typical workspaces.
  readonly damping: number;

  // Hard cap on per-step displacement so a freshly-spawned node cannot fly
  // across the canvas in one frame.
  readonly maxDisplacement: number;
}

export const DEFAULT_OPTIONS: SimulationOptions = {
  springLength: 50,
  repulsion: 1200,
  gravity: 0.02,
  damping: 0.85,
  maxDisplacement: 30
};

// One step. Mutates `nodes` in place. Returns the system's kinetic energy so
// the render loop can stop the simulation once it falls below an ε threshold
// (the eye cannot see motion below ~0.5 px/frame).
export function step(
  nodes: SimNode[],
  edges: ReadonlyArray<SimEdge>,
  options: SimulationOptions = DEFAULT_OPTIONS
): number {
  if (nodes.length === 0) {
    return 0;
  }

  // Force accumulator. Reset each step.
  const fx = new Float64Array(nodes.length);
  const fy = new Float64Array(nodes.length);

  // Pairwise repulsion. O(N²) — acceptable up to ~1k nodes per the perf
  // budget in `docs/design/graph-view.md` §10; beyond that we would need a
  // Barnes–Hut tree, deferred per ADR-0023.
  const k = options.springLength;
  const repulsion = options.repulsion;
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dsq = dx * dx + dy * dy;
      if (dsq < 0.01) {
        // Co-located: nudge apart deterministically by index so we never
        // divide by zero.
        dx = (i - j) * 0.1 || 0.1;
        dy = (j - i) * 0.1 || 0.1;
        dsq = dx * dx + dy * dy;
      }
      const dist = Math.sqrt(dsq);
      // Coulomb-like: F = repulsion · k² / d²; project onto unit vector → / d.
      const force = (repulsion * k * k) / (dsq * dist);
      const ux = dx * force;
      const uy = dy * force;
      fx[i] += ux;
      fy[i] += uy;
      fx[j] -= ux;
      fy[j] -= uy;
    }
  }

  // Edge attraction. Spring force F = (weight · d²) / k along the edge.
  const indexByPath = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    indexByPath.set(nodes[i].path, i);
  }
  for (const e of edges) {
    const ai = indexByPath.get(e.from);
    const bi = indexByPath.get(e.to);
    if (ai === undefined || bi === undefined) {
      continue;
    }
    const a = nodes[ai];
    const b = nodes[bi];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const force = (e.weight * dist) / k;
    const ux = (dx / dist) * force;
    const uy = (dy / dist) * force;
    fx[ai] += ux;
    fy[ai] += uy;
    fx[bi] -= ux;
    fy[bi] -= uy;
  }

  // Gravity toward centre (0, 0). Keeps disconnected components on-screen.
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    fx[i] -= n.x * options.gravity;
    fy[i] -= n.y * options.gravity;
  }

  // Integrate velocities + positions, with damping and a per-step cap.
  let kineticEnergy = 0;
  const cap = options.maxDisplacement;
  const damping = options.damping;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.fixed) {
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx = (n.vx + fx[i]) * damping;
    n.vy = (n.vy + fy[i]) * damping;
    if (n.vx > cap) n.vx = cap;
    else if (n.vx < -cap) n.vx = -cap;
    if (n.vy > cap) n.vy = cap;
    else if (n.vy < -cap) n.vy = -cap;
    n.x += n.vx;
    n.y += n.vy;
    kineticEnergy += n.vx * n.vx + n.vy * n.vy;
  }

  return kineticEnergy;
}

// Deterministic seed position from a string identity. The webview seeds new
// nodes with `seedPosition(path, radius)` so layouts are stable across
// reloads of the same workspace (no `Math.random`). FNV-1a → polar.
export function seedPosition(
  path: string,
  radius: number
): { x: number; y: number } {
  let hash = 0x811c9dc5;
  for (let i = 0; i < path.length; i++) {
    hash ^= path.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const angle = ((hash >>> 0) / 0x100000000) * Math.PI * 2;
  return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
}
