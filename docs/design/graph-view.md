# Design — Graph View (M4.4, Phase 4)

> Pre-implementation design for an interactive workspace-wide note⇄wiki-link graph. Status: **planned** (Sprint 5, Phase A). The durable decision is recorded as [ADR-0023](../DECISIONS.md#adr-0023-graph-view-host-side-pure-model--lazy-webview-canvas-zero-new-runtime-deps). Closes Phase 4 alongside M4.1 (backlinks) / T-4.1b (click-nav) / M4.2 (hover preview); M4.3 (transclusion) was dropped from scope on 2026-06-30.

## Problem

After M4.1 / T-4.1b / M4.2 a MarkStudio user can see *per-note* relationships — backlinks pointing **at** the active note, click-through on a `[[link]]`, hover-preview of a target. What is missing is the **vault-wide topology**: which notes are central, which are isolated, which clusters exist. Obsidian's graph view occupies that slot.

The constraint is the same architectural posture as every Phase 4 feature so far: the workspace and the link index live on the **host** (ADR-0001, ADR-0020); rendering and interaction live in the **webview** (ADR-0002); navigation must reuse the **`provider.openInMarkStudio` handshake** PR #4 introduced (so a click on a node opens MarkStudio, not the built-in text editor); and the whole surface must theme as a first-party VS Code panel via `--vscode-*` tokens, not as a custom design system (project philosophy).

## Options considered

1. **Host-side pure model + lazy webview canvas with a hand-rolled force simulation; zero new runtime deps.** Edges come from one tiny additive getter on the existing `LinkIndex`; a pure `buildGraph` produces deterministic `{ nodes, edges }`; a new third esbuild target (`dist/graph.js`) — only loaded when the panel opens — runs a Fruchterman–Reingold simulation on Canvas2D, with DOM-positioned labels so VS Code text rendering applies. Nav routes through `provider.openInMarkStudio`.
2. **Adopt `d3-force` (~30 KB min) for the simulation, keep the rest in-tree.** A well-tested simulation, smaller surface than a full graph library. **Rejected**: the savings are modest at ≤ 500 nodes and the project's standing rule is "zero new dependencies unless the in-tree alternative is genuinely worse" (ADR-0005). We can fall back to it if Phase D profiling shows a real need; ADR-0023 records the bar.
3. **Adopt `cytoscape.js` (~300 KB min) or `vis-network` (~150 KB min)** — full-featured graph libraries. **Rejected**: massive bundle delta for v1 features we already have a path for; both ship their own theming conventions, which fight `--vscode-*` tokens (project philosophy). Defer indefinitely.
4. **Render with SVG instead of Canvas2D.** **Rejected for the body** (every node + edge would be a DOM element — death by repaint at 500 nodes during drag). **Kept for labels** only — Canvas text rendering is fuzzy at sub-pixel positions and ignores VS Code's font configuration; positioning DOM `<span>`s gives crisp, theme-correct labels for free.
5. **Render to the editor's preview pane** (pretend the graph is a special "preview"). **Rejected**: the preview pane is per-document and is incrementally patched on every edit (ADR-0008); the graph is workspace-wide and orthogonal to any single document. A dedicated webview panel is the honest surface.
6. **A custom editor view type with an empty / virtual document backing it.** **Rejected**: nothing to back the editor — there's no per-document state. `vscode.window.createWebviewPanel` is the right primitive.

**Chosen: option 1.** See [ADR-0023](../DECISIONS.md#adr-0023-graph-view-host-side-pure-model--lazy-webview-canvas-zero-new-runtime-deps) for the full rationale.

## Data flow

```
LinkIndexService                                                (existing M4.1 index)
   ParsedNote[] in memory (scan + watcher already running)
   buildLinkIndex(...) already resolves every (from→to) edge
   internally; we expose it via one new pure getter.
        │
        │  LinkIndex.allEdges() : { from, to }[]
        │  LinkIndexService.getNotePaths() : string[]
        │  LinkIndexService.uriFor(path)  : vscode.Uri | undefined
        ▼
GraphService (host)
   on:
     • markstudio.graph.show command
         → create panel if none; else reveal existing.
     • LinkIndexService.onDidChangeIndex   (debounced ~250 ms)
     • provider.onDidChangeActiveDocument   (immediate)
   →  paths   = service.getNotePaths()
      edges   = service.getEdges()                ← thin wrapper over allEdges()
      current = activeDocument?.uri → service.pathOf(uri)
      graph   = buildGraph(paths, edges, current)
        │  postMessage
        ▼
{ type: "graphData", nodes, edges, currentPath }              ── host → webview
        │
        ▼
src/webview/graph/main.ts                                    (separate bundle dist/graph.js)
   merge by path:
     • known node? keep position
     • new node? spawn at centre
     • removed node? drop
   forceSimulation.warm()
   RAF loop {
     simulation.step(dt)
     render.draw(ctx, nodes, edges, hover, currentPath)
     render.placeLabels(domLayer, nodes)
     if (kineticEnergy < ε) stop()
   }
   pointer:
     • mousedown on node → drag (pin to cursor)
     • mousedown on empty canvas → pan
     • wheel → zoom around cursor
     • mousemove → hover; recompute 1-hop neighbour set
     • click on node → postMessage openGraphNode
     • Escape → reset view
        │  postMessage
        ▼
{ type: "openGraphNode", path }                               ── webview → host
        │
        ▼
GraphService.handleOpenGraphNode(path)
   uri = linkIndexService.uriFor(path)
   if !uri → status-bar "MarkStudio: no note found"
   else    → provider.openInMarkStudio(uri, 0)               ← PR #4 handshake
                                                               (already opens MarkStudio,
                                                                not built-in text editor;
                                                                pending-reveal applies)
```

## Module boundaries

| Module | Pure? | Imports | Tested by |
| --- | --- | --- | --- |
| `src/links/linkIndex.ts` — `allEdges()` | ✅ pure | — | unit |
| `src/links/LinkIndexService.ts` — `getEdges()` / `getNotePaths()` / `uriFor()` | host-only | `vscode` | unit (mocked `vscode`) |
| `src/graph/graphModel.ts` — `buildGraph(paths, edges, currentPath)` | ✅ pure | — | unit |
| `src/graph/GraphService.ts` | host-only | `vscode`, provider, link service | unit + exthost |
| `src/messaging/messages.ts` — guards | ✅ pure | — | unit |
| `src/webview/graph/forceSimulation.ts` | ✅ pure | — | unit |
| `src/webview/graph/render.ts` | DOM | Canvas2D, DOM | integration (jsdom; layout asserts deferred to F5) |
| `src/webview/graph/main.ts` | DOM | render + simulation + bus | integration (mounting + click→message) |

The **only files that touch `vscode`** are `LinkIndexService.ts`, `GraphService.ts`, and `extension.ts`. The graph webview bundle imports nothing from `vscode` (only the typed message contract).

## Graph model (pure)

```ts
// graphModel.ts
export interface Node {
  readonly path: string;        // stable identity (workspace-relative POSIX path)
  readonly label: string;       // basename without .md (e.g. "Guide")
  readonly isCurrent: boolean;  // matches currentPath?
}

export interface Edge {
  readonly from: string;        // node.path
  readonly to: string;          // node.path
  readonly weight: number;      // ≥1; multi-links collapsed (Note A linking to B
                                // twice → one edge with weight 2)
}

export interface Graph {
  readonly nodes: ReadonlyArray<Node>;
  readonly edges: ReadonlyArray<Edge>;
}

export function buildGraph(
  paths: ReadonlyArray<string>,
  edges: ReadonlyArray<{ readonly from: string; readonly to: string }>,
  currentPath: string | null
): Graph {
  // Nodes: one per path, sorted by path for deterministic snapshot tests.
  // Edges: dedupe (from→to) — preserve direction; weight = count.
  // Self-edges excluded (the index already drops them; defence-in-depth here).
}
```

### Properties (drive unit tests)

| Input shape | Output expectation |
| --- | --- |
| Empty workspace | `{ nodes: [], edges: [] }` |
| 1 note, no links | 1 node, 0 edges (isolated nodes kept) |
| A → B (single link) | 2 nodes, 1 edge `{from:A,to:B,weight:1}` |
| A → B twice | 1 edge with `weight: 2` (deduped) |
| A → B and B → A | **2** edges (direction preserved) |
| A → A (self) | 0 edges (self-link excluded) |
| `currentPath === "A"` | `nodes[A].isCurrent === true`; all others `false` |
| `currentPath === null` | every node `isCurrent: false` |
| Edge with `from`/`to` not in `paths` | edge **dropped** (defensive; an unresolved target should not appear in the visible graph) |

## Force simulation (pure, deterministic)

`forceSimulation.ts` is a small Fruchterman–Reingold-style integrator:

```ts
export interface SimulationNode {
  path: string;
  x: number; y: number;
  vx: number; vy: number;
  pinned: boolean;   // true while the user drags
}

export interface SimulationEdge {
  from: SimulationNode;
  to: SimulationNode;
  weight: number;
}

export interface SimulationOptions {
  readonly area: number;          // canvas width × height (for k = sqrt(area / n))
  readonly seed: number;          // deterministic spawn positions
  readonly temperature: number;   // initial; cools over ticks
}

export interface Simulation {
  step(dt: number): number;       // returns kinetic energy this tick
  warm(): void;                   // re-raise temperature (called on graphData)
  setSize(area: number): void;
}
```

Forces per tick (one O(n²) pass at ≤500 nodes; Phase D may revisit with a Barnes–Hut quadtree **in-tree**):

* **Repulsion** between every pair of nodes: `f_rep = k² / distance`.
* **Attraction** along each edge: `f_attr = distance² / k` (weighted by edge weight).
* **Centring**: a weak pull toward the canvas centre to keep disconnected components on-screen.
* **Cooling**: temperature decays each tick; node displacement is clamped to the current temperature.
* **Convergence**: when total kinetic energy drops below ε, `step` returns 0 and the RAF loop pauses (no perpetual CPU burn).

`seed` is a hash of the sorted path list, so a given vault lays out the same way each session (good for QA + screenshots; users can still drag).

## Rendering

* **Canvas2D body.** One `<canvas>` filling the panel. One draw call per frame:
  * Edges first (dimmed alpha), then nodes (filled circle with `node.isCurrent` styling), then hover highlights on top.
  * Hit-testing on `mousemove` / `mousedown` is plain Euclidean distance against `nodes` in screen space.
* **DOM-positioned labels.** A sibling absolutely-positioned `<div class="markstudio-graph-labels">` holds one `<span>` per node; each frame `render.placeLabels(...)` updates `style.transform = translate(x, y)`. Below a screen-radius threshold (~6 px) labels are hidden via `visibility:hidden` (no node removal — the layout stays stable).
* **Theme tokens are cached** at mount and on `colorScheme` change (`matchMedia("(prefers-color-scheme: dark)").addEventListener("change", …)` + `MutationObserver` on `document.documentElement` class list — VS Code toggles `vscode-dark` / `vscode-light` / `vscode-high-contrast` there). No `getComputedStyle` per frame.

### Token map

| Surface | Token |
| --- | --- |
| Panel background | `--vscode-editor-background` |
| Node fill (default) | `--vscode-editor-foreground` |
| Node fill (current) | `--vscode-textLink-foreground` |
| Node stroke (hover) | `--vscode-focusBorder` |
| Edge stroke (default) | `--vscode-editorLineNumber-foreground` @ 0.4 alpha |
| Edge stroke (hover-emphasised) | `--vscode-textLink-foreground` |
| Dimmed alpha (non-neighbours during hover) | 0.2× the default |
| Label color | `--vscode-foreground` |
| Label font | `--vscode-font-family`, `--vscode-font-size` |
| Empty-state text ("No notes to display") | `--vscode-descriptionForeground` |

## Interaction model

| Gesture | Effect |
| --- | --- |
| Move pointer over a node | The node + every 1-hop neighbour + connecting edges keep full alpha; everything else dims to 0.2×. |
| Move pointer off all nodes | Clear hover state; full alpha for all. |
| `mousedown` on a node, drag | The node pins to the cursor (`pinned = true`); the simulation warms; on `mouseup` it un-pins. |
| `mousedown` on empty canvas, drag | Pan the view (translate transform). |
| Wheel | Zoom around the cursor; clamped to `[0.1, 5]`. |
| Click a node (no drag) | Post `openGraphNode { path }` → host opens via `provider.openInMarkStudio`. |
| Click empty canvas | Clear hover state. |
| `Escape` | Reset zoom + pan. |

(Keyboard navigation — Tab through nodes, Enter to open — is an accessibility follow-up, not blocking M4.4.)

## Live updates (merge-by-path)

When the host re-posts `graphData` after a link-index change:

1. The webview keeps a `Map<path, SimulationNode>` of the current simulation.
2. For each path in the new `nodes`:
   * **Unchanged path** → keep the existing `SimulationNode` (position, velocity preserved).
   * **New path** → spawn at canvas centre with a small random offset (seeded).
3. Paths absent from the new `nodes` are dropped.
4. Edges are rebuilt from the new payload.
5. `simulation.warm()` re-raises temperature so the layout re-settles smoothly.

This keeps the visual stable on small edits (renaming a single link should not shuffle every node) and avoids re-initialising on every save.

## What this is **not** (out of scope)

* **Filters** by folder / tag / search string. (Follow-up.)
* **Local subgraph** ("show only the current note's N-hop neighbourhood"). (Follow-up.)
* **Persisted node positions** across sessions. `retainContextWhenHidden` covers a session; cross-session is a `Memento`-backed follow-up.
* **Standard markdown-link edges** (`[text](note.md)`) — that's T-4.1a.
* **Heading-level granularity** (distinguishing `[[note]]` from `[[note#heading]]`) — that's T-4.1c.
* **Animated transitions** on graph changes (fading new nodes in, easing repositions). v1 re-merges and re-warms; that's enough.
* **Minimap, find-in-graph, lasso/multi-select, clustering.** Follow-ups.
* **A web worker for the simulation.** Defer until Phase D profiling shows a need; the panel is a separate webview from the editor, so it cannot starve the editor anyway.
* **A separate setting.** Just the command this sprint.

## Performance budget (verified in Phase D)

| Vault size | Settle (wall-clock) | Frame budget | Notes |
| --- | --- | --- | --- |
| ≤ 50 notes | < 2 s | < 16 ms (60 fps) | trivial |
| ≤ 200 notes | < 3 s | < 16 ms steady state, < 33 ms during warm | acceptable |
| ≤ 500 notes | < 5 s | < 33 ms steady state, may spike to ~50 ms during warm | acceptable; host thread never blocked |

If any of these slips meaningfully in Phase D, ADR-0023 records the bar for either (a) adding a Barnes–Hut quadtree **in-tree** or (b) escalating to a `d3-force` dependency.

## Files

| File | Role |
| --- | --- |
| `src/links/linkIndex.ts` | New pure `allEdges()` getter on `LinkIndex` |
| `src/links/LinkIndexService.ts` | New `getEdges()`, `getNotePaths()`, `uriFor(path)` |
| `src/messaging/messages.ts` | `GraphDataMessage` (H→W) + `OpenGraphNodeMessage` (W→H) + guards |
| `src/graph/graphModel.ts` (pure, new) | `buildGraph(paths, edges, currentPath) → Graph` |
| `src/graph/GraphService.ts` (new) | Panel lifecycle, command, subscriptions, `openGraphNode` handler |
| `src/webview/graph/main.ts` (new) | Webview entry: receive `graphData`, RAF loop, gestures, post `openGraphNode` |
| `src/webview/graph/forceSimulation.ts` (pure, new) | Fruchterman–Reingold integrator |
| `src/webview/graph/render.ts` (new) | Canvas2D draw + DOM label sync; theme-token cache |
| `package.json` | Contribute `markstudio.graph.show` command |
| `esbuild.js` | Third bundle target `dist/graph.js` (browser, IIFE) |
| `src/extension.ts` | Construct `GraphService` next to `registerBacklinks` |
