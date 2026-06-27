# Sprint 3 — Progress Tracker (T-4.1b / In-preview wiki-link navigation)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-3/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Goal: clicking a `[[target]]` in the preview resolves via the M4.1 host resolver and opens the note (at `#heading` when present).

---

## Status: IN PROGRESS — implementation + tests done; docs next (2026-06-27)

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| 1 | `messages.ts` — `OpenWikiLinkMessage` + boundary guard | ✅ Done | Sage | `target: string`, `heading: string \| null`; guard added |
| 2 | `linkIndex.ts` pure `resolveForward` + `LinkIndexService.resolveTarget` URI wrapper | ✅ Done | Sage | unified resolver — panel + click share `resolveTarget`; self kept for nav; `findHeadingLine` added to `headings.ts` |
| 3 | Hoist single `LinkIndexService` to `extension.ts`; inject into panel + editor provider | ✅ Done | Sage | one index; `start()`/dispose owned by `extension.ts` |
| 4 | Host `openWikiLink` handler — resolve + heading-scan + open-at-line | ✅ Done | Sage | open-first on ambiguity; status-bar msg on miss; reuses `showTextDocument` + `findHeadingLine` |
| 5 | Webview delegated click handler on the preview root | ✅ Done | Nova | new `wikiLinkClick.ts`; one listener on `shell.previewPane`; inert for empty target |
| 6 | ADR (shared index / new message) + `design/wiki-navigation.md` | ☐ Todo | Sage + Producer | next |
| 7 | Unit + integration tests (resolver, guard, heading, click→message seam) | ✅ Done | Ivy | unit 132→152 (+20); integration 39→45 (+6); exthost 4 |
| 8 | Manual EDH (F5): click target/alias/heading, ambiguous, unresolved, theme matrix | ☐ Todo | Ivy | post-merge spot-check |
| 9 | Docs pass + TODO T-4.1b → Done + QA sign-off | ☐ Todo | Sage + Producer | incl. `api/message-protocol.md` |

## Verification (local)
* `npm run typecheck` ✅ · `npm run typecheck:test` ✅ · `npm run build` ✅ (host bundle 40.4 KB → 44.0 KB; webview unchanged seam)
* `npm test` ✅ — **152 unit + 45 integration** · `npm run test:exthost` ✅ — 4
* `npm run lint` ✅ (ESLint `--max-warnings 0` + Prettier; one Prettier `--write` pass applied to 2 files)

## Decisions log
* 2026-06-27 — Producer: resolve relative to the **active note** (same as the Backlinks panel).
* 2026-06-27 — Producer: **open-first** on ambiguous basename; quick-pick disambiguation is a follow-up.
* 2026-06-27 — Producer: navigate to **existing notes only** (no click-to-create) this sprint.
* 2026-06-27 — Producer: **one shared `LinkIndexService`** (hoist to `extension.ts`); no second index/scan.
* 2026-06-27 — Producer: **no new setting** — gated by the existing `markstudio.preview.wikiLinks`.
* 2026-06-27 — Dev (Sage): **unified the resolver** — exposed `resolveForward` on the existing `LinkIndex` so panel and click-nav share one implementation (resolves plan §9 Q1). Forward resolution keeps a self-match (clicking `[[A]]` in A opens A); the backlink build still drops self.
* 2026-06-27 — Dev (Sage): unresolved target → transient `window.setStatusBarMessage` (4 s), no modal.

## Bugs found
| # | Description | Severity | Status | Fix |
|---|---|---|---|---|
| — | _(none)_ | | | |

## Open items
* Manual F5: confirm the delegated listener survives a `setContent` reconcile (bound once to `shell.previewPane`, which is never replaced — expected to hold).
* Heading match is exact (case-insensitive, trimmed) on the raw heading source text; inline-Markdown headings (`## **Bold**`) won't match a plain `#Bold` target — acceptable v1, noted for a future slugify pass.
