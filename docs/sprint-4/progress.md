# Sprint 4 — Progress Tracker (M4.2 / Hover preview for links)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-4/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: hovering a `[[note]]` in the preview shows a floating card previewing the target (rendered markdown excerpt, `#heading` section when present).

---

## Status: DONE (dev) — implementation + tests + docs complete; awaiting QA F5 sign-off + Producer merge (2026-06-30)

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| 1 | `messages.ts` — `requestLinkPreview` (+ guard) + `linkPreviewContent` | ✅ Done | Sage | W→H request + H→W response; both guarded |
| 2 | `linkExcerpt.ts` — pure capped excerpt + heading-section slice | ✅ Done | Sage | reuses `parseHeadings` / `findHeadingLine`; cap 60 lines / 2000 chars |
| 3 | Host `requestLinkPreview` handler — resolve + read + excerpt → `linkPreviewContent` | ✅ Done | Sage | shared `resolveTarget`; open-first; read wrapped in try/catch → `missing` (defect-#2 lesson) |
| 4 | `wikiLinkHover.ts` — delegated hover + dwell timer + request + cancel | ✅ Done | Nova | one listener on `shell.previewPane` |
| 5 | `HoverCard.ts` — floating card (position, theme, render via renderer, show/hide) | ✅ Done | Nova | hover-widget tokens; dismiss on leave/scroll/Esc; renders via shared renderer (`html:false`) |
| 6 | `main.ts` wiring + route `linkPreviewContent`; ignore stale responses | ✅ Done | Nova | latest-target guard |
| 7 | ADR-0022 + `design/wiki-hover.md` | ✅ Done | Sage + Producer | text-not-HTML; two new messages |
| 8 | Unit + integration tests (excerpt, guard, hover→request seam, content→card) | ✅ Done | Ivy | unit 152→172 (+20); integration 45→52 (+7) |
| 9 | Manual EDH (F5): hover matrix, missing/ambiguous, dismiss, theme matrix, toggle off | ☐ Todo | Ivy | human-only spot-check |
| 10 | Docs pass + TODO M4.2 → Done + QA sign-off | ✅ Done (docs) | Sage + Producer | `api/message-protocol.md`, CHANGELOG, FEATURES, ROADMAP, TODO, ARCHITECTURE, PROJECT_STATUS, AGENT_HANDOFF; QA sign-off is Ivy's |

## Verification (local)
* `npm run lint` ✅ (eslint `--max-warnings 0` + prettier; one `prettier --write` pass on the 6 new/edited files — recurring formatter drift) · `npm run typecheck` ✅ · `npm run typecheck:test` ✅ · `npm run build` ✅ (host bundle ~44.5 KB → ~47.6 KB)
* `npm test` ✅ — **172 unit + 52 integration** · `npm run test:exthost` ✅ — 4 (228 automated total, 0 failures)

## Commits
* `31c061e` — `feat: hover preview for wiki-links in the preview (M4.2)` (implementation + tests)
* docs commit — Phase 7/10 documentation pass (ADR-0022, design note, message protocol, status/handoff, etc.)

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
