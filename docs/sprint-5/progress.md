# Sprint 5 — Progress Tracker (M4.4 / Graph View)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-5/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: ship the M4.4 Graph View — interactive workspace-wide note⇄wiki-link topology — and close Phase 4.

---

## Status: 🟢 Phase D (tests) — DONE · 🟢 Phase E (docs) — DONE · ready for push + PR + Producer `--no-ff` merge

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0023 + `design/graph-view.md`** | ✅ Done | Remy / Sage | Commit `526db18` |
| 1 | `linkIndex.ts` — pure `allEdges()` (+ unit tests) | ✅ Done | Sage | +7 unit tests |
| 2 | `LinkIndexService.ts` — `getEdges()` / `getNotePaths()` / `uriFor(path)` / `pathFor(uri)` | ✅ Done | Sage | thin wrappers |
| 3 | `graphModel.ts` (pure) — `buildGraph` + tests | ✅ Done | Sage | +18 unit tests; ASCII-codepoint sort |
| 4 | `messages.ts` — `graphData` + `openGraphNode` + guards | ✅ Done | Sage | +9 unit tests |
| 5 | `GraphService.ts` — panel lifecycle, debounced post, `openGraphNode` handler | ✅ Done | Sage | Commit `a804c8b`; routes through `provider.openInMarkStudio` |
| 6 | `package.json` — `markstudio.graph.show` command + **editor title-bar action** | ✅ Done | Sage / Milo | Commit `48361cc` adds the title-bar icon |
| 7 | `esbuild.js` — 4th lazy bundle `dist/graph.js` | ✅ Done | Sage | 19.3 kB; editor webview unchanged |
| 8 | `extension.ts` — wire `GraphService` | ✅ Done | Sage | exposed on test API |
| 9 | `forceSimulation.ts` (pure) — Fruchterman–Reingold | ✅ Done | Nova | +13 unit tests in Phase D |
| 10 | `render.ts` — Canvas2D + DOM labels, theme cache | ✅ Done | Nova + Milo | live `--vscode-*` token sampling per frame |
| 11 | `webview/graph/main.ts` — RAF, drag/zoom/pan/hover/click, merge-by-path | ✅ Done | Nova | seedPosition (FNV-1a), 1-hop neighbour highlight |
| 12 | Unit tests: `forceSimulation` (13) + boundary guard (11) | ✅ Done | Ivy | Phase D |
| 13 | Exthost tests: command registration, idempotency, `handleOpenGraphNode` routing, unknown-path | ✅ Done | Ivy | +4 exthost tests; F5 manual sanity passed |
| 14 | Manual F5: small/medium/large vaults; theme matrix; perf budget | 🟡 Partial | human | Initial F5 sanity passed; full vault + theme matrix sweep is part of Phase F QA |
| 15 | Docs pass + TODO M4.4 Done + ROADMAP Phase 4 close + QA sign-off | ✅ Done | Sage + Remy | Phase E |

## Verification (local)

- `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run typecheck:test` ✅ · `npm run build` ✅
- `npm test` ✅ — **257 unit pass (was 199 baseline, +58) · 65 integration pass · 0 fail**
- `npm run test:exthost` ✅ — **13 pass (was 9 baseline, +4) · 0 fail**

## Commits

- `526db18` — `docs(sprint-5): M4.4 graph view design + ADR-0023 (Phase A)`
- `8f1523e` — `feat(graph): host-side graph model + LinkIndex.allEdges + messaging (Phase B, M4.4)`
- `a804c8b` — `feat(graph): GraphService panel + canvas webview + esbuild bundle (Phase C, M4.4)`
- `73f3135` — `docs(sprint-5): mark Phase C done, update bundle sizes + verification table`
- `48361cc` — `feat(graph): editor title-bar action for Show Graph (Phase C.1, M4.4)`
- _(pending)_ — `test(graph): forceSimulation + boundary guard + exthost coverage (Phase D, M4.4)`

## Bundle sizes after Phase C

| Bundle | Size | Delta vs. main |
|---|---|---|
| `dist/extension.js` | 65.5 kB | +8 kB (GraphService + webviewHtml + graphModel) |
| `dist/webview.js` | 2.0 MB | 0 (editor untouched) |
| `dist/mermaid.js` | 7.5 MB | 0 |
| `dist/graph.js` (new) | **19.3 kB** | new — lazy; users who never run the command download 0 bytes |

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
