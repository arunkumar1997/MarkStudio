# Sprint 6 — Progress Tracker (T-4.1a + T-4.1c)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-6/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: close the two Phase 4 carry-overs (Markdown-link backlinks + heading-level backlinks); fully close Phase 4.

---

## Status: ✅ Sprint 6 COMPLETE — PR ready on `feature/sprint-6` (pending Producer `--no-ff` merge)

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0024 + `design/backlinks.md` v2 section** | ✅ Done | Remy / Sage | Plan, ADR-0024, and design v2 section landed on `feature/sprint-6` |
| 1 | `parseMarkdownTargets.ts` — pure extractor + tests | ✅ Done | Sage | Mirrors `parseWikiTargets.ts` shape; +33 unit tests |
| 2 | `linkIndex.ts` — `NoteLink.kind`, `Backlink.targetLine`, heading-line cache, `resolveMarkdownTarget` | ✅ Done | Sage | Additive widening only; per-build cache keyed `${targetPath}\u0000${heading}` |
| 3 | `LinkIndexService.ts` — dual-parse merge | ✅ Done | Sage | No new event, no new watcher; threads source text through `ParsedNote.text` |
| 4 | `BacklinksTreeProvider.ts` — `iconPath` per kind, heading description, tooltip target-line | ✅ Done | Milo (visual) + Sage | `$(symbol-reference)` wiki / `$(link)` markdown |
| 5 | Unit tests: extractor + index + heading cache + backwards-compat | ✅ Done | Ivy | +49 unit (33 extractor + 7 T-4.1a + 9 T-4.1c) |
| 6 | Integration-style test: mixed-kind fixture vault | ✅ Done | Ivy | +10 in `test/links/backlinksTreeProvider.test.ts`; widened `test/_mocks/vscode.ts` |
| 7 | Docs pass | ✅ Done | Sage + Remy | ADR-0024, design v2 section, status/handoff/roadmap/todo/features/changelog/architecture/done/sign-off |
| 8 | Manual F5: mixed vault, theme matrix, graph picks up Markdown edges | ⏳ Producer-owned | Producer | Per `plan.md` §6 row "D" |

## Verification (local)

- `npm run lint` — ✅ clean as of Phase D
- `npm run typecheck` — ✅ clean as of Phase D
- `npm run typecheck:test` — ✅ clean as of Phase D
- `npm run build` — ✅ clean as of Phase D (no production-bundle delta from Phase D)
- `npm test` — ✅ 316 unit + 65 integration (baseline 257 + 65 → +33 unit Phase B + +16 unit Phase C + +10 integration-style Phase D)
- `npm run test:exthost` — ✅ 13 (unchanged — no new host surface)

## Commits

* `2fb1537` — `docs(sprint-6): plan + progress tracker` — sprint plan + tracker landed on `feature/sprint-6`.
* `c0c27d5` — `docs(sprint-6): ADR-0024 + design v2 section (Phase A)` — Phase A close-out.
* `7eb1dcf` — `feat(links): Markdown-link backlinks (T-4.1a, Phase B)` — Phase B close-out.
* `752a6ac` — `feat(links): heading-level backlinks (T-4.1c, Phase C)` — Phase C close-out.
* `bcc3edf` — `test(links): Backlinks tree pipeline coverage (Phase D)` — Phase D close-out.
* `9121623` — `docs(sprint-6): close-out + QA sign-off (Phase E)` — Phase E close-out.

## Bundle sizes (running)

| Bundle | Baseline (post-Sprint-5) | After Sprint 6 | Delta |
|---|---|---|---|
| `dist/extension.js` | 65.5 kB | 74.9 kB (Phase C) | +9.4 kB total (Phase B +7.9 kB for `parseMarkdownTargets` CommonMark grammar; Phase C +1.5 kB for heading-line cache + `composeBacklink` widening. Over plan §7's ~+2 kB target by design — the Markdown parser is the bulk and is non-negotiable.) |
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
