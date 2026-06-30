# Sprint 5 — Progress Tracker (M4.4 / Graph View)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-5/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: ship the M4.4 Graph View — interactive workspace-wide note⇄wiki-link topology — and close Phase 4.

---

## Status: 🟢 Phase B (host model + messaging) — DONE · 🟡 Phase C (webview panel) — NEXT

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0023 + `design/graph-view.md`** | ✅ Done | Remy / Sage | Commit `526db18` |
| 1 | `linkIndex.ts` — pure `allEdges()` (+ unit tests) | ✅ Done | Sage | +7 unit tests; edge dedup in same build pass |
| 2 | `LinkIndexService.ts` — `getEdges()` / `getNotePaths()` / `uriFor(path)` / `pathFor(uri)` | ✅ Done | Sage | thin wrappers; no new state |
| 3 | `graphModel.ts` (pure) — `buildGraph` + tests | ✅ Done | Sage | +18 unit tests; ASCII-codepoint sort for determinism |
| 4 | `messages.ts` — `graphData` + `openGraphNode` + guards | ✅ Done | Sage | +9 unit tests; both messages boundary-guarded |
| 5 | `GraphService.ts` — panel lifecycle, debounced post, `openGraphNode` handler | ⬜ Pending | Sage | depends on 2,3,4 |
| 6 | `package.json` — `markstudio.graph.show` command | ⬜ Pending | Sage | depends on 5 |
| 7 | `esbuild.js` — third bundle `dist/graph.js` | ⬜ Pending | Sage | depends on A |
| 8 | `extension.ts` — wire `GraphService` | ⬜ Pending | Sage | depends on 5,6,7 |
| 9 | `forceSimulation.ts` (pure) — Fruchterman–Reingold + tests | ⬜ Pending | Nova | depends on A |
| 10 | `render.ts` — Canvas2D + DOM labels, theme cache | ⬜ Pending | Nova + Milo | depends on A |
| 11 | `webview/graph/main.ts` — RAF, drag/zoom/pan/hover/click, merge-by-path | ⬜ Pending | Nova | depends on 4,9,10 |
| 12 | Integration tests (jsdom): render seam, click→message | ⬜ Pending | Ivy | depends on 11 |
| 13 | Exthost tests: `markstudio.graph.show` + `openGraphNode` routes through `openInMarkStudio` | ⬜ Pending | Ivy | depends on 5,8 |
| 14 | Manual F5: small/medium/large vaults; theme matrix; perf budget | ⬜ Pending | Ivy + human | depends on all impl |
| 15 | Docs pass + TODO M4.4 Done + ROADMAP Phase 4 close + QA sign-off | ⬜ Pending | Sage + Remy | depends on 14 |

## Verification (local)
* `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run typecheck:test` ✅ · `npm run build` ✅
* `npm test` ✅ — **233 unit pass (was 199, +34) · 65 integration pass · 0 fail**
* `npm run test:exthost` ⬜ (baseline: 9; target: 9+~2 after Phase C/D)

## Commits
* `526db18` — `docs(sprint-5): M4.4 graph view design + ADR-0023 (Phase A)`
* _(pending)_ — `feat(graph): host-side graph model + LinkIndex.allEdges + messaging (Phase B, M4.4)`

## Decisions log
* 2026-06-30 — Producer: **zero new runtime dependencies**; hand-rolled force simulation + Canvas2D. d3-force / cytoscape.js / vis-network rejected in ADR-0023.
* 2026-06-30 — Producer: **lazy third esbuild bundle** (`dist/graph.js`), mirrors Mermaid (ADR-0016).
* 2026-06-30 — Producer: **edges from the existing index** via one tiny additive getter (`LinkIndex.allEdges()`); no second parse, no second resolver.
* 2026-06-30 — Producer: **click-to-open routes through `provider.openInMarkStudio`** (PR #4 handshake); non-negotiable.
* 2026-06-30 — Producer: **wiki-link only** (T-4.1a / T-4.1c deferred); **no animated transitions** in v1; **no setting** in v1.
* 2026-06-30 — Producer: `retainContextWhenHidden` keeps node positions within a session; cross-session persistence deferred.

## Open questions (carry from plan.md §9 — resolve during the sprint)
* Zoom modifier: plain wheel vs. `Ctrl+Scroll` — default plain; confirm in F5.
* Layout seed: deterministic (hash of sorted paths) vs. random — default deterministic.
* Label collision at zoom-out: hide below ~6 px radius — confirm in F5.
* Current-node when no MarkStudio editor active: no node marked (default).
* Panel column: `ViewColumn.Beside`.
