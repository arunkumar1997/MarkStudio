# Sprint 2 — Progress Tracker (T-4.1 / M4.1 Backlinks panel)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Plan: [plan.md](plan.md). Goal: native Backlinks tree view backed by an async host-side wiki-link index.

---

## Status: NOT STARTED — planned & delegated by Producer (Remy) 2026-06-27

| Phase | State | Owner | Notes |
|---|---|---|---|
| 1 · `parseWikiTargets.ts` (pure target extractor) | ☐ Todo | Sage | mirror T-3.4 syntax rules |
| 2 · `linkIndex.ts` (reverse index + basename resolver) | ☐ Todo | Sage | deferred Phase 3 resolver lands here |
| 3 · `LinkIndexService.ts` (async scan + watcher + debounce) | ☐ Todo | Sage | must not block activation |
| 4 · `BacklinksTreeProvider.ts` + `registerBacklinks.ts` | ☐ Todo | Sage | mirror outline pattern (ADR-0014) |
| 5 · Wire `extension.ts` + `package.json` (view + command) | ☐ Todo | Sage | |
| 6 · ADR-0020 + design/backlinks.md | ☐ Todo | Sage + Producer | |
| 7 · Unit tests (parseWikiTargets + linkIndex/resolver) | ☐ Todo | Ivy | pure, mock-free |
| 8 · Manual EDH (multi-file, update-on-change, click-to-open, large-workspace) | ☐ Todo | Ivy | |
| 9 · Docs pass + ROADMAP M4.1 → Done | ☐ Todo | Sage + Producer | |
| 10 · QA sign-off `docs/qa/sprint-2-signoff.md` | ☐ Todo | Ivy | gates merge |

## Decisions log
* 2026-06-27 — Producer: wiki-links only count as backlinks in v1 (Markdown links = follow-up).
* 2026-06-27 — Producer: case-insensitive basename resolution; path-qualified targets resolve relative first.
* 2026-06-27 — Producer: no new setting — panel mirrors the Outline (active-doc scoped, always available).
* 2026-06-27 — Producer: file-level grouping; `#heading` captured but not resolved this sprint.

## Open items
* Confirm `FileSystemWatcher` glob + exclude strategy scales (ADR-0020).
