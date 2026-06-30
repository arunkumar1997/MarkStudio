# Sprint 5 — Done (M4.4 / Graph view)

> Close-out record. Written by the Producer (Remy) at branch ready. History lives in git.

---

## Outcome

**M4.4 — Graph view** is **complete on `feature/sprint-5`, pending PR + `--no-ff` merge to `main`**.

A new `MarkStudio: Show Graph` command (and editor title-bar action with the `$(type-hierarchy)` icon while a MarkStudio editor is active) opens an interactive workspace-wide graph of every workspace note (circle) and every wiki-link (edge): pan, wheel-zoom around the cursor, drag to pin a node, hover for a 1-hop neighbour highlight, click to open the target **in MarkStudio**, Escape resets the view.

- **Branch:** `feature/sprint-5` (off `main`); 6 commits ahead.
- **ADR:** **ADR-0023** — host-side pure model + lazy webview canvas + **zero new runtime dependencies** (d3-force / cytoscape.js / vis-network all rejected).
- **This closes Phase 4 — Knowledge Management.**

## Verification

- **Automated — PASS (335 tests, 0 failures):** 257 unit (+58) · 65 integration · 13 exthost (+4).
- **Gate:** `npm run lint` (eslint `--max-warnings 0` + prettier) · `npm run typecheck` · `npm run typecheck:test` · `npm run build` — all green.
- **Bundle deltas:** host `dist/extension.js` 57.5 → **65.5 kB** (+8 kB); preview webview unchanged (~2.0 MB); Mermaid lazy bundle unchanged (~7.5 MB); **new** `dist/graph.js` **19.3 kB** (lazy, downloaded only when the graph is opened — mirrors the Mermaid pattern from ADR-0016).
- **Human F5:** verified working by the human reviewer — graph opens via command palette and editor title-bar action, pan / wheel-zoom / drag-pin / hover-highlight / click-to-open / Escape-reset all behave; theme switch updates colours without a reload.
- **Perf trace** (initial F5, `Trace-20260630T183914.json.gz`): median frame **9.99 ms / 100 fps**, p95 ≈ 20 ms / 50 fps, **only 1.9 %** of frames > 33 ms. Two long tasks (~340 ms) are panel-open boot only — bundle parse + the 60-step warm-up. **Far exceeds the design-doc budget (60 fps @ 200 nodes / > 30 fps @ 1k).**
- QA sign-off: [../qa/sprint-5-signoff.md](../qa/sprint-5-signoff.md).

## Commits

| Commit | Description |
|---|---|
| `526db18` | docs(sprint-5): M4.4 graph view design + ADR-0023 (Phase A) |
| `8f1523e` | feat(graph): host-side graph model + `LinkIndex.allEdges` + messaging (Phase B) |
| `a804c8b` | feat(graph): GraphService panel + canvas webview + esbuild bundle (Phase C) |
| `73f3135` | docs(sprint-5): mark Phase C done, update bundle sizes + verification table |
| `48361cc` | feat(graph): editor title-bar action for Show Graph (Phase C.1) |
| `d1c7069` | test(graph): forceSimulation + boundary guard + exthost coverage (Phase D) |

(Phase E — this doc + status/handoff/changelog/features/architecture/roadmap/TODO updates — and the merge commit follow.)

## What shipped

### Host (extension)

- `src/links/linkIndex.ts` — new `GraphEdge` type + **pure** `allEdges()` getter; (from, to) dedup with weight summed in the same build pass; deterministic ASCII-codepoint key (no `localeCompare` — that's locale-dependent).
- `src/links/LinkIndexService.ts` — four new thin getters: `getNotePaths()`, `getEdges()`, `uriFor(path)`, `pathFor(uri)`. Used by `GraphService` only; the backlinks panel + click-nav path is untouched.
- `src/graph/graphModel.ts` (new, pure) — `buildGraph(paths, edges, currentPath) → Graph`: deterministic ASCII sort, defensive self-edge + unknown-endpoint drops, weight ≤ 0 → 1.
- `src/graph/GraphService.ts` (new) — owns the single `vscode.WebviewPanel` (`retainContextWhenHidden: true`). Subscribes to `LinkIndexService.onDidChangeIndex` (debounced 250 ms) and `provider.onDidChangeActiveDocument` (immediate); posts `graphData` over the boundary-guarded `MessageBus`. Handles `openGraphNode { path }` by routing through `provider.openInMarkStudio(uri, 0)` — the **PR #4 pending-reveal handshake**, non-negotiable. `coerceWebviewToHostMessage` exported for the boundary-guard test suite.
- `src/graph/webviewHtml.ts` (new) — strict-CSP HTML scaffold for the panel.
- `src/messaging/messages.ts` — new `GraphDataMessage` (H → W) + `OpenGraphNodeMessage` (W → H); both added to the unions and the boundary guards.
- `src/extension.ts` — wired `GraphService`; exposed on the `MarkStudioExtensionApi` for exthost tests.
- `package.json` — `markstudio.graph.show` command + editor title-bar entry under `menus.editor/title`, `group: navigation@99`, `when: activeCustomEditorId == 'markstudio.editor'`.

### Webview (lazy `dist/graph.js`)

- `src/webview/graph/forceSimulation.ts` (new, pure) — hand-rolled 2D Fruchterman–Reingold: repulsion + Hookean spring + centre gravity + damping + per-step displacement cap. Deterministic FNV-1a `seedPosition` (no `Math.random`). Kinetic-energy stopping criterion; RAF self-stops.
- `src/webview/graph/render.ts` (new) — Canvas2D body + DOM labels. Every frame samples live `--vscode-*` tokens via `getComputedStyle` (`readThemeTokens`) so the graph reacts to theme switches without host wiring. Native HiDPI via `devicePixelRatio`. `pickNode` inverts the view transform for hit-testing. Labels hide below `scale = 0.6`.
- `src/webview/graph/main.ts` (new) — RAF loop, merge-by-path on `graphData` (known nodes keep positions, new nodes seed at a hashed angle, removed nodes drop), drag-pin / pan / wheel-zoom-around-cursor / hover → 1-hop neighbour highlight / Escape resets view.

### Build + tests

- `esbuild.js` — 4th lazy target: `src/webview/graph/main.ts` → `dist/graph.js` (19.3 kB). Editor webview and Mermaid bundles are untouched.
- `test/graph/graphModel.test.ts` (new) — 18 unit tests for the pure builder (deterministic sort, self-edge drop, unknown-endpoint drop, weight normalisation, currentPath highlight).
- `test/graph/coerceWebviewToHostMessage.test.ts` (new) — 11 boundary-guard tests; required exporting `coerceWebviewToHostMessage` from `GraphService`.
- `test/webview/graph/forceSimulation.test.ts` (new) — 13 unit tests for the pure simulation (determinism, fixed-node pinning, kinetic-energy convergence).
- `test/exthost/suite/graphView.test.ts` (new) — 4 exthost tests: open command lands a `WebviewPanel`, refresh on index change, refresh on active-doc change, click-to-open routes through `openInMarkStudio` (PR #4 handshake).
- `test/links/linkIndex.test.ts`, `test/messaging/messages.test.ts` — +7 `allEdges` + 9 messaging-guard tests.
- `test/exthost/index.ts` — imports the new suite.

### Docs

- `docs/DECISIONS.md` — appended **ADR-0023** (Accepted).
- `docs/design/graph-view.md` (new) — pre-impl design: data flow, module boundaries, force-sim shape, token map, perf budget (§10: 60 fps @ 200 / > 30 fps @ 1k).
- `docs/sprint-5/plan.md`, `docs/sprint-5/progress.md` — sprint source-of-truth + live tracker.
- Phase E: `docs/PROJECT_STATUS.md`, `docs/AGENT_HANDOFF.md`, `docs/TODO.md`, `docs/ROADMAP.md`, `docs/CHANGELOG.md`, `docs/FEATURES.md`, `docs/ARCHITECTURE.md` all updated; this doc + `docs/qa/sprint-5-signoff.md` written.

## Producer policy (non-negotiable, recorded for posterity)

1. **Zero new runtime dependencies.** d3-force / cytoscape.js / vis-network all rejected (ADR-0023).
2. **Wiki-link only** in v1. T-4.1a (markdown-link edges) and T-4.1c (heading-level edges) are deferred — they belong to their own future tasks; the graph will pick them up for free when those land in `LinkIndex.allEdges()`.
3. **No new setting.** The `markstudio.graph.show` command (+ editor title-bar action) is the only surface. A discoverability signal would be needed before adding a keybinding or status-bar entry.
4. **Click-to-open must route through `provider.openInMarkStudio`.** The PR #4 pending-reveal handshake is the *only* sanctioned path; never `vscode.window.showTextDocument` (would land in the raw text editor, the lesson behind ADR-0021).
5. **Native VS Code theming only.** Every colour comes from `--vscode-*` via `getComputedStyle`; no custom palette.

## Known issues / follow-ups

- **O(N²) repulsion** in the force simulation — the F5 trace shows 100 fps median on the working vault, but performance will degrade past ~1k–2k nodes; a Barnes–Hut quadtree would buy us headroom if a user reports it.
- **No position persistence across sessions.** Drag-pinned nodes are forgotten when the panel closes. A `Memento`-backed persistence layer is the obvious next step if asked for.
- **Full vault matrix not yet executed.** F5 + the perf trace are our only evidence at the small-vault scale; a 10 / 100 / 1k synthetic vault sweep is the obvious Phase 5 hardening task.
- **Markdown-link edges** (T-4.1a) and **heading-level edges** (T-4.1c) are still open Phase 4 follow-ups; deferring them did not block the M4.4 v1 release.

## Next sprint

Phase 4 is now complete. The next focus is **Phase 5 — Authoring Workflows** (templates / snippets / daily notes / workspace note features). The two open Phase 4 follow-ups (T-4.1a markdown-link backlinks, T-4.1c heading-level edges) can be picked up either in Phase 5 or as standalone follow-ups — see `docs/AGENT_HANDOFF.md` §10.
