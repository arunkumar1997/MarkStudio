# QA Sign-off — Sprint 4 / M4.2 (Hover preview for wiki-links in the preview)

> QA: **Ivy**. Date: 2026-06-30. Branch under test: `feature/sprint-4` (HEAD `24ddb94`, PR #3 → `main`, NOT merged).
> Scope: resting the pointer on a rendered wiki-link (`[[note]]`, `[[note|alias]]`,
> `[[note#heading]]`) in the live preview shows, after a short dwell, a floating
> **hover card** previewing the target note — a capped Markdown excerpt rendered
> by the existing markdown-it renderer (`#heading` slices that section, else the
> top of the note). Two new typed messages (`requestLinkPreview` W→H,
> `linkPreviewContent` H→W), both boundary-guarded; one delegated hover listener;
> the shared M4.1 resolver + heading scanner + preview renderer reused.
> Acceptance checklist: [docs/sprint-4/plan.md](../sprint-4/plan.md) §6.
> Design: [docs/design/wiki-hover.md](../design/wiki-hover.md) · ADR: [ADR-0022](../DECISIONS.md#adr-0022-hover-preview-for-wiki-links-host-ships-markdown-text-webview-renders-it).

---

## Verdict

- **Automated: ✅ PASS — 228 tests** (172 unit + 52 integration + 4 ext-host), 0 failures.
  Lint, both typechecks, and build all clean.
- **Manual EDH (F5): ⏳ PENDING HUMAN.** Every interactive row (real pointer
  hover, dwell timing, card geometry/positioning, theme rendering, scroll/click/Esc
  dismissal observed on screen) requires the live Extension Development Host and
  **cannot** be driven in this non-interactive environment. See §4.

The automated Definition of Done is fully green and the implementation matches
the plan exactly: hover detection is **delegated** (one `pointerover`/`pointerout`
pair on the persistent preview pane, render path untouched), both new messages
are **boundary-guarded**, resolution **reuses the shared `LinkIndexService`
resolver** (open-first on ambiguity, identical to click-nav), the heading slice
**reuses** `parseHeadings`/`findHeadingLine`, and the card renders the excerpt
through the **existing preview renderer** (`html: false` preserved — the host
ships Markdown *text*, never HTML). **No code-review concerns** — see §3.

**No application source was modified by QA.** The only file QA wrote is this
sign-off. The branch is **ready for Producer merge to `main`** once the §4 human
EDH matrix is executed and signed (regular `--no-ff` merge, never squash/rebase
per plan §8).

---

## 1. Pipeline results (local, `feature/sprint-4` @ `24ddb94`)

| Stage | Command | Result | Count |
|---|---|---|---|
| Lint + format | `npm run lint` | ✅ PASS | eslint 0 warnings (`--max-warnings 0`) · prettier all-clean |
| Typecheck (src) | `npm run typecheck` | ✅ PASS | tsc 0 errors |
| Typecheck (test) | `npm run typecheck:test` | ✅ PASS | tsc 0 errors |
| Build | `npm run build` | ✅ PASS | extension (47.6 kb) + webview + mermaid bundled |
| Unit | `npm test` → `test:unit` | ✅ PASS | **172 / 172** (0 fail, 43 suites) |
| Integration | `npm test` → `test:integration` | ✅ PASS | **52 / 52** (0 fail, 13 suites) |
| Ext-host | `npm run test:exthost` | ✅ PASS | **4 / 4** (0 fail) |

> Total automated: **228** (172 unit + 52 integration + 4 ext-host), 0 failures.
>
> Counts match the dev handoff exactly (unit 152 → 172 (+20); integration
> 45 → 52 (+7); exthost 4). The ext-host run prints a harmless
> `Error: Error mutex already exists` line from the VS Code test harness but
> **exits 0** (`$LASTEXITCODE` = 0, "4 passed, 0 failed"). No prettier drift this
> run; no application source modified by QA.

---

## 2. New automated coverage (Phase 8)

The new seams are pinned by automated tests verified during this sign-off:

- **`extractExcerpt` (pure)** — [test/links/linkExcerpt.test.ts](../../test/links/linkExcerpt.test.ts):
  top-of-note, `#heading` section slice, heading-not-found fallback, line/char caps, miss.
- **Boundary guards** — [test/messaging/messages.test.ts](../../test/messaging/messages.test.ts):
  `requestLinkPreview` accepts `{ target: string, heading: string|null }` and
  rejects malformed shapes; `linkPreviewContent` accepts the `ok`/`missing`
  variants and rejects bad `status`/`text`/`title`.
- **Hover → request seam** — [test/integration/wikiLinkHover.test.ts](../../test/integration/wikiLinkHover.test.ts):
  dwell posts `requestLinkPreview`; empty-target (`[[#heading]]`) stays inert;
  leaving before the dwell cancels; active-anchor tracking drops once the pointer
  leaves; `createHoverCard` renders the excerpt via the reused renderer, shows the
  fallback for a missing target, and dismisses on Escape.

---

## 3. Code-review checklist — plan §6 acceptance vs implementation

Each Definition-of-Done criterion traced through the touched files. All hold
(non-interactive criteria verified by code; on-screen behaviour deferred to §4).

| # | Plan §6 acceptance criterion | Result | Evidence (file + behaviour) |
|---|---|---|---|
| 1 | Hovering `[[B]]` shows, after a dwell, a floating card previewing B's content (rendered, themed) | ✅ Pass (code) / ⏳ §4 visual | [wikiLinkHover.ts](../../src/webview/preview/wikiLinkHover.ts) `DEFAULT_DWELL_MS = 300` → `setTimeout` posts `requestLinkPreview`; [main.ts](../../src/webview/main.ts) routes `linkPreviewContent` → `hoverPreview.update` + `hoverCard.showContent`. On-screen card render is §4-H1. |
| 2 | `[[B#Heading]]` previews the section under that heading; falls back to the top when absent | ✅ Pass | [linkExcerpt.ts](../../src/links/linkExcerpt.ts) `extractExcerpt`: `findHeadingLine` → `sectionEndLine` (next same-or-shallower heading); `headingLine < 0` leaves the top-of-note window. Unit-tested. |
| 3 | `[[B\|alias]]` (rendered "alias") still previews the underlying target B | ✅ Pass | Hover reads `data-wikilink-target` (the target, not the rendered alias text) in [wikiLinkHover.ts](../../src/webview/preview/wikiLinkHover.ts); same attribute the click path uses. |
| 4 | Unresolved target degrades gracefully (quiet "no note found" card), never a crash; ambiguous → first match | ✅ Pass | [MarkStudioEditorProvider.ts](../../src/editor/MarkStudioEditorProvider.ts) `requestLinkPreview`: `matches.length === 0` → `status:"missing"`; `matches[0]` is open-first; read wrapped in `try/catch` → `status:"missing"` on read failure. Card shows `showMissing` fallback. |
| 5 | Card dismisses on pointer-leave, scroll, click, and Escape; never lingers | ✅ Pass (code) / ⏳ §4 visual | [HoverCard.ts](../../src/webview/preview/HoverCard.ts) registers capture-phase `scroll`/`click`/`keydown(Escape)` → `hide()`; `pointerleave` → `scheduleHide`; hover detector calls `onRequestHide`. Observed dismissal is §4-H6/H7. |
| 6 | Both new messages in the typed unions **and** `requestLinkPreview` rejected by the guard when malformed | ✅ Pass | [messages.ts](../../src/messaging/messages.ts): `RequestLinkPreviewMessage` in `WebviewToHostMessage`, `LinkPreviewContentMessage` in `HostToWebviewMessage`; `isWebviewToHostMessage` validates `target: string` + `heading: string\|null`. Guard-tested. |
| 7 | One **delegated** hover listener; render path untouched; resolver/scanner/renderer reused; one shared `LinkIndexService` | ✅ Pass | [wikiLinkHover.ts](../../src/webview/preview/wikiLinkHover.ts) mounts one `pointerover` + one `pointerout` on `shell.previewPane` via `closest()`; no per-anchor listeners, no `PreviewRenderer` change; host reuses `this.linkIndexService.resolveTarget`; excerpt reuses `parseHeadings`/`findHeadingLine`; card reuses `createPreviewRenderer`. |
| 8 | No webview recreation, no new pane, no new dependency, no new setting | ✅ Pass | Card appended under existing `root` (`position: fixed`); gated by existing `markstudio.preview.wikiLinks` (no anchors ⇒ inert); no new `package.json` dep. |
| 9 | Host ships **Markdown text**, not HTML; webview renders it (`html: false` preserved) | ✅ Pass | `requestLinkPreview` posts `text` (excerpt), never HTML; [HoverCard.ts](../../src/webview/preview/HoverCard.ts) never sets `innerHTML` from note content — body is rendered by the reused `createPreviewRenderer` (`html: false`). ADR-0022. |
| 10 | Stale responses ignored | ✅ Pass | [main.ts](../../src/webview/main.ts) `linkPreviewContent` drops the reply unless `hover.getActiveAnchor()` is non-null **and** `hover.matchesActiveRequest(target, heading)`; [wikiLinkHover.ts](../../src/webview/preview/wikiLinkHover.ts) clears `active` on `pointerout`. |
| 11 | Lint, typecheck, typecheck:test, build, test all green; new tests added | ✅ Pass | §1 + §2. |

**Code-review concerns: none.** The implementation is faithful to the plan and
the design note; the M4.1 click/resolver primitives are reused without
duplication; the untrusted boundary is guarded; the read path degrades to
`missing` on both no-match and read failure (the defect-#2 lesson from Sprint 3
is carried forward correctly).

---

## 4. Manual EDH (F5) matrix — ⏳ PENDING HUMAN

These rows depend on the live Extension Development Host: real pointer hover,
dwell timing, on-screen card geometry/positioning, theme rendering, and
scroll/click/Esc dismissal **observed on screen**. They **cannot** be executed
or asserted in this non-interactive environment and are **NOT** marked Pass.

**Setup (once):** `F5` to launch the Extension Development Host → open a folder
with at least these notes:
- `A.md` containing the links below.
- `B.md` — a multi-section note with `## Setup` and `## Usage` headings and
  enough body (> 60 lines) to exercise the excerpt cap.
- Two notes that share a basename (e.g. `docs/Guide.md` and `ref/Guide.md`) to
  exercise the ambiguous case.

In `A.md` (opened in the MarkStudio editor, preview pane visible) include:
`[[B]]`, `[[B#Setup]]`, `[[B#NoSuchHeading]]`, `[[B|the bee note]]`,
`[[Does Not Exist]]`, `[[Guide]]`.

| # | Case | Repro script | Expected | Status |
|---|---|---|---|---|
| H1 | Hover `[[B]]` → excerpt after dwell | Rest the pointer on the rendered `[[B]]` link for ~300 ms without moving | A floating card appears showing the **top** of `B.md`, rendered (headings/lists styled), themed as a hover widget | ⏳ Pending human EDH |
| H2 | Hover `[[B#Setup]]` → section | Rest on `[[B#Setup]]` | Card shows the **`## Setup` section only** (up to the next same-or-shallower heading) | ⏳ Pending human EDH |
| H3 | Heading-absent fallback | Rest on `[[B#NoSuchHeading]]` | Card shows the **top of `B.md`** (graceful fallback, no error) | ⏳ Pending human EDH |
| H4 | Alias previews underlying target | Rest on `[[B\|the bee note]]` (renders as "the bee note") | Card previews **B**, not the alias text | ⏳ Pending human EDH |
| H5 | Missing/unresolved link | Rest on `[[Does Not Exist]]` | A small quiet **"No note found"** card (no crash, no console error) | ⏳ Pending human EDH |
| H6 | Ambiguous basename | Rest on `[[Guide]]` (two `Guide.md` exist) | Card previews the **first** match (open-first, consistent with click-nav); no quick-pick | ⏳ Pending human EDH |
| H7 | Dismiss on pointer-leave | Hover `[[B]]` until the card shows, then move the pointer away (not into the card) | Card hides after the short grace; pointer can still travel **into** the card without it vanishing | ⏳ Pending human EDH |
| H8 | Dismiss on scroll | With the card showing, scroll the preview | Card hides immediately | ⏳ Pending human EDH |
| H9 | Dismiss on click | With the card showing, click anywhere outside the card | Card hides immediately | ⏳ Pending human EDH |
| H10 | Dismiss on Escape | With the card showing, press `Esc` | Card hides immediately | ⏳ Pending human EDH |
| H11 | Card stays within viewport | Hover a link near the **bottom** edge, then near the **right** edge | Card flips **above** the anchor when it would overflow the bottom; clamps horizontally; never clipped off-screen | ⏳ Pending human EDH |
| H12 | Theme — Dark | Switch to a dark theme; hover `[[B]]` | Card uses `--vscode-editorHoverWidget-*` tokens; reads as a first-party hover, legible | ⏳ Pending human EDH |
| H13 | Theme — Light | Switch to a light theme; hover `[[B]]` | Same, correct light-theme contrast | ⏳ Pending human EDH |
| H14 | Theme — High Contrast | Switch to a High-Contrast theme; hover `[[B]]` | Border/background honor HC tokens; card clearly delineated | ⏳ Pending human EDH |
| H15 | `wikiLinks` setting off → hover disabled | Set `markstudio.preview.wikiLinks` to `false`; reload preview; hover where a link was | No anchors render ⇒ **no card** (feature inertly absent), no error | ⏳ Pending human EDH |
| H16 | No console errors | Open the webview devtools; repeat H1–H15 | **No** errors or warnings in the console throughout | ⏳ Pending human EDH |

> When a human runs this matrix, also confirm plan §9 open questions on-screen:
> missing-target UX (quiet card vs. no-op), card placement geometry, and the
> dwell/hide timings. jsdom cannot measure layout, so H11 geometry in particular
> is human-only.

---

## 5. Files reviewed

- [src/messaging/messages.ts](../../src/messaging/messages.ts) — both new messages + guards.
- [src/links/linkExcerpt.ts](../../src/links/linkExcerpt.ts) — pure capped excerpt + heading slice.
- [src/editor/MarkStudioEditorProvider.ts](../../src/editor/MarkStudioEditorProvider.ts) — `requestLinkPreview` host handler (shared resolver, open-then-read, `try/catch` → `missing`).
- [src/webview/preview/wikiLinkHover.ts](../../src/webview/preview/wikiLinkHover.ts) — delegated dwell hover.
- [src/webview/preview/HoverCard.ts](../../src/webview/preview/HoverCard.ts) — floating card, hover-widget tokens, no `innerHTML` from note content.
- [src/webview/main.ts](../../src/webview/main.ts) — mount + route + stale-response guard.

## 6. Bugs filed

| # | Description | Severity | Status |
|---|---|---|---|
| — | _(none — no defects found in code review or the automated gate)_ | | |
