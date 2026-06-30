# Sprint 4 — Progress Tracker (M4.2 / Hover preview for links)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-4/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: hovering a `[[note]]` in the preview shows a floating card previewing the target (rendered markdown excerpt, `#heading` section when present).

---

## Status: PLANNED — Producer plan written; branch `feature/sprint-4` created; dev kickoff delegated (2026-06-30)

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| 1 | `messages.ts` — `requestLinkPreview` (+ guard) + `linkPreviewContent` | ☐ Todo | Sage | W→H request + H→W response; plain JSON |
| 2 | `linkExcerpt.ts` — pure capped excerpt + heading-section slice | ☐ Todo | Sage | reuse `parseHeadings` / `findHeadingLine` |
| 3 | Host `requestLinkPreview` handler — resolve + read + excerpt → `linkPreviewContent` | ☐ Todo | Sage | shared `LinkIndexService.resolveTarget`; open-first; missing → status |
| 4 | `wikiLinkHover.ts` — delegated hover + dwell timer + request + cancel | ☐ Todo | Nova | one listener on `shell.previewPane` |
| 5 | `HoverCard.ts` — floating card (position, theme, render via renderer, show/hide) | ☐ Todo | Nova | hover-widget tokens; dismiss on leave/scroll/Esc |
| 6 | `main.ts` wiring + route `linkPreviewContent`; ignore stale responses | ☐ Todo | Nova | |
| 7 | ADR-0022 + `design/wiki-hover.md` | ☐ Todo | Sage + Producer | text-not-HTML; two new messages |
| 8 | Unit + integration tests (excerpt, guard, hover→request seam, content→card) | ☐ Todo | Ivy | |
| 9 | Manual EDH (F5): hover matrix, missing/ambiguous, dismiss, theme matrix, toggle off | ☐ Todo | Ivy | human-only spot-check |
| 10 | Docs pass + TODO M4.2 → Done + QA sign-off | ☐ Todo | Sage + Producer | incl. `api/message-protocol.md` |

## Verification (local)
* _(to be filled by dev)_ `npm run lint` · `npm run typecheck` · `npm run typecheck:test` · `npm run build` · `npm test` · `npm run test:exthost`

## Commits
* _(to be filled by dev)_

## Decisions log
* 2026-06-30 — Producer: host returns markdown **text**, not HTML; the webview renders it (theming + `html: false` safety + consistency).
* 2026-06-30 — Producer: excerpt cap ~60 lines / ~2,000 chars; `#heading` slices that section, else top of note.
* 2026-06-30 — Producer: **open-first** on ambiguity (consistent with click-nav); no quick-pick.
* 2026-06-30 — Producer: **no new setting** this sprint (gated by `markstudio.preview.wikiLinks`); revisit if intrusive.
* 2026-06-30 — Producer: static snapshot at hover time; no live re-render, no nested hover, no prefetch/LRU.

## Bugs found
| # | Description | Severity | Status | Fix |
|---|---|---|---|---|
| — | _(none yet)_ | | | |

## Open items
* See plan §9: own setting? missing-target UX (quiet card vs. no-op); card placement geometry; dwell/hide timings — all to be confirmed in the F5 pass.
