# AGENT HANDOFF — M4.2 Hover preview for links MERGED to `main` (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Dev Team (Sage — host + messaging + excerpt; Nova — webview hover + card; tests by Ivy); merged by the Producer (Remy)
* **Working branch:** `feature/sprint-4` (off `main` `a6d48af`) — **merged & closed** (PR #3)
* **Last commit on `main`:** `8bf1a86` *(`--no-ff` merge of `feature/sprint-4` / PR #3 — M4.2; T-4.1b via `011901e`, M4.1 / T-4.1 via `79369f2`)*
* **Branch state:** M4.2 **merged to `main`** (PR #3). Automated 228 PASS + human F5 hover matrix verified. QA sign-off in [qa/sprint-4-signoff.md](qa/sprint-4-signoff.md).
* **Prompt used:** ai-team-dev (Sprint 4 — M4.2); ai-team-qa (sign-off); ai-team-producer (merge)

---

## 1. What Was Completed

Implemented **M4.2 — Hover preview for links** (Phase 4), the read-side counterpart to T-4.1b: hovering a rendered wiki-link (`[[note]]` / `[[note#heading]]`) in the **preview** shows, after a short dwell, a floating **hover card** previewing the target — the top of the note, or the section under the heading. The webview detects the hover and delegates; the **host** resolves through the **shared M4.1 resolver**, reads a capped excerpt, and ships it as **Markdown text**; the webview renders it with the **existing** preview renderer into a hover-widget-themed card.

* **`src/messaging/messages.ts` (edited).** New `RequestLinkPreviewMessage` (`type: "requestLinkPreview"`, `target: string`, `heading: string | null`) on the `WebviewToHostMessage` union — boundary-guarded in `isWebviewToHostMessage` (the guard case is merged with `openWikiLink`, identical shape). New `LinkPreviewContentMessage` (`type: "linkPreviewContent"`, `target`, `heading`, `status: "ok" | "missing"`, `text?`, `title?`) on the `HostToWebviewMessage` union, guarded in `isHostToWebviewMessage` (validates `status`, and `text`/`title` as string-or-undefined). Plain JSON only.
* **`src/links/linkExcerpt.ts` (new, pure).** `extractExcerpt(text, heading)` — when a `#heading` is present it slices that heading's section (heading line → next same-or-higher heading) reusing `parseHeadings` / `findHeadingLine`, else the top of the note; then caps to `MAX_EXCERPT_LINES` (60) / `MAX_EXCERPT_CHARS` (2,000), whichever bites first; a heading-miss falls back to the top. No `vscode`/fs/DOM.
* **`src/editor/MarkStudioEditorProvider.ts` (edited).** Adds the `requestLinkPreview` case to the message-bus switch + a private `async requestLinkPreview(bus, fromUri, target, heading)`: resolve via the injected `linkIndexService.resolveTarget` (open-first); no match → post `{ status: "missing" }`; else `openTextDocument(...).getText()` → `extractExcerpt` → post `{ status: "ok", text, title }` with `title` from the URI basename (a new module helper `noteTitle`). Wrapped in try/catch, degrading to `"missing"` on any read failure (never an unhandled rejection — the defect #2 lesson).
* **`src/webview/preview/wikiLinkHover.ts` (new).** `registerWikiLinkHover(previewRoot, bus, options)`: one **delegated** `pointerover`/`pointerout` pair on the persistent preview pane (`Element.closest('a.markstudio-wikilink')`); ~300 ms dwell → post `requestLinkPreview`; cancel-on-leave + `onRequestHide`; re-enter → `onCancelHide`. Exposes `getActiveAnchor()` / `matchesActiveRequest(target, heading)` so `main.ts` can drop stale replies. No per-anchor listeners.
* **`src/webview/preview/HoverCard.ts` (new).** `createHoverCard({ parent })`: one persistent floating card; `showContent` / `showMissing` / `hide` / `scheduleHide` (grace) / `cancelHide`; position below the anchor (flipping above near the viewport bottom, clamped horizontally); themed with `--vscode-editorHoverWidget-*`; dismiss on pointer-leave (with grace), card `pointerleave`, scroll, click outside, and Escape. The excerpt renders into `contentElement` via a reused `PreviewRenderer`.
* **`src/webview/main.ts` (edited).** Mounts `createHoverCard({ parent: root })` + a dedicated `PreviewRenderer` in the card + `registerWikiLinkHover(shell.previewPane, bus, …)` next to `registerWikiLinkClicks`; routes `linkPreviewContent` to the card (render `text` on `"ok"`, fallback on `"missing"`) and **drops stale replies** (compares `target`/`heading` against the still-hovered anchor); threads `configChanged` into the card's renderer.
* **Tests.** Unit 152 → 172 (`extractExcerpt` in `test/links/linkExcerpt.test.ts` — top, heading slice, nested-section stop, heading-miss → top, line + char caps; the `requestLinkPreview` + `linkPreviewContent` guards in `test/messaging/messages.test.ts`); integration 45 → 52 (`test/integration/wikiLinkHover.test.ts` — dwell → `requestLinkPreview`, empty-target no-op, cancel-on-leave, active-anchor/stale tracking; card render via the reused renderer, missing fallback, Escape dismiss); exthost 4. All green. **Note:** under jsdom, `window.setTimeout` must be cancelled with `window.clearTimeout` (the global `clearTimeout` does not cancel a jsdom window timer) — fixed in `wikiLinkHover.ts` / `HoverCard.ts`.
* **Documentation pass:** [design/wiki-hover.md](design/wiki-hover.md) (new), **ADR-0022** in [DECISIONS.md](DECISIONS.md), both messages in [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md) (Hover preview → Shipped), [ROADMAP.md](ROADMAP.md) (M4.2 → Done), [TODO.md](TODO.md) (M4.2 → Done), [ARCHITECTURE.md](ARCHITECTURE.md), [PROJECT_STATUS.md](PROJECT_STATUS.md), [sprint-4/progress.md](sprint-4/progress.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None in-flight. M4.2 is **merged to `main`** (PR #3, `--no-ff` `8bf1a86`); post-merge pipeline green: `npm run lint`, `npm run typecheck`, `npm run build`, `npm test` (172 unit + 52 integration); `npm run test:exthost` (4).
* **Done (Producer/QA):** [qa/sprint-4-signoff.md](qa/sprint-4-signoff.md) (automated PASS), the manual **F5 EDH matrix** (verified working by human), [sprint-4/done.md](sprint-4/done.md), and the `--no-ff` merge to `main`.
* **Next:** **M4.3 — Embedded notes / transclusion**.

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
| `src/messaging/messages.ts` | Edited | `RequestLinkPreviewMessage` (W→H) + `LinkPreviewContentMessage` (H→W) + union members + boundary guards |
| `src/links/linkExcerpt.ts` | New | Pure `extractExcerpt(text, heading)` — heading-section slice / top, capped (60 lines / 2,000 chars) |
| `src/editor/MarkStudioEditorProvider.ts` | Edited | `requestLinkPreview` bus case + private `async requestLinkPreview()`; `noteTitle` helper |
| `src/webview/preview/wikiLinkHover.ts` | New | Delegated `[[link]]` hover (dwell) → `requestLinkPreview`; active-anchor / stale tracking |
| `src/webview/preview/HoverCard.ts` | New | Floating hover-preview card: position, theme, render via `PreviewRenderer`, show/fallback/hide/dismiss |
| `src/webview/main.ts` | Edited | Mounts hover + card; routes `linkPreviewContent`; drops stale replies; `configChanged` → card renderer |
| `test/links/linkExcerpt.test.ts` | New | `extractExcerpt` unit tests (top, heading slice, nested stop, miss, caps) |
| `test/messaging/messages.test.ts` | Edited | `requestLinkPreview` + `linkPreviewContent` guard describe blocks |
| `test/integration/wikiLinkHover.test.ts` | New | Hover → request seam + HoverCard render/fallback/dismiss |
| `docs/design/wiki-hover.md` | New | Design note |
| `docs/DECISIONS.md` | Edited | ADR-0022 + index row |
| `docs/api/message-protocol.md` | Edited | `requestLinkPreview` + `linkPreviewContent` documented |
| `docs/CHANGELOG.md` | Edited | New M4.2 Added entry |
| `docs/FEATURES.md` | Edited | Hover preview → Shipped |
| `docs/ROADMAP.md` | Edited | M4.2 → Done |
| `docs/TODO.md` | Edited | M4.2 → Done; intro line updated |
| `docs/ARCHITECTURE.md` | Edited | `wikiLinkHover.ts` / `HoverCard.ts` / `linkExcerpt.ts` in the tree + component rows |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for M4.2 |
| `docs/sprint-4/progress.md` | Edited | Phases marked done |
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

* **Hover card is a static snapshot** taken at hover time — no live update while the target file changes (ADR-0022 follow-up).
* **Open-first on ambiguous basenames** for the preview — no quick-pick (shared with click-nav, ADR-0021/0022).
* **No nested hover** — a wiki-link inside a hover card does not itself preview (deferred).
* **Preview-pane only** — no CodeMirror source-pane hover (separate seam, deferred).
* **No excerpt cache / prefetch** — resolution + read happen once per hover after the dwell (ADR-0022 follow-up).
* **No own setting** — gated by `markstudio.preview.wikiLinks`; an optional `markstudio.preview.linkHoverPreview` is deferred (plan §9).
* **Carried over from earlier sessions:** open-first on ambiguous basenames + status-bar-only unresolved targets + inert same-document `[[#heading]]` + raw-source `findHeadingLine` for navigation (T-4.1b); wiki-links-only backlinks (T-4.1a); file-level `#heading` grouping in the panel (T-4.1c); multi-root path-key collisions; Mermaid live re-theme (T-3.2); always-bundled KaTeX cost (T-3.1); `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2); task-list checkboxes are read-only (T-3.5).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None.** M4.2 is implemented on `feature/sprint-4` and the local pipeline is green.
* **Merge gate:** ⏳ open — pending QA F5 sign-off (`docs/qa/sprint-4-signoff.md`) + the Producer `--no-ff` merge.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host bundle **~44.0 KB → ~47.6 KB** (+~3.6 KB for the excerpt extractor + hover handler); webview reuses its existing renderer
* [x] `npm test` passes — **224 tests** (172 unit + 52 integration, `node:test`)
* [x] `npm run test:exthost` passes — 4 Extension Host lifecycle tests
* [ ] **Manual verification in an Extension Development Host (F5)** — **pending QA** (plan §9 matrix): hover `[[B]]` shows the top of B; `[[B#Heading]]` shows that section; `[[B|alias]]` still previews B; ambiguous basename previews the first match; missing target → quiet "No note found" card; dismiss on leave / scroll / click / Esc; dark / light / high-contrast; toggling `markstudio.preview.wikiLinks` off removes the links (and the feature)
* [x] Webview is not recreated (one delegated hover pair + one persistent card on the persistent pane; preview is a `postMessage`, not a reload)
* [x] CodeMirror state preserved (unchanged this session)
* [x] New `requestLinkPreview` / `linkPreviewContent` messages are boundary-validated; host ships Markdown **text**, webview renders with `html: false`
* [ ] **CI run on GitHub** — pending the `feature/sprint-4` push/PR

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
