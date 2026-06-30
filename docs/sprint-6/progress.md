# Sprint 6 — Progress Tracker (T-4.1a + T-4.1c)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-6/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: close the two Phase 4 carry-overs (Markdown-link backlinks + heading-level backlinks); fully close Phase 4.

---

## Status: � Phase A (design) — COMPLETE → Phase B (T-4.1a host) up next

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0024 + `design/backlinks.md` v2 section** | ✅ Done | Remy / Sage | Plan, ADR-0024, and design v2 section landed on `feature/sprint-6` |
| 1 | `parseMarkdownTargets.ts` — pure extractor + tests | ⬜ Not started | Sage | Mirror `parseWikiTargets.ts` shape |
| 2 | `linkIndex.ts` — `NoteLink.kind`, `Backlink.targetLine`, heading-line cache, `resolveMarkdownTarget` | ⬜ Not started | Sage | Additive widening only |
| 3 | `LinkIndexService.ts` — dual-parse merge | ⬜ Not started | Sage | No new event, no new watcher |
| 4 | `BacklinksTreeProvider.ts` — `iconPath` per kind, heading description, tooltip target-line | ⬜ Not started | Milo (visual) + Sage | `$(symbol-reference)` wiki / `$(link)` markdown |
| 5 | Unit tests: extractor + index + heading cache + backwards-compat | ⬜ Not started | Ivy | Target ~+30 unit |
| 6 | Integration test: mixed-kind fixture vault | ⬜ Not started | Ivy | Target +5 integration |
| 7 | Docs pass | ⬜ Not started | Sage + Remy | ADR-0024, design v2 section, status/handoff/roadmap/todo/features/changelog/architecture |
| 8 | Manual F5: mixed vault, theme matrix, graph picks up Markdown edges | ⬜ Not started | Ivy + human | After Phase D |

## Verification (local)

- `npm run lint` — pending
- `npm run typecheck` — pending
- `npm run typecheck:test` — pending
- `npm run build` — pending
- `npm test` — pending (baseline 257 unit + 65 integration)
- `npm run test:exthost` — pending (baseline 13)

## Commits

* `2fb1537` — `docs(sprint-6): plan + progress tracker` — sprint plan + tracker landed on `feature/sprint-6`.
* _(Phase A finish)_ — `docs(sprint-6): ADR-0024 + design v2 section (Phase A)` — to be recorded after the commit.

## Bundle sizes (running)

| Bundle | Baseline (post-Sprint-5) | After Sprint 6 | Delta |
|---|---|---|---|
| `dist/extension.js` | 65.5 kB | _pending_ | _pending_ |
| `dist/webview.js` | 2.0 MB | unchanged | 0 |
| `dist/mermaid.js` | 7.5 MB | unchanged | 0 |
| `dist/graph.js` | 19.3 kB | unchanged | 0 |

## Decisions log

* 2026-06-30 — Producer: **one sprint covers both T-4.1a + T-4.1c** — they share `linkIndex.ts` / `LinkIndexService.ts` / `BacklinksTreeProvider.ts`; splitting would force a second touch.
* 2026-06-30 — Producer: **Markdown-link resolution is explicit-path only** (no basename fallback — that's a wiki affordance).
* 2026-06-30 — Producer: **Heading-level granularity stays in the index + Backlinks panel only**; the Graph view stays note-level (ADR-0023 unchanged).
* 2026-06-30 — Producer: **Widen, do not refactor** — `NoteLink.kind` is additive; no rename / split / second index.
* 2026-06-30 — Producer: **No new dependency, no new setting, no new command, no new message.**
* 2026-06-30 — Producer: **Backlinks panel stays flat** in v1; heading anchor surfaces as description suffix only, not as a grouping mode.
* 2026-06-30 — Producer: **Edge weight collapses across both kinds** in v1; per-kind split is a deferred follow-up.

## Open questions (carry from plan.md §9 — resolve during the sprint)

* Surface a Markdown link's `title` attribute in the Backlinks tooltip? Default: no.
* Treat `[text](note.md)` (no `./`) as relative-to-source? Default: yes (CommonMark).
* Heading anchor lookup: slug-normalised or literal? Default: keep `findHeadingLine` as-is.
* Reflect heading anchor on Graph view node tooltip? Default: no.
