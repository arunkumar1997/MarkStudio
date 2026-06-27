# AGENT HANDOFF — T-4.1b In-preview wiki-link navigation done on `feature/sprint-3` (2026-06-28)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-28
* **Agent / Author:** Dev Team (Sage — host resolver + messaging; Nova — webview click handler)
* **Working branch:** `feature/sprint-3` (off `main` `14cccd7`)
* **Last commit on `main`:** `14cccd7` *(Sprint 3 planning; T-4.1 merged via `--no-ff` merge `79369f2`)*
* **Branch state:** `feature/sprint-3` carries the T-4.1b feature commit + this docs commit; **not merged** — Producer merges after QA sign-off.
* **Prompt used:** ai-team-dev mode (Sprint 3 kickoff)

---

## 1. What Was Completed

Implemented **T-4.1b — In-preview wiki-link navigation** (Phase 4), making the wiki-links the preview already renders (T-3.4) **clickable**: clicking `[[note]]` / `[[note|alias]]` / `[[note#heading]]` in the preview opens the target note in an editor and reveals the heading line — the in-document counterpart to the M4.1 Backlinks panel. The webview detects the click and delegates; the **host** resolves through the **shared M4.1 index** and navigates.

* **`src/messaging/messages.ts` (edited).** New `OpenWikiLinkMessage` (`type: "openWikiLink"`, `target: string`, `heading: string | null`) added to the `WebviewToHostMessage` union, with a boundary-guard case in `isWebviewToHostMessage` (validates `target` is a string, `heading` is string-or-null). The first webview-originated navigation message.
* **`src/links/linkIndex.ts` (edited).** New **pure** `LinkIndex.resolveForward(fromPath, target): string[]` — a public wrapper over the private `resolveTarget` the backlink build already used. The Backlinks panel and click-navigation now resolve through the **same** code; forward resolution **keeps** the self-match (clicking `[[A]]` in A opens A), unlike the backlink build which drops self.
* **`src/links/LinkIndexService.ts` (edited).** New `resolveTarget(fromUri, target): vscode.Uri[]` URI wrapper around `resolveForward`.
* **`src/outline/headings.ts` (edited).** New **pure** `findHeadingLine(text, heading): number` — case-insensitive trimmed exact match on raw heading source; `-1` on miss. Lives with the outline scanner since both reason about heading lines.
* **`src/links/registerBacklinks.ts` (edited).** Signature changed to `registerBacklinks(provider, service)`; the `LinkIndexService` is now **injected** rather than constructed/started internally (the returned disposable no longer owns the service).
* **`src/extension.ts` (edited).** Creates the **single** `LinkIndexService`, calls `start()`, injects it into `register()` and `registerBacklinks()`, and disposes it via `context.subscriptions` — one workspace scan + one live index shared by the panel and click-navigation.
* **`src/editor/MarkStudioEditorProvider.ts` (edited).** Takes the injected `linkIndexService`; adds the `openWikiLink` case to the message-bus switch + a private `async openWikiLink(fromUri, target, heading)` (resolve → **open-first** on ambiguity → `showTextDocument` → reveal heading via `findHeadingLine`; unresolved → `window.setStatusBarMessage(…, 4000)`).
* **`src/webview/preview/wikiLinkClick.ts` (new).** `registerWikiLinkClicks(previewRoot, bus)`: one **delegated** `click` listener on the persistent preview pane using `Element.closest('a.markstudio-wikilink')`, reading `data-wikilink-target` / `data-wikilink-heading`, `preventDefault()`, and posting `openWikiLink`. Survives every incremental preview patch (ADR-0002).
* **`src/webview/main.ts` (edited).** Mounts `registerWikiLinkClicks(shell.previewPane, bus)` after scroll-sync.
* **Tests.** Unit 132 → 152 (`resolveForward` in `test/links/linkIndex.test.ts`, `findHeadingLine` in `test/outline/headings.test.ts`, the `openWikiLink` guard in `test/messaging/messages.test.ts`); integration 39 → 45 (`test/integration/wikiLinkClick.test.ts` — the click → message seam); exthost 4. All green.
* **Documentation pass:** [design/wiki-navigation.md](design/wiki-navigation.md) (new), **ADR-0021** in [DECISIONS.md](DECISIONS.md), `openWikiLink` documented in [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (T-4.1b under M4.1), [TODO.md](TODO.md) (T-4.1b → Done), [ARCHITECTURE.md](ARCHITECTURE.md), [PROJECT_STATUS.md](PROJECT_STATUS.md), [sprint-3/progress.md](sprint-3/progress.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None in-flight. T-4.1b is implemented, tested, and committed on `feature/sprint-3`; the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` (152 unit + 45 integration); `npm run test:exthost` (4) also passes.
* **Awaiting:** push + PR, then QA sign-off (`docs/qa/sprint-3-signoff.md`) and the Producer `--no-ff` merge. **Dev does not merge.**
* **Note on git:** `feature/sprint-3` branches off `main` `14cccd7`; merge with `--no-ff` to preserve the feature + docs commits.

---

## 3. Remaining Work for This Initiative

**Phase 4 — Knowledge Management is under way.** M4.1 (backlinks panel, merged) + T-4.1b (in-preview navigation, on `feature/sprint-3`) are done. Remaining milestones: **M4.2 — Hover preview for links**, **M4.3 — Embedded notes / transclusion**, **M4.4 — Graph view**.

Tracked follow-ups still open (in [TODO.md](TODO.md)):
* **T-4.1a — Markdown-link backlinks** (`[text](note.md)`): a second extractor feeding the same index.
* **T-4.1c — Heading-level backlinks:** group/resolve `#heading` rather than only capturing it.

ADR-0021 follow-ups (in-preview navigation refinements): quick-pick disambiguation on ambiguous basenames; click-to-create for unresolved targets; slug-based heading matching (shared with the outline) so inline-Markdown headings navigate; same-document `[[#heading]]` navigation.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/messaging/messages.ts` | Edited | `OpenWikiLinkMessage` + union member + boundary guard |
| `src/links/linkIndex.ts` | Edited | Pure `resolveForward(fromPath, target)` (keeps self-match) |
| `src/links/LinkIndexService.ts` | Edited | `resolveTarget(fromUri, target): vscode.Uri[]` URI wrapper |
| `src/outline/headings.ts` | Edited | Pure `findHeadingLine(text, heading): number` |
| `src/links/registerBacklinks.ts` | Edited | Signature → `registerBacklinks(provider, service)`; service injected |
| `src/extension.ts` | Edited | Single `LinkIndexService` created + `start()` + injected + disposed |
| `src/editor/MarkStudioEditorProvider.ts` | Edited | `openWikiLink` bus case + private `async openWikiLink()` |
| `src/webview/preview/wikiLinkClick.ts` | New | Delegated `[[link]]` click → `openWikiLink` message |
| `src/webview/main.ts` | Edited | Mounts `registerWikiLinkClicks(previewPane, bus)` |
| `test/links/linkIndex.test.ts` | Edited | `resolveForward` describe block (9 tests) |
| `test/outline/headings.test.ts` | Edited | `findHeadingLine` describe block (6 tests) |
| `test/messaging/messages.test.ts` | Edited | `openWikiLink` guard describe block (5 tests) |
| `test/integration/wikiLinkClick.test.ts` | New | Click → message seam (6 tests) |
| `docs/design/wiki-navigation.md` | New | Design note |
| `docs/DECISIONS.md` | Edited | ADR-0021 + index row |
| `docs/api/message-protocol.md` | Edited | `openWikiLink` documented; T-4.1 note updated |
| `docs/CHANGELOG.md` | Edited | New T-4.1b Added entry |
| `docs/FEATURES.md` | Edited | In-preview navigation → Shipped; Wiki links row updated |
| `docs/ROADMAP.md` | Edited | T-4.1b under M4.1 |
| `docs/TODO.md` | Edited | T-4.1b → Done; active block removed |
| `docs/ARCHITECTURE.md` | Edited | `wikiLinkClick.ts` in the tree + component rows |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-4.1b |
| `docs/sprint-3/progress.md` | Edited | Phases marked done |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Webview delegates the click; host resolves + navigates through one shared resolver (ADR-0021).** Resolution and editor navigation are host responsibilities (ADR-0001/0004); the persistent preview owns one delegated listener (ADR-0002). The first webview-originated navigation message — `openWikiLink`, typed + boundary-guarded.
  * **Recorded as ADR?** Yes → **ADR-0021**.
* **One resolver, shared via `resolveForward`** instead of a second webview-local resolver or a forked copy — the Backlinks panel and click-navigation resolve identically (basename, relative-first, ambiguity). Forward keeps the self-match; the backlink build drops self.
  * **Recorded as ADR?** Yes → ADR-0021.
* **One `LinkIndexService`, hoisted to `extension.ts`** and injected into both registrations — one workspace scan, one live index.
  * **Recorded as ADR?** Yes → ADR-0021.
* **Producer navigation policy:** resolve relative to the active note; **open-first** on ambiguous basename (no quick-pick); existing-notes-only (unresolved → transient status-bar message, no click-to-create); **no new setting** (gated by `markstudio.preview.wikiLinks`); same-document `[[#heading]]` links inert this sprint.
  * **Recorded as ADR?** Covered by ADR-0021.

---

## 6. Assumptions Made

* **The persistent preview pane (`shell.previewPane`) is never replaced** (ADR-0002), so a single delegated listener survives every incremental patch — no per-render rebinding.
* **`showTextDocument` opens the built-in text editor, not the MarkStudio webview** (custom editor is `priority: "option"`), so navigating *to* a note reliably reveals the heading line.
* **`findHeadingLine` matching raw heading source is acceptable for v1** — headings containing inline Markdown (`## **Bold**`) won't match; a shared slugify is the tracked follow-up.
* **Forward resolution keeping a self-match is the desired behaviour** for navigation (clicking `[[A]]` in A opens A), even though the backlink build drops self — the one shared resolver returns all matches and each caller applies its own self-policy.

---

## 7. Technical Debt Introduced

* **Open-first on ambiguous basenames** — no quick-pick disambiguation (ADR-0021 follow-up).
* **Unresolved targets only surface in the status bar** — no click-to-create (ADR-0021 follow-up).
* **Same-document `[[#heading]]` links are inert** this sprint (empty `target`).
* **`findHeadingLine` is an exact match on raw source** — inline-Markdown headings don't navigate (slugify follow-up).
* **Carried over from earlier sessions:** wiki-links-only backlinks (T-4.1a); file-level `#heading` grouping in the panel (T-4.1c); multi-root path-key collisions; Mermaid live re-theme (T-3.2); always-bundled KaTeX cost (T-3.1); `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2); task-list checkboxes are read-only (T-3.5).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None.** The full local pipeline is green and T-4.1b is committed on `feature/sprint-3`.
* **Merge gate:** awaiting QA sign-off (`docs/qa/sprint-3-signoff.md`) + the Producer `--no-ff` merge. The manual EDH (F5) matrix (Phase 8 of the plan) is a QA/post-push item.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host bundle **~40.4 KB → ~44.0 KB** (+~3.6 KB for the resolver wiring + click handler); webview seam unchanged
* [x] `npm test` passes — **197 tests** (152 unit + 45 integration, `node:test`)
* [x] `npm run test:exthost` passes — 4 Extension Host lifecycle tests
* [ ] **Manual verification in an Extension Development Host (F5)** — **pending QA** (Phase 8 matrix): click `[[B]]` from A opens B; `[[B#Heading]]` reveals the heading line; ambiguous basename opens the first match; unresolved target shows a status-bar message; same-document `[[#heading]]` is inert; toggling `markstudio.preview.wikiLinks` off removes the links
* [x] Webview is not recreated (one delegated listener on the persistent pane; navigation is a `postMessage`, not a reload)
* [x] CodeMirror state preserved (unchanged this session)
* [x] New typed `openWikiLink` message is boundary-validated
* [ ] **CI run on GitHub** — pending the `feature/sprint-3` push/PR

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-3` (post QA sign-off), continue Phase 4 with **M4.2 — Hover preview for links**: a hover card showing the target note's excerpt, reusing the same `src/links/` resolver. The remaining Phase 4 follow-ups — **T-4.1a Markdown-link backlinks** and **T-4.1c heading-level backlinks** — are also resolver-backed and can slot in as smaller sprints.
* **Why this one:** It is the next *roadmap* milestone after backlinks + click-navigation and reuses the now-shared resolver directly.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [design/wiki-navigation.md](design/wiki-navigation.md) + [design/backlinks.md](design/backlinks.md) — the navigation + index design to build on
  * `src/links/` — the shared resolver (`resolveForward` / `resolveTarget`) + index to reuse
  * `src/webview/preview/wikiLinkClick.ts` — the click seam a hover handler would parallel
* **Before starting:** `feature/sprint-3` must be merged to `main` first.

---

## 11. Open Questions for the Next Agent

* **Should ambiguous basenames get a quick-pick** rather than silently opening the first match (ADR-0021 follow-up)?
* **Should unresolved targets offer click-to-create** (with templates / location / front-matter), or stay a status-bar message?
* **Should heading matching slugify** (shared with the outline) so `[[Note#Bold]]` finds `## **Bold**`?
* **Should same-document `[[#heading]]` links scroll within the active note**, and if so via the editor (`revealLine`) or the preview?
* **Next sprint base:** after merge, the next feature branches off the merged `main`. M4.2 is purely additive on the existing resolver.
