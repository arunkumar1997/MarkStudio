# Sprint 2 — DONE (T-4.1 Backlinks panel · M4.1)

> Sprint-end handoff. Merged to `main` by Producer (Remy) on 2026-06-27.
> Canonical project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).

---

## Outcome: ✅ Shipped — Phase 4 begun

T-4.1 delivered the **Backlinks panel** (native `MarkStudio Backlinks` Explorer tree view) plus the **wiki-link resolver** deferred from Phase 3. **M4.1 met → Phase 4 — Knowledge Management is under way.**

## Merge record
* Merge commit: `79369f2` (`--no-ff`) — preserves the four T-4.1 commits.
* Branch `feature/sprint-2` (`6311ad7`) merged into `main`; pushed `71b5723..79369f2`.
* Regular merge — no squash, no rebase.

## What shipped
* `src/links/` — pure `parseWikiTargets.ts` + `linkIndex.ts` (resolver), I/O in `LinkIndexService.ts` (non-blocking scan + `FileSystemWatcher` + 250 ms debounce + incremental), `BacklinksTreeProvider.ts`, `registerBacklinks.ts`.
* Native `markstudio.backlinks` Explorer view; click a backlink → opens the source at the linking line.
* Case-insensitive basename, path-qualified relative-first, no self-link, per-line dedupe. **ADR-0020**.
* **No new dependency, no new setting, no protocol change** — entirely host-side.

## Verification at merge
* Lint ✅ · typecheck ✅ · build ✅ (host +15 KB; webview unchanged).
* Tests: unit **132**, integration **39**, exthost **4** — 175 total, all green.
* Manual EDH (F5): backlinks list/snippet, click-to-open at line, live create/change/delete updates, case-insensitive + path-qualified resolution confirmed by the maintainer.
* QA sign-off: [docs/qa/sprint-2-signoff.md](../qa/sprint-2-signoff.md) — PASS with notes.

## Cleanup / housekeeping
* Discarded recurring stray formatter drift (4-space reindent of `test/links/*.test.ts`) twice before commit/merge — restored to the validated state; lint re-confirmed green each time.
* Recovered a failed handoff write (the dev session's `create_file` collided with the existing `AGENT_HANDOFF.md`, leaving a T-4.1 header on a T-3.5 body) — rewritten to consistent T-4.1 content.
* Temporary `samples/backlinks-demo/` notes (used for the manual F5 pass) were deleted at the maintainer's request.

## Follow-ups (tracked in TODO.md)
* **T-4.1b — In-preview wiki-link navigation:** clicking a `[[note]]` *inside the preview* opens the resolved note (the most-requested next step; reuses this resolver, needs a webview → host message). **This is the natural Sprint 3 candidate.**
* **T-4.1a — Markdown-link backlinks** (`[text](note.md)`): second extractor feeding the same index; also enables clickable Markdown links in the preview.
* **T-4.1c — Heading-level backlinks:** resolve `#heading` rather than only capturing it.

## Recurring environment note
A local editor formatter keeps reintroducing 4-space indentation / stripped final newlines that fight the project's Prettier standard (2-space + final newline). Recommend aligning the workspace formatter settings to `.prettierrc.json` to stop the repeated drift.

## Next
Phase 4 continues. Recommended Sprint 3 = **T-4.1b (in-preview wiki-link navigation)** — directly addresses the "clicking a link in the preview should open it" expectation surfaced during the F5 pass — then **M4.2 — Hover preview for links**.
