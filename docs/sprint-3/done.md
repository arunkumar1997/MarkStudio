# Sprint 3 — DONE (T-4.1b In-preview wiki-link navigation)

> Sprint-end handoff. Merged to `main` by Producer (Remy) on 2026-06-30.
> Canonical project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).

---

## Outcome: ✅ Shipped — Phase 4 continues

T-4.1b made the wiki-links the preview renders (T-3.4) **clickable**: clicking `[[note]]` / `[[note|alias]]` / `[[note#heading]]` in the live preview resolves through the shared M4.1 index and opens the target note (revealing the heading line when present) — the in-document counterpart to the M4.1 Backlinks panel. **Next milestone: M4.2 — Hover preview for links.**

## Merge record
* Merge commit: `011901e` (`--no-ff`) — preserves the T-4.1b feature, fix, and docs commits.
* Branch `feature/sprint-3` (`b45b3ee`) merged into `main`; regular merge — no squash, no rebase.
* Feature `ae6158b` · docs `3731288` · QA sign-off `cf4a3c6` · #2 fix `51aea4f` · QA re-verify `b45b3ee`.

## What shipped
* `src/webview/preview/wikiLinkClick.ts` (new) — one **delegated** click listener on the persistent preview pane posts a typed `openWikiLink` webview → host message.
* `src/messaging/messages.ts` — `OpenWikiLinkMessage` (`target`, `heading`) added to the union with a boundary guard.
* `src/links/linkIndex.ts` + `LinkIndexService.ts` — pure `resolveForward` + `resolveTarget` URI wrapper; panel and click-nav resolve identically (basename, relative-first, open-first on ambiguity, self-match kept for nav).
* `src/extension.ts` — a single `LinkIndexService` hoisted and injected into both the Backlinks panel and the editor provider; one workspace scan.
* `src/editor/MarkStudioEditorProvider.ts` — host `openWikiLink` handler: resolve → heading-scan (`findHeadingLine`) → open-at-line; unresolved/unopenable degrade to a transient status-bar message. **ADR-0021.**
* **No new dependency, no new setting, no new command** — gated by the existing `markstudio.preview.wikiLinks`.

## Verification at merge
* Lint ✅ (eslint `--max-warnings 0` + prettier `--check`) · typecheck ✅ · typecheck:test ✅ · build ✅ (host bundle ~44.5 KB; webview seam unchanged).
* Tests: unit **152**, integration **45** (197 total) + exthost **4** — all green on the merged `main`.
* QA sign-off: [docs/qa/sprint-3-signoff.md](../qa/sprint-3-signoff.md) — PASS, re-verified after the #2 fix.
* Manual EDH (F5): §5 matrix run on a multi-file workspace (open-by-name, alias, heading, heading-miss, ambiguous, unresolved, same-doc inert, toggle-off, persistence, theme matrix) incl. the **#2 delete-mid-debounce repro** — all pass (maintainer).

## Defects
* **#2** — `openWikiLink` leaked an unhandled rejection when a resolved target failed to open (race: file deleted inside the watcher debounce window). **Fixed** in `51aea4f` (try/catch → same graceful status-bar fallback as the unresolved path); confirmed by the §5 EDH repro. Closes via "Fixes #2".

## Follow-ups (tracked in TODO.md / ADR-0021)
* **M4.2 — Hover preview for links** — the natural Sprint 4 candidate; resolver-backed, builds directly on this sprint's click primitive.
* **T-4.1a — Markdown-link backlinks** (`[text](note.md)`): second extractor feeding the same index.
* **T-4.1c — Heading-level backlinks:** resolve `#heading` rather than only capturing it.
* ADR-0021 refinements: quick-pick disambiguation on ambiguous basenames; click-to-create for unresolved targets; slug-based heading matching; same-document `[[#heading]]` navigation.

## Next
Phase 4 continues. Recommended **Sprint 4 = M4.2 — Hover preview for links**.
