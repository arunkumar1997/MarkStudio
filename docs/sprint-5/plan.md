# Sprint 5 — M4.4 Graph View

> Producer: **Remy**. Created 2026-06-30. Fourth (and final) Phase 4 — Knowledge Management sprint (follows M4.1 / T-4.1, T-4.1b, and M4.2; closes Phase 4 — M4.3 transclusion was dropped from scope on 2026-06-30).
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).
> Branch: `feature/sprint-5` off `main` (`95a5235`).

---

## 1. Sprint Goal

Ship an interactive **Graph View** of the workspace's note ⇄ wiki-link topology — a single VS Code webview panel, opened by the `MarkStudio: Show Graph` command, that renders every `.md` note as a node and every wiki-link as an edge, fed by the **shared M4.1 link index** that backs Backlinks, in-preview click-nav, and hover preview.

Clicking a node opens the target through the **PR #4 `provider.openInMarkStudio` handshake** — no new navigation path. Hovering a node highlights its 1-hop neighbourhood. The current MarkStudio editor's note is visually marked. The whole panel themes natively via `--vscode-*` tokens (looks like a first-party VS Code surface, not Obsidian).

This is the **last Phase 4 milestone**. Done = Phase 4 closed in ROADMAP.

## 2. Scope (Producer decisions)

**In scope**

* **Pure host-side graph model** (`src/graph/graphModel.ts`) — `buildGraph(notes, resolveForward)` → `{ nodes: Node[], edges: Edge[] }`. **Deduped** edges (a→b appears once even if A links to B multiple times — track `weight`). **Isolated** notes are included (a vault without links should still render every note). **Self-links excluded** (matches the M4.1 backlinks policy). Pure → unit-testable without `vscode` or DOM.
* **`GraphService`** (`src/graph/GraphService.ts`) — owns the panel lifecycle:
  * Registers `markstudio.graph.show` (contributed in `package.json`).
  * Lazy-creates one `vscode.WebviewPanel` with `retainContextWhenHidden: true` (ADR-0002). A second invocation reveals the existing panel — never creates a duplicate.
  * Subscribes to `LinkIndexService.onDidChangeIndex` and to `provider.onDidChangeActiveDocument` and posts a fresh `graphData` to the webview on each change (debounced to coalesce bursts).
  * Disposed via `context.subscriptions`.
* **Two new typed, guarded messages** in `src/messaging/messages.ts`:
  * `graphData` (host → webview) — `nodes: Node[]`, `edges: Edge[]`, `currentPath: string | null`. **Plain JSON only.**
  * `openGraphNode` (webview → host) — `path: string`. **Boundary-guarded** (CODING_GUIDELINES §9): rejects malformed payloads before the host acts.
* **Webview panel** rendered by a **new third esbuild target** (`dist/graph.js`, mirrors the Mermaid lazy-bundle pattern — ADR-0016). Only built and loaded when the panel opens; the base webview bundle is untouched.
  * **Canvas2D** for nodes + edges + the simulation body; **DOM-positioned labels** for crisp text + theme-correct fonts.
  * **Hand-rolled force-directed layout** (Fruchterman–Reingold-style: spring edges + repulsive nodes + centring) — **zero new runtime dependencies**. O(n²) per tick at ≤ 500 nodes is fine (measured in Phase D).
  * `requestAnimationFrame` loop; simulation halts when total kinetic energy drops below a small threshold (no perpetual repaint).
* **Interactions:**
  * Drag a node → it pins to the cursor; release → it un-pins and the simulation re-settles.
  * Wheel → zoom around the cursor (matches VS Code's editor `Ctrl+Scroll` zoom *not* required — plain wheel-zoom is the graph-canvas convention; confirm in F5).
  * Mouse-drag on empty canvas → pan.
  * Hover a node → highlight that node + its 1-hop neighbours + connecting edges; dim everything else (alpha drop, not display:none — the layout must not jump).
  * Click a node → post `openGraphNode { path }`; host routes through `provider.openInMarkStudio(uri, 0)` (PR #4 handshake — already opens MarkStudio for not-yet-open notes via the pending-reveal map).
  * Click empty canvas → clear hover state.
  * Escape → reset zoom + pan.
* **Current-note marker:** the node whose `path` matches `currentPath` is drawn larger and in `--vscode-textLink-foreground`; all others use `--vscode-editor-foreground`.
* **Live updates:** `LinkIndexService.onDidChangeIndex` (debounced ~250 ms — same window the index already uses) re-posts `graphData`. The webview merges by `path`: a node whose path is unchanged keeps its position; new nodes spawn at the centre; deleted nodes are removed. The simulation re-warms briefly.
* **Theming** (entirely via `--vscode-*` tokens, no custom palette):
  * Background: `--vscode-editor-background`
  * Edges: `--vscode-editorLineNumber-foreground` with reduced alpha; hover-emphasised edges: `--vscode-textLink-foreground`
  * Node fill: `--vscode-editor-foreground` (current: `--vscode-textLink-foreground`)
  * Node stroke (hover): `--vscode-focusBorder`
  * Label text: `--vscode-foreground`, font from `--vscode-font-family` / `--vscode-font-size`
  * Dimmed (non-neighbours during hover): same colours with reduced opacity
* **Pipeline gate:** lint clean, typecheck clean, build clean, all three test layers green; new tests added (target ~25–35 new tests across unit + integration + exthost).

**Out of scope (explicit follow-ups, tracked in TODO):**

* **Filters** (by folder / tag / search string) — defer to a Phase 4 follow-up.
* **Local subgraph** ("show only the current note's N-hop neighbourhood") — defer.
* **Persisted node positions** across sessions — defer. Layout re-settles on each panel open; node positions persist *within* a session via the webview's retained state (no extra work — `retainContextWhenHidden` already gives us this).
* **Standard markdown-link edges** (`[text](note.md)`) — that's T-4.1a; the graph is wiki-link only this sprint (same as Backlinks).
* **Heading-level granularity** (`[[note#heading]]` distinct from `[[note]]`) — that's T-4.1c; the graph collapses to the note level.
* **Animated transitions** when the index changes (fade-in new nodes, easing on position deltas) — defer; v1 is "re-merge by path, re-warm".
* **Multi-select / lasso / find-in-graph / minimap** — defer.
* **Keyboard navigation** (Tab through nodes, Enter to open) — accessibility follow-up, tracked but not blocking M4.4.
* **CodeMirror-pane integration** ("jump from a wiki-link in source to its node in the graph") — defer.
* **Clustering / grouping** (by folder, by community) — defer.
* **Webworker for the simulation** — defer; profile first (Phase D) before adding a worker. v1 runs on the main webview thread because the panel is a separate webview from the editor's preview, so it cannot starve the editor.

## 3. Architecture (project-specific)

Touches three layers: the **link index** (one tiny, additive read seam), a new **host-side `src/graph/` module**, and a new **`src/webview/graph/` entry** built as its own bundle. **No change to the editor webview, no change to the existing preview/CodeMirror, no recreation of any persistent surface** (ADR-0002).

| File | Responsibility | Must NOT |
|---|---|---|
| `src/links/linkIndex.ts` | Extend `LinkIndex` with **one** new pure getter — `allEdges(): { from: string; to: string }[]` — that returns every resolved (from → to) pair the reverse index already computed internally. Self-loops excluded (matches the existing build loop). | Add I/O; change `backlinksFor` / `resolveForward` behaviour |
| `src/links/LinkIndexService.ts` | Expose **one** new method — `getEdges(): { from: string; to: string }[]` plus `getNotePaths(): string[]` — so `GraphService` can build a graph without re-scanning. Also expose `uriFor(path): vscode.Uri \| undefined` so the host can resolve a node-click path back to a URI without duplicating `uriByPath`. | Re-scan; build the graph itself; touch resolution |
| `src/graph/graphModel.ts` (new, **pure**) | `buildGraph(paths, edges, currentPath)` → `{ nodes, edges }`. Dedupes edges with a weight; isolates kept; deterministic ordering for snapshot tests. | Import `vscode`/DOM; do I/O |
| `src/graph/GraphService.ts` (new) | Owns the panel + command + subscriptions + debounced `postGraphData`. Handles `openGraphNode` by resolving `path → uri` via `LinkIndexService.uriFor` and calling `provider.openInMarkStudio(uri, 0)`. | Render anything; resolve URIs itself; recreate the panel on every change |
| `src/messaging/messages.ts` | `GraphDataMessage` (H→W) + `OpenGraphNodeMessage` (W→H) + guards. | Import `vscode`/DOM; carry non-JSON |
| `src/webview/graph/main.ts` (new) | Webview entry: receives `graphData`, builds the force simulation, drives the RAF loop, handles drag/zoom/pan/hover/click, posts `openGraphNode`. | Hard-code colours; bundle external deps; rebuild on every `graphData` (merge by `path`) |
| `src/webview/graph/forceSimulation.ts` (new, **pure**) | Plain function over `{ nodes, edges }` with a `step(dt)` method; no DOM; deterministic given a seed. | Import DOM; allocate per tick |
| `src/webview/graph/render.ts` (new) | Canvas2D draw + DOM label sync. Reads `--vscode-*` via `getComputedStyle(document.documentElement)`. | Re-read tokens per frame (cache + invalidate on `colorScheme` change) |
| `package.json` | Contribute `markstudio.graph.show` command + menu entry (Command Palette only — no Explorer button in v1). | Contribute a tree view (the graph is a panel, not a tree) |
| `esbuild.js` | Add a third bundle: `src/webview/graph/main.ts` → `dist/graph.js` (browser, IIFE, es2022). | Bundle into `dist/webview.js` |
| `src/extension.ts` | Construct a `GraphService` (passing the existing `LinkIndexService` + `provider`) alongside `registerBacklinks`; push to `context.subscriptions`. | Start a second link index; duplicate state |

**Reuse, don't duplicate.** Edges come from the same `LinkIndex` that powers Backlinks; navigation goes through the same `provider.openInMarkStudio` that wiki-links, backlinks, and standard markdown-links already use; theming reads the same `--vscode-*` tokens the existing webview uses; bundling reuses the lazy third-target pattern Mermaid introduced.

## 4. Producer decisions (pre-empt scope creep)

1. **Zero new runtime dependencies.** Hand-rolled Fruchterman–Reingold simulation in `forceSimulation.ts`; Canvas2D for rendering. d3-force (~30 KB min) and cytoscape.js (~300 KB min) were considered and rejected in ADR-0023 — the savings do not justify the dependency surface at ≤ 500 nodes. If profiling in Phase D shows the simulation is the bottleneck on a 500-note vault, we revisit by adding Barnes–Hut quadtree quadrants **in-tree**, not a library.
2. **Canvas2D body + DOM labels.** Canvas for nodes + edges (one cheap draw call per frame, no per-node DOM); DOM-positioned `<span>` labels so VS Code's text rendering applies and labels are theme-correct.
3. **One panel, retained when hidden** (ADR-0002 applied to a non-editor webview). A second `markstudio.graph.show` reveals the existing panel; `panel.onDidDispose` clears the reference so the next call re-creates.
4. **Click-to-open routes through `provider.openInMarkStudio`** (PR #4 handshake). The graph **never** calls `vscode.window.showTextDocument` directly — it would open the built-in text editor for a not-yet-open note. This is non-negotiable.
5. **Edges from the index, not re-parsed.** `LinkIndex.allEdges()` is a thin additive getter over data the reverse-index build loop already produces; no second parse, no second resolver.
6. **Lazy bundle.** The graph code is only downloaded by the webview when the panel opens. The editor webview's bundle does not change. (Same pattern as Mermaid, ADR-0016.)
7. **No new setting this sprint.** The command alone is the surface. Revisit if QA finds the panel intrusive on small vaults.
8. **Wiki-link only.** Markdown-link edges (T-4.1a) and heading-level edges (T-4.1c) are tracked follow-ups; pulling them forward would conflate this sprint with backlog work.
9. **Live updates, not animated.** Index change → debounced `postGraphData` → webview merges by `path` and re-warms the simulation. No tweened transitions in v1 (defer).
10. **Layout re-settles on open; not persisted to disk.** `retainContextWhenHidden` keeps positions across panel hides within a session; a fresh window starts fresh. Persisting layout to `Memento` is a deferred follow-up.
11. **Performance budget (Phase D must measure):**
    * ≤ 50 nodes: settle in < 2 s wall-clock, < 16 ms per frame at 60 fps.
    * ≤ 500 nodes: initial paint < 5 s; the simulation may run > 16 ms per frame transiently but must not block the UI thread for > 100 ms in any single tick.
    * Never block the **host** thread (all simulation is webview-side; host work is the small debounced `postMessage`).

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| **A** | **Design + ADR-0023 + `design/graph-view.md`** (this commit) | **Remy / Sage** |
| 1 | `linkIndex.ts` — add pure `allEdges()` (+ unit tests for dedup, self-link exclusion, isolated-note coverage) | **Sage** |
| 2 | `LinkIndexService.ts` — expose `getEdges()`, `getNotePaths()`, `uriFor(path)` | **Sage** |
| 3 | `graphModel.ts` (pure) — `buildGraph` (+ deterministic-ordering unit tests, current-note flag, isolated nodes, weighted edges) | **Sage** |
| 4 | `messages.ts` — `GraphDataMessage` + `OpenGraphNodeMessage` + guards (+ guard tests) | **Sage** |
| 5 | `GraphService.ts` — panel lifecycle, debounced post, `openGraphNode` handler, dispose | **Sage** |
| 6 | `package.json` — contribute `markstudio.graph.show` command + Command Palette entry | **Sage** |
| 7 | `esbuild.js` — third bundle target `dist/graph.js` | **Sage** |
| 8 | `extension.ts` — construct + register `GraphService` next to `registerBacklinks` | **Sage** |
| 9 | `forceSimulation.ts` (pure) — Fruchterman–Reingold step; deterministic given a seed (+ unit tests: convergence on a tiny fixed graph) | **Nova** |
| 10 | `render.ts` — Canvas2D draw + DOM label sync; theme-token cache + `colorScheme` invalidation | **Nova** + **Milo** (theming review) |
| 11 | `webview/graph/main.ts` — RAF loop, drag/zoom/pan/hover/click, merge-by-path on `graphData`, post `openGraphNode` | **Nova** |
| 12 | Integration tests (jsdom): `graphData` → render seam (no real layout, but DOM/Canvas mounting + label DOM + click-posts-message can be asserted) | **Ivy** |
| 13 | Exthost tests: `markstudio.graph.show` opens a panel; `openGraphNode` routes through `provider.openInMarkStudio` (reuses PR #4 fixture) | **Ivy** |
| 14 | Manual F5: small (~5 notes), medium (~50), large (~500); theme switch; click-to-open; hover; pan/zoom/drag; live update on save | **Ivy** |
| 15 | Docs pass: `api/message-protocol.md`, CHANGELOG, FEATURES, ROADMAP (mark M4.4 done, close Phase 4 exit criteria check), TODO, PROJECT_STATUS, AGENT_HANDOFF | **Sage** + **Remy** |

## 6. Success Criteria (Definition of Done)

* [ ] `MarkStudio: Show Graph` (Command Palette) opens a single webview panel.
* [ ] Every workspace `.md` note is a node; every wiki-link is an edge (deduped, weighted).
* [ ] Isolated notes (no incoming or outgoing wiki-links) still appear.
* [ ] Self-links are excluded.
* [ ] The current MarkStudio editor's note is visually marked (size + `--vscode-textLink-foreground`).
* [ ] Hover a node → that node + its 1-hop neighbours + connecting edges highlight; others dim. Click empty canvas → reset.
* [ ] Click a node → the target opens in **MarkStudio** (not the built-in text editor) via `provider.openInMarkStudio`, even when not previously open (pending-reveal handshake from PR #4).
* [ ] Drag a node to reposition; release → simulation re-settles. Wheel zooms; mouse-drag on empty canvas pans; Escape resets view.
* [ ] Creating, renaming, deleting, or editing a `.md` file (within the debounce window) updates the graph live; existing node positions are preserved for unchanged paths.
* [ ] Theme switch (light / dark / high-contrast) re-themes the panel; **no hard-coded colours** anywhere in the bundle.
* [ ] **Zero new runtime dependencies.** `package.json` `dependencies` unchanged (only `devDependencies` may add if an esbuild target needs it — it should not).
* [ ] Both new messages are in the typed unions; `openGraphNode` is **rejected by the boundary guard** when malformed (negative-case test).
* [ ] One `LinkIndexService` shared with Backlinks + click-nav + hover; one `provider.openInMarkStudio` shared with all navigation; no duplicated resolver, watcher, or open path.
* [ ] No webview recreation. Panel honours `retainContextWhenHidden`; positions survive a hide/reveal cycle within a session.
* [ ] Performance budget met on the F5 small/medium/large vaults (§4.11).
* [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test`, `npm run test:exthost` all green.
* [ ] Docs updated (incl. `api/message-protocol.md`); **M4.4 marked Done** in TODO; **Phase 4 closed** in ROADMAP exit-criteria check. QA sign-off in `docs/qa/sprint-5-signoff.md`.

## 7. Guardrails (project-specific)

* **Native + minimal.** The graph is a single webview panel themed via `--vscode-*` tokens. No floating windows, no minimap, no toolbar in v1.
* **No new dependency without an ADR rejection of the in-tree alternative.** ADR-0023 already does this for d3-force / cytoscape.js / vis-network; if Phase D shows a real need, amend the ADR before adding one.
* **Untrusted boundary.** `openGraphNode` is guard-validated before the host acts; the host never trusts a raw `path`. If `uriFor(path)` returns `undefined`, the host degrades to a status-bar message — never throws.
* **Reuse, don't duplicate.** Edges from the existing index; nav through the existing handshake; bundling via the existing lazy-target pattern; theming via the existing token vocabulary.
* **Security.** No `eval`, no inline `<script>`, no remote loads. Same CSP as the editor webview. The bundle is local; the only data crossing the boundary is the typed message payloads.
* **Performance is a feature.** Simulation runs in the webview (not the host); halts on convergence; debounced live updates; merge-by-path on update (no full re-init).
* **Graceful degradation.** Empty workspace ⇒ panel shows a "No notes to display" message (still themed). Single isolated note ⇒ rendered as one node. Index not ready ⇒ panel waits for the first `onDidChangeIndex`.

## 8. Branch & merge rules

* Dev branch: `feature/sprint-5` off `main` (`95a5235`).
* `feat:` commits referencing **M4.4**; `docs:` for the close-out commit.
* Regular `--no-ff` merge to `main` after QA sign-off — **never squash or rebase** (preserve the commits, as with Sprints 1–4).
* Keep Prettier (2-space + final newline) green before every commit — the recurring local formatter drift bit every prior sprint; re-check `prettier --check .` before committing.

## 9. Open questions (resolve during the sprint)

* **Zoom modifier:** plain wheel-zoom (graph-canvas convention) or `Ctrl+Scroll` (VS Code editor convention)? Producer default: plain wheel-zoom; confirm in F5.
* **Initial layout seed:** deterministic (so a vault always lays out the same way) or randomised per open? Producer default: deterministic (seed = hash of the sorted path list) so screenshots/tests are stable; node positions still mutate via drag.
* **Label collision strategy at zoom-out:** hide labels below a zoom threshold, or always show? Producer default: hide labels when a node's screen-radius drops below ~6 px; confirm in F5.
* **Current-node behaviour when no MarkStudio editor is active:** no node marked, or the most recently active note's node marked? Producer default: no node marked (consistent with the Outline + Backlinks views, which also hide when no MarkStudio editor is active).
* **Panel default location:** "active editor group" (replaces nothing) or "beside"? Producer default: `vscode.ViewColumn.Beside` — keeps the note open next to the graph; matches "click node opens beside".
* **Status of `M4.3` follow-ups in ROADMAP:** confirm the drop is final (transclusion → Phase 5 or out entirely) when closing Phase 4 in the Phase E docs pass.
