# AGENT HANDOFF — Sprint 5 / M4.4 Graph view shipped on `feature/sprint-5` (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Remy (Producer) — Sprint 5 close-out (Phases A → E)
* **Working branch:** `feature/sprint-5` (off `main` `dee909e`)
* **Last commit on branch:** `d1c7069` *(test(graph): forceSimulation + boundary guard + exthost coverage — Phase D)*. Branch is **6 commits ahead** of `main`, plus the Phase E docs commit that will follow this handoff write.
* **Prompt used:** ai-team-orchestration (Producer + Dev team — Sage host + Nova webview + Ivy tests)

---

## 1. What Was Completed

**Sprint 5 — M4.4 Graph view shipped on `feature/sprint-5` (pending PR + `--no-ff` merge to `main`). This closes Phase 4 — Knowledge Management.**

A new **`MarkStudio: Show Graph`** command (`markstudio.graph.show`, also surfaced as an editor title-bar action with the `$(type-hierarchy)` icon while a MarkStudio editor is active) opens an interactive workspace-wide graph of every workspace note (circle) and every wiki-link (edge): pan, wheel-zoom around the cursor, drag-pin, hover → 1-hop neighbour highlight, click to open the target **in MarkStudio**, Escape resets the view.

**Architecture.**

* **`src/links/linkIndex.ts`** — new `GraphEdge` type + **pure** `allEdges()` getter; (from, to) dedup with weight summed in the same build pass; deterministic ASCII-codepoint key (Phase-B bug caught: `localeCompare` is locale-dependent — switched to `(a < b ? -1 : a > b ? 1 : 0)`).
* **`src/links/LinkIndexService.ts`** — four new thin getters: `getNotePaths()`, `getEdges()`, `uriFor(path)`, `pathFor(uri)`. Used only by `GraphService`; the backlinks panel + click-nav path is untouched.
* **`src/graph/graphModel.ts` (new, pure).** `buildGraph(paths, edges, currentPath) → Graph`: deterministic ASCII sort, defensive self-edge + unknown-endpoint drops, weight ≤ 0 → 1.
* **`src/graph/GraphService.ts` (new).** Owns the single `vscode.WebviewPanel` (`retainContextWhenHidden: true`). Subscribes to `LinkIndexService.onDidChangeIndex` (debounced 250 ms) and `provider.onDidChangeActiveDocument` (immediate); posts `graphData` over the boundary-guarded `MessageBus`. Handles `openGraphNode { path }` by routing through `provider.openInMarkStudio(uri, 0)` — **the PR #4 pending-reveal handshake**, never `showTextDocument`. `coerceWebviewToHostMessage` is exported so the boundary-guard test suite can hit it directly.
* **`src/graph/webviewHtml.ts` (new).** Strict-CSP HTML scaffold (`script-src 'nonce-…'`, `style-src 'unsafe-inline'` for `--vscode-*` token use, no `connect-src`).
* **`src/messaging/messages.ts`.** New `GraphDataMessage` (H → W) + `OpenGraphNodeMessage` (W → H); both added to the unions and the boundary guards.
* **`src/extension.ts`.** Wired `GraphService`; exposed on the `MarkStudioExtensionApi` for exthost tests.
* **`package.json`.** `markstudio.graph.show` command + editor title-bar entry under `menus.editor/title`, `group: navigation@99`, `when: activeCustomEditorId == 'markstudio.editor'`.
* **`src/webview/graph/forceSimulation.ts` (new, pure).** Hand-rolled 2D Fruchterman–Reingold: repulsion + Hookean spring + centre gravity + damping + per-step displacement cap. Deterministic FNV-1a `seedPosition` — no `Math.random`. Kinetic-energy stopping criterion; RAF self-stops when settled.
* **`src/webview/graph/render.ts` (new).** Canvas2D body + DOM labels. Every frame samples live `--vscode-*` tokens via `getComputedStyle` (`readThemeTokens`) so the graph reacts to theme switches without host wiring. Native HiDPI via `devicePixelRatio`. `pickNode` inverts the view transform for hit-testing. Labels hide below `scale = 0.6`.
* **`src/webview/graph/main.ts` (new).** RAF loop, **merge-by-path** on `graphData` (known nodes keep positions, new nodes seed at a hashed angle, removed nodes drop), drag-pin / pan / wheel-zoom around the cursor / hover → 1-hop neighbour highlight / Escape resets the view.
* **`esbuild.js`.** 4th lazy target: `src/webview/graph/main.ts` → `dist/graph.js` (**19.3 kB**). Mirrors the Mermaid pattern from ADR-0016 — users who never open the graph download zero bytes.

**Tests.** Unit **199 → 257** (+58: 7 `allEdges` + 18 `graphModel` + 9 messaging guards + 13 `forceSimulation` + 11 `coerceWebviewToHostMessage`). Integration **65** (unchanged — jsdom has no real Canvas2D, so `render.ts` is not jsdom-integration-testable; the pure simulation is unit-tested instead). Exthost **9 → 13** (+4 — graph-view suite: open command lands a `WebviewPanel`, refresh on index change, refresh on active-doc change, click-to-open routes through `openInMarkStudio` / PR #4 handshake). **335 automated tests, 0 failures.**

**Perf.** Initial F5 trace (`Trace-20260630T183914.json.gz`, 25 MB compressed): **median frame 9.99 ms / 100 fps**, p95 ≈ 20 ms / 50 fps, only **1.9 %** of frames > 33 ms. Two long tasks (~340 ms each) are panel-open boot only — bundle parse + the 60-step warm-up; ongoing interaction stays at 100 fps. **Far exceeds the design-doc budget (60 fps @ 200 nodes / > 30 fps @ 1k).**

**Human F5.** Reviewer confirmed "all good" — graph opens via the command palette and the editor title-bar action; pan, wheel-zoom around the cursor, drag-pin, hover-highlight, click-to-open (lands in MarkStudio, not the raw text editor), Escape-reset, and theme switch all behave.

**Docs.** New ADR-0023 in [DECISIONS.md](DECISIONS.md); new [design/graph-view.md](design/graph-view.md); both messages in [api/message-protocol.md](api/message-protocol.md); [CHANGELOG.md](CHANGELOG.md) new `Added` entry; [FEATURES.md](FEATURES.md) graph-view row flipped to *Shipped*; [ROADMAP.md](ROADMAP.md) Phase 4 → *Done*; [TODO.md](TODO.md) M4.4 → Done; [ARCHITECTURE.md](ARCHITECTURE.md) §4 Graph subsystem entries (host + webview); [PROJECT_STATUS.md](PROJECT_STATUS.md); [sprint-5/plan.md](sprint-5/plan.md), [sprint-5/progress.md](sprint-5/progress.md), [sprint-5/done.md](sprint-5/done.md); [qa/sprint-5-signoff.md](qa/sprint-5-signoff.md); this handoff.

---

## 2. Current Work In Progress

* **None.** Sprint 5 is **code-complete and docs-complete on `feature/sprint-5`**. The only remaining steps are: this Phase-E docs commit, `git push -u origin feature/sprint-5`, `gh pr create`, and the Producer `--no-ff` merge to `main`.

---

## 3. Remaining Work for This Initiative

**Phase 4 — Knowledge Management is closed** by this sprint. Two carry-over follow-ups remain open and may be picked up either as small standalone sprints or as part of Phase 5:

* **T-4.1a — Markdown-link backlinks.** Extend `LinkIndex` to index standard markdown links (`[text](./note.md)`) in addition to wiki-links. The Graph view will pick these up for free once they appear in `LinkIndex.allEdges()`.
* **T-4.1c — Heading-level backlinks / heading-level graph edges.** Currently `[[note#heading]]` is captured but resolved to the file in `LinkIndex`; promoting it to a real per-heading edge would enrich both the Backlinks panel and the Graph view.

The next focus on `main` after this merge is **Phase 5 — Authoring Workflows** ([ROADMAP.md](ROADMAP.md) §5): templates, snippets, daily notes, workspace note features.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/links/linkIndex.ts` | Edited | New `GraphEdge` type + pure `allEdges()` getter; dedup + weight in the build pass; deterministic ASCII key (not `localeCompare`) |
| `src/links/LinkIndexService.ts` | Edited | New `getNotePaths` / `getEdges` / `uriFor` / `pathFor` getters (consumed by `GraphService` only) |
| `src/graph/graphModel.ts` | New | Pure `buildGraph(paths, edges, currentPath)` |
| `src/graph/GraphService.ts` | New | Single `WebviewPanel`, debounced post, `openGraphNode` → `openInMarkStudio` (PR #4 handshake); `coerceWebviewToHostMessage` exported |
| `src/graph/webviewHtml.ts` | New | Strict-CSP HTML scaffold |
| `src/messaging/messages.ts` | Edited | `GraphDataMessage` + `OpenGraphNodeMessage` + boundary-guard cases |
| `src/extension.ts` | Edited | Wired `GraphService`; exposed on `MarkStudioExtensionApi` |
| `package.json` | Edited | `markstudio.graph.show` command + `menus.editor/title` entry |
| `esbuild.js` | Edited | 4th lazy target → `dist/graph.js` |
| `src/webview/graph/forceSimulation.ts` | New | Pure F–R simulation, FNV-1a `seedPosition`, kinetic-energy stop |
| `src/webview/graph/render.ts` | New | Canvas2D + DOM labels + per-frame `--vscode-*` token read |
| `src/webview/graph/main.ts` | New | RAF loop, merge-by-path, drag/pan/zoom/hover/click/Esc |
| `test/graph/graphModel.test.ts` | New | 18 unit tests |
| `test/graph/coerceWebviewToHostMessage.test.ts` | New | 11 boundary-guard tests |
| `test/webview/graph/forceSimulation.test.ts` | New | 13 unit tests |
| `test/exthost/suite/graphView.test.ts` | New | 4 exthost tests |
| `test/exthost/index.ts` | Edited | Import the new suite |
| `test/links/linkIndex.test.ts` | Edited | +7 `allEdges` tests |
| `test/messaging/messages.test.ts` | Edited | +9 graph-message guard tests |
| `docs/DECISIONS.md` | Edited | New **ADR-0023** appended |
| `docs/design/graph-view.md` | New | Pre-impl design (data flow, modules, force-sim shape, token map, perf budget) |
| `docs/api/message-protocol.md` | Edited | `graphData` + `openGraphNode` |
| `docs/CHANGELOG.md` | Edited | New `Added` entry for M4.4 |
| `docs/FEATURES.md` | Edited | Graph view row → *Shipped* |
| `docs/ROADMAP.md` | Edited | Phase 4 → *Done* |
| `docs/TODO.md` | Edited | M4.4 → Done; current-focus paragraph flipped to Phase 5 |
| `docs/ARCHITECTURE.md` | Edited | §4 Graph subsystem entries (host + webview) |
| `docs/PROJECT_STATUS.md` | Edited | §1 / §2 / §3 / §4 / §6 / §8 / §9 / §10 |
| `docs/sprint-5/plan.md` | New | Sprint source of truth |
| `docs/sprint-5/progress.md` | New | Live tracker (Phases A → E) |
| `docs/sprint-5/done.md` | New | Sprint handoff |
| `docs/qa/sprint-5-signoff.md` | New | QA sign-off (Ivy) — gate green + F5 ✅ + perf ✅ |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Zero new runtime dependencies for the graph.** d3-force, cytoscape.js, vis-network all rejected. We pay one-time author cost for a small hand-rolled F–R + Canvas2D in exchange for: tiny lazy bundle, no transitive risk, native VS Code theming, full control over the click-to-open handshake.
  * **Recorded as ADR?** Yes → **ADR-0023**.
* **Host model is pure; webview ships as a lazy 4th esbuild bundle.** Mirrors the Mermaid pattern (ADR-0016) — users who never open the graph download zero bytes.
  * **Recorded as ADR?** Yes → **ADR-0023**.
* **Click-to-open must route through `provider.openInMarkStudio`.** The PR #4 pending-reveal handshake is the *only* sanctioned path; never `vscode.window.showTextDocument` (would land in the raw text editor, the lesson behind ADR-0021).
  * **Recorded as ADR?** Yes → **ADR-0023** (and reinforced by ADR-0021).
* **Wiki-link edges only in v1.** T-4.1a (Markdown-link edges) and T-4.1c (heading-level edges) are deferred — they belong to their own tasks; the graph will pick them up for free once they land in `LinkIndex.allEdges()`.
  * **Recorded as ADR?** Yes → **ADR-0023**.
* **No new setting; `markstudio.graph.show` command + editor title-bar action are the only surfaces.** Discussed adding an in-webview toolbar (rejected — mixes UX categories) and an activity-bar entry (rejected — too heavy for a single panel). A `Ctrl+K Ctrl+G` keybinding is deferred pending a discoverability signal.
  * **Recorded as ADR?** Captured in `docs/sprint-5/plan.md` Producer policy + ADR-0023.
* **Deterministic ASCII-codepoint sort, not `localeCompare`.** Phase B caught a real bug: `localeCompare` is locale-dependent and produced different test outputs on different machines. The graph + edge dedup keys use `(a < b ? -1 : a > b ? 1 : 0)` everywhere now.
  * **Recorded as ADR?** Captured in ADR-0023 and the graph-view design doc.

---

## 6. Assumptions Made

* **`vscode.WebviewPanel.reveal()` is idempotent** — calling it on an already-visible panel does not flicker or rebuild the webview (`retainContextWhenHidden: true`).
* **`onDidChangeIndex` is debounced upstream by `LinkIndexService` already**, so the additional 250 ms debounce in `GraphService.scheduleRefresh` is a defence-in-depth coalescer for bursts (e.g. a multi-file rename), not the primary throttle.
* **The webview's `--vscode-*` tokens are stable through the panel's lifetime in a single theme**, so the per-frame `getComputedStyle` read in `readThemeTokens` is cheap (modern browsers cache; we measured no perf impact in the trace).
* **`devicePixelRatio` can change at runtime** (e.g. drag the window to a different monitor) — `fitCanvasToDevicePixels` re-reads it every resize.
* **`Math.random` is forbidden in the simulation** — node seed positions come from a deterministic FNV-1a hash of the path, so layouts are reproducible across sessions for the same vault.

---

## 7. Technical Debt Introduced

* **O(N²) repulsion in the force simulation.** Acceptable to ~1k nodes per the design-doc budget (and the perf trace confirms 100 fps on the working vault). A Barnes–Hut quadtree is the obvious upgrade if a user reports degradation; tracked as an ADR-0023 follow-up.
* **No position persistence across sessions.** Drag-pinned nodes are forgotten when the panel closes. A `Memento`-backed layer is the obvious next step; tracked as an ADR-0023 follow-up.
* **Wiki-link edges only.** T-4.1a / T-4.1c carry-overs (above) cover this — the graph itself needs no further work to render them once `allEdges()` produces them.
* **Full vault matrix not yet executed.** F5 + the perf trace are evidence at the small-vault scale; a 10 / 100 / 1k synthetic vault sweep is the obvious hardening task and would be a good lead-in to a future Barnes–Hut upgrade.
* **No new debt elsewhere.** Carried-over debt is unchanged from the prior handoff.

---

## 8. Blockers

* **None.** All gates green, F5 verified, QA signed off.
* **Next mechanical step:** `git push -u origin feature/sprint-5` followed by `gh pr create`. The Producer (human) then performs the `--no-ff` merge to `main`. **Producer does not merge their own PR** — that's the human's job.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host `dist/extension.js` **~65.5 kB**, preview `dist/webview.js` ~2.0 MB (unchanged), Mermaid `dist/mermaid.js` ~7.5 MB (unchanged), **new** `dist/graph.js` **19.3 kB**
* [x] `npm test` passes — **322 tests** (257 unit + 65 integration, `node:test`)
* [x] `npm run test:exthost` passes — **13** Extension Host tests
* [x] **Manual verification in an Extension Development Host (F5)** — user-confirmed "all good": graph opens via command palette + editor title-bar action; pan / wheel-zoom around cursor / drag-pin / hover-highlight / click-to-open (lands in MarkStudio) / Escape-reset / theme-switch all behave.
* [x] **Perf trace** — median 100 fps / p95 50 fps / 1.9 % slow frames; exceeds the 60-fps budget. User confirmed "yes mark it done all good".
* [x] **QA sign-off** written: `docs/qa/sprint-5-signoff.md`.
* [x] Webview panel is not recreated on data refresh; `retainContextWhenHidden: true` preserves the simulation state across hide/show.

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-5` to `main` (post `gh pr create` + human `--no-ff` merge), **Phase 4 is closed** and the next focus is **Phase 5 — Authoring Workflows** per [ROADMAP.md](ROADMAP.md) §5: templates, snippets, daily notes, workspace note features.
* **Alternative smaller next tasks:** the two carry-over Phase 4 follow-ups — **T-4.1a (Markdown-link edges in the link index)** and **T-4.1c (heading-level edges)**. Both are resolver-backed; the Graph view will pick them up for free once they appear in `LinkIndex.allEdges()`.
* **Why Phase 5:** Phase 4 (Knowledge Management) is now complete on this branch; the natural next theme is authoring ergonomics that build on the now-stable PKM layer.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) §5 — Phase 5 milestones
  * `src/links/LinkIndexService.ts` — for T-4.1a / T-4.1c, the surface to extend
  * `src/graph/graphModel.ts` + `src/graph/GraphService.ts` — for any graph follow-ups (Barnes–Hut, position persistence, etc.)

---

## 11. Open Questions for the Next Agent

* **Should drag-pinned node positions persist across panel close / VS Code restart** via `Memento`? If yes, scope it per workspace folder (multi-root) or per vault root.
* **Should the graph offer a "focus mode"** that hides nodes outside N hops from the active document? (The 1-hop hover highlight is the lightweight precursor.)
* **Should we add a Barnes–Hut quadtree** now (preemptively, to push the perf headroom to ~10k nodes), or wait for a user report?
* **Should `Ctrl+K Ctrl+G` be reserved as the graph-open keybinding** if discoverability ever becomes a complaint, or is the editor title-bar action enough?
* **Should the graph also render Markdown-link edges** as soon as T-4.1a lands, or stay wiki-link only by design? (The current `allEdges()` getter would expose them automatically — opt-in or opt-out.)
* **Should `markstudio.preview.wikiLinks = false` also hide wiki-link edges in the graph**, for consistency? (Currently the graph is always all-on; the toggle only gates the preview anchors.)
