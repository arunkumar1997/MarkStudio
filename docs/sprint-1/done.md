# Sprint 1 — DONE (T-3.5 Footnotes & GFM completeness · M3.5)

> Sprint-end handoff. Merged to `main` by Producer (Remy) on 2026-06-27.
> Canonical project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).

---

## Outcome: ✅ Shipped — Phase 3 complete

T-3.5 delivered footnotes, GFM task lists, tables, and strikethrough in the preview, each individually toggleable and degrading gracefully when off. **M3.5 met → Phase 3 — Modern Markdown is Done.**

## Merge record
* Merge commit: `62d8f38` (`--no-ff`) — preserves the four T-3.5 commits + the QA test commit.
* Branch `feature/sprint-1` (`2139afa`) merged into `main`; pushed `b5546d7..62d8f38`.
* Regular merge — no squash, no rebase (plan §8).

## What shipped
* 4 settings (`markstudio.preview.footnotes` / `taskLists` / `tables` / `strikethrough`), default `true`, resource scope.
* **ADR-0019**: tables + strikethrough via markdown-it built-ins (no dep); task lists dependency-free in-tree rule ([taskLists.ts](../../src/webview/preview/taskLists.ts)); footnotes via the one new dep `markdown-it-footnote`.
* Task-list checkboxes render **disabled** (no source write-back this sprint).

## Verification at merge
* Lint ✅ · typecheck ✅ · build ✅ (webview +16 KB).
* Tests: unit **94**, integration **39**, exthost **4** — all green.
* Manual EDH (F5): footnotes, disabled task checkboxes, tables, strikethrough, and live toggle-off degradation confirmed by the maintainer (dark theme screenshot verified; light/HC spot-checked).
* QA sign-off: [docs/qa/sprint-1-signoff.md](../qa/sprint-1-signoff.md) — PASS with notes.

## Cleanup / housekeeping
* Discarded a stray formatter regression (4-space reindent + missing final newline in `package.json`, `PreviewRenderer.ts`, `taskLists.ts`, `previewRenderer.test.ts`) before merge — restored to the validated committed state; lint re-confirmed green.

## Follow-ups (non-blocking, for the backlog)
* Mixed lists drop bullet markers on plain items inside a task list (matches GitHub behaviour) — confirm intended or scope a CSS refinement.
* Task-list checkbox source write-back (interactive toggle from preview) — Phase 4-style interaction, deliberately out of scope.
* `markdown-it-footnote` label inline-markdown rendering — same conservative posture as wiki-link labels.

## Next
Phase 3 is closed. Next initiative is **Phase 4 — Knowledge Management** (M4.1 Backlinks panel) per [ROADMAP.md](../ROADMAP.md). The Phase 3 `data-wikilink-target` / `data-wikilink-heading` groundwork (T-3.4) feeds the Phase 4 resolver.
