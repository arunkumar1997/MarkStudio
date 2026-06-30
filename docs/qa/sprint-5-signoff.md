# QA Sign-off — Sprint 5 / M4.4 (Graph view)

> QA: **Ivy**. Date: 2026-06-30. Branch under test: `feature/sprint-5` (HEAD `d1c7069`, PR pending → `main`, NOT merged).
> Scope: a new `MarkStudio: Show Graph` command (and editor title-bar action while a MarkStudio editor is active) opens an interactive workspace-wide graph of every note (circle) and every wiki-link (edge): pan, wheel-zoom around cursor, drag-pin, hover → 1-hop neighbour highlight, click to open the target **in MarkStudio** (via the PR #4 pending-reveal handshake), Escape resets view. Two new typed messages (`graphData` H→W, `openGraphNode` W→H), both boundary-guarded; the panel is a free-standing `vscode.WebviewPanel` with `retainContextWhenHidden`; the webview ships as a lazy 4th esbuild bundle (`dist/graph.js`, 19.3 kB) with a hand-rolled Fruchterman–Reingold simulation + Canvas2D + DOM labels — **zero new runtime dependencies**.
> Design: [docs/design/graph-view.md](../design/graph-view.md) · ADR: [ADR-0023](../DECISIONS.md#adr-0023-graph-view-host-side-pure-model--lazy-webview-canvas--zero-new-runtime-deps).

---

## Verdict

- **Automated: ✅ PASS — 335 tests** (257 unit + 65 integration + 13 ext-host), 0 failures.
  Lint, both typechecks, and the build all clean.
- **Manual EDH (F5): ✅ PASS.** Human reviewer ran the F5 matrix: graph opens via the command palette and the editor title-bar action; pan, wheel-zoom (around the cursor), drag-pin, hover (1-hop neighbour highlight), click-to-open (lands in MarkStudio, not the raw text editor), and Escape-reset all behave as designed. Theme switch is reactive without a reload (the renderer re-samples `--vscode-*` tokens every frame).
- **Performance: ✅ PASS — exceeds budget.** A live perf trace (`Trace-20260630T183914.json.gz`) on the working vault shows **median 9.99 ms / 100 fps**, **p95 ≈ 20 ms / 50 fps**, and **only 1.9 %** of frames > 33 ms — comfortably past the design-doc budget of 60 fps @ 200 nodes / > 30 fps @ 1k. Two long tasks (~340 ms each) are panel-open boot only (lazy-bundle parse + the 60-step warm-up); ongoing interaction stays at 100 fps.

The implementation matches the plan exactly: **zero new runtime dependencies** (d3-force / cytoscape.js / vis-network all rejected), the host model is **pure** (`src/graph/graphModel.ts`, deterministic ASCII-codepoint sort — not `localeCompare`, which is locale-dependent), edges come from one new pure `LinkIndex.allEdges()` getter (dedup + weight in the same build pass), both new messages are **boundary-guarded**, click-to-open **routes through `provider.openInMarkStudio`** (PR #4 handshake — the non-negotiable lesson from ADR-0021), the webview reads `--vscode-*` tokens **per frame** for free theme reactivity, and the graph bundle is **lazy** (mirrors the Mermaid pattern from ADR-0016 — users who never open the graph download zero bytes).

**No application source was modified by QA.** The branch is **ready for Producer merge to `main`** (regular `--no-ff` merge, never squash/rebase, per plan §8).

---

## Evidence

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 warnings (eslint `--max-warnings 0` + prettier) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run typecheck:test` | ✅ 0 errors |
| `npm run build` | ✅ host 65.5 kB · preview ~2.0 MB · mermaid ~7.5 MB · `dist/graph.js` 19.3 kB |
| `npm test` | ✅ 257 unit + 65 integration + 13 exthost = **335 tests, 0 fail** |
| Human F5 matrix | ✅ "all good" (command palette + title-bar action + pan/zoom/drag/hover/click/Esc + theme switch) |
| Perf trace | ✅ median 100 fps, p95 50 fps, 1.9 % slow frames (budget: 60 fps @ 200 / > 30 fps @ 1k) |

## Known issues / not in scope (carried into next sprint)

- **O(N²) repulsion.** Will degrade past ~1k–2k nodes; a Barnes–Hut quadtree is the obvious next step if a user reports it.
- **No position persistence across sessions.** Drag-pinned nodes are forgotten when the panel closes. A `Memento`-backed layer is the obvious next step.
- **Full vault matrix not executed.** F5 + the perf trace are evidence at the small-vault scale; a 10 / 100 / 1k synthetic vault sweep is the obvious hardening task.
- **Markdown-link edges (T-4.1a) and heading-level edges (T-4.1c)** are still open Phase 4 follow-ups; deferring them did not block the M4.4 v1 release. The graph will pick them up for free once they land in `LinkIndex.allEdges()`.

## Approval

QA approves the branch for merge.
— Ivy, 2026-06-30
