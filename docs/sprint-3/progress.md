# Sprint 3 — Progress Tracker (T-4.1b / In-preview wiki-link navigation)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-3/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: clicking a `[[target]]` in the preview resolves via the M4.1 host resolver and opens the note (at `#heading` when present).

---

## Status: NOT STARTED — planned & delegated by Producer (Remy) 2026-06-27

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| 1 | `messages.ts` — `OpenWikiLinkMessage` + boundary guard | ☐ Todo | Sage | first protocol add since `revealLine` |
| 2 | `linkIndex.ts` pure `resolveTarget` + `LinkIndexService.resolveTarget` URI wrapper | ☐ Todo | Sage | mirror `backlinksFor` resolution |
| 3 | Hoist single `LinkIndexService` to `extension.ts`; inject into panel + editor provider | ☐ Todo | Sage | one index, no second scan |
| 4 | Host `openWikiLink` handler — resolve + heading-scan + open-at-line | ☐ Todo | Sage | reuse `openSourceAtLine` + `src/outline/headings.ts` |
| 5 | Webview delegated click handler on the preview root | ☐ Todo | Nova | one listener, no per-anchor binding |
| 6 | ADR (shared index / new message) + `design/wiki-navigation.md` | ☐ Todo | Sage + Producer | |
| 7 | Unit + integration tests (resolver, guard, click→message seam) | ☐ Todo | Ivy | pure where possible |
| 8 | Manual EDH (F5): click target/alias/heading, ambiguous, unresolved, theme matrix | ☐ Todo | Ivy | |
| 9 | Docs pass + TODO T-4.1b → Done + QA sign-off | ☐ Todo | Sage + Producer | incl. `api/message-protocol.md` |

## Decisions log
* 2026-06-27 — Producer: resolve relative to the **active note** (same as the Backlinks panel).
* 2026-06-27 — Producer: **open-first** on ambiguous basename; quick-pick disambiguation is a follow-up.
* 2026-06-27 — Producer: navigate to **existing notes only** (no click-to-create) this sprint.
* 2026-06-27 — Producer: **one shared `LinkIndexService`** (hoist to `extension.ts`); no second index/scan.
* 2026-06-27 — Producer: **no new setting** — gated by the existing `markstudio.preview.wikiLinks`.

## Bugs found
| # | Description | Severity | Status | Fix |
|---|---|---|---|---|
| — | _(none yet)_ | | | |

## Open items
* Confirm the delegated listener survives a `setContent` reconcile (bind once to the persistent preview root).
* Decide whether the panel routes through the same unified pure resolver (preferred — record in ADR).
