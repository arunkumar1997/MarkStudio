# AGENT HANDOFF — PR #4 merged: wiki-link / Backlinks / standard markdown links open in MarkStudio (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Remy (Producer) — merge + post-merge docs sync
* **Working branch:** `main` (merged from `fix/wikilink-open-in-markstudio`)
* **Last commit on `main`:** `dee909e` *(`--no-ff` merge of `fix/wikilink-open-in-markstudio` / PR #4)*
* **Branch state:** PR #4 merged to `main` via `--no-ff` (repo convention; never squash/rebase). The four feature commits on the branch are preserved in history: `dc8cda2` fix (wiki-link + backlinks) + `0b11632` docs + `d11e2ac` fix (standard markdown links) + `807105a` docs.
* **Prompt used:** ai-team-orchestration (Producer close-out)

---

## 1. What Was Completed

**Bugfix merged: clicking a `.md` target from the preview or the Backlinks panel now opens MarkStudio, not VS Code's built-in text editor.** Root cause was that `vscode.window.showTextDocument(...)` does not route to a custom editor registered at `priority: "option"` (the deliberate ADR-0021 / ADR-0020 choice). The fix is a small **pending-reveal handshake** built around `vscode.commands.executeCommand("vscode.openWith", uri, MarkStudioEditorProvider.viewType)`, applied uniformly to **three** navigation paths:

1. **Wiki-link clicks in the preview** — `[[note]]` / `[[note|alias]]` / `[[note#heading]]` (T-4.1b path).
2. **Backlinks panel rows** — `markstudio.backlinks.open` (T-4.1 path).
3. **Standard markdown links in the preview** (new in this PR's second commit pair) — `[Architecture Overview](./ARCHITECTURE.md)`, `[doc](/docs/x.md)`, with or without a `#heading` fragment.

**Architecture.**

* **`src/editor/pendingReveals.ts` (new, pure).** Tiny `Map<string, number>` wrapper (`set` / `take` / `clear`) keyed by `uri.toString()` that parks a requested 0-based reveal line for a target that is not yet open. No `vscode`/DOM imports → unit-testable.
* **`src/editor/MarkStudioEditorProvider.ts`.** New `controllersByUri: Map<string, MarkStudioEditorController>` alongside the existing single-`activeController` focus tracking, plus a `PendingReveals` instance. New **public** `openInMarkStudio(targetUri, line)` is the single shared entry point for all three call sites: already-open target → `openWith` focuses its tab + `revealLine` immediately on the live controller; not-yet-open target → record the line in `pendingReveals` **before** `openWith`, applied by `applyPendingReveal(uri)` in the `ready` handler. Disposal removes the entry from `controllersByUri` and clears any stale pending reveal.
* **`src/links/registerBacklinks.ts`.** `markstudio.backlinks.open` now calls `provider.openInMarkStudio(uri, safeLine)` (try/catch → transient status-bar fallback, fire-and-forget).
* **`src/webview/preview/markdownLinkClick.ts` (new).** A second delegated `click` listener on the persistent preview pane, mounted next to `registerWikiLinkClicks` and strictly disjoint from it (skips anchors carrying `data-wikilink-target`). Two pure helpers (`isExternalHref`, `parseLocalMarkdownHref`) classify the href; the listener claims a click only when it is non-empty, has no URL scheme (rejecting `http:`/`https:`/`mailto:`/`vscode:`/`command:`/`file:`…), is not a same-document `#fragment`, no modifier key is held (`ctrlKey`/`metaKey`/`shiftKey`/`altKey`), the click's default is not already prevented, and the path ends in `.md` / `.markdown` after stripping any `?query` and `#fragment`. Claimed clicks `preventDefault()` and post a new typed **`openMarkdownLink { href, target, heading }`** webview → host message.
* **`src/messaging/messages.ts`.** Added `OpenMarkdownLinkMessage` to the `WebviewToHostMessage` union with a boundary guard case (`isWebviewToHostMessage`).
* **`src/extension.ts`.** `activate()` now returns a tiny `MarkStudioExtensionApi { provider }` purely so the Extension Host tests can drive `provider.openMarkdownLink` directly.
* **Host handler `MarkStudioEditorProvider.openMarkdownLink(fromUri, href, target, heading)`.** Defence-in-depth `EXTERNAL_HREF` regex check (rejects schemed hrefs even if the webview slips one through), resolves via `resolveMarkdownLinkUri` — **plain URI math, not the workspace link index** (which only knows wiki-link basenames): a `/`-prefixed `target` is workspace-absolute (resolved against the source note's workspace folder, falling back to the first folder for an out-of-workspace source — multi-root vaults always route to *the source's own root*); any other `target` is relative to the source's containing directory (`vscode.Uri.joinPath(fromUri, "..", target)`). Then reads the target doc, finds the heading via `findHeadingLine` (miss → top), clamps the line, and routes through `openInMarkStudio` so the pending-reveal handshake is identical to the wiki-link / backlinks paths. Try/catch → transient status-bar fallback (`MarkStudio: no note found at "<href>"` / `could not open note at "<href>"`, 4000 ms), never a throw.

**Resolver unchanged.** Wiki-link clicks and Backlinks still resolve through the shared `LinkIndexService.resolveTarget` (open-first on ambiguity); standard markdown links resolve via plain URI math (the path is given explicitly).

**Tests.** Unit 172 → **199** (+27: `test/editor/pendingReveals.test.ts` 8; `test/webview/markdownLinkClick.test.ts` 19). Integration 52 → **65** (+13: `test/integration/markdownLinkClick.test.ts`). Exthost 4 → **9** (+5: `test/exthost/suite/navigation.test.ts` — backlinks-opens-MarkStudio, already-open-focuses-MarkStudio, relative-`.md` href, workspace-absolute-`/path` href, external-`https:` no-op). **273 automated tests, 0 failures.**

**Docs.** ADR-0021 has two amendments (the wiki-link/backlinks reveal handshake, and the standard markdown-link extension); ADR-0020 Decision item 1 marked superseded; [api/message-protocol.md](api/message-protocol.md) documents `openMarkdownLink`; [CHANGELOG.md](CHANGELOG.md) has two new `Fixed` entries; [FEATURES.md](FEATURES.md) Backlinks + In-preview navigation rows refreshed; [PROJECT_STATUS.md](PROJECT_STATUS.md); this handoff.

---

## 2. Current Work In Progress

* **None.** PR #4 is merged. `main` is `dee909e`, ahead of `origin/main` by this merge + the post-merge docs sync until the Producer pushes (see §8).

---

## 3. Remaining Work for This Initiative

Phase 4 continues. The next roadmap milestone is **M4.3 — Embedded notes / transclusion**, then **M4.4 — Graph view**. Tracked follow-ups (in [TODO.md](TODO.md)): T-4.1a (Markdown-link backlinks — *the index, not click-nav; click-nav is now done*), T-4.1c (heading-level backlinks), and the ADR-0021 follow-ups (quick-pick disambiguation, click-to-create, slug-based heading matching, same-document `[[#heading]]` navigation).

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/editor/pendingReveals.ts` | New | Pure `PendingReveals` registry (`set` / `take` / `clear`) for the reveal handshake |
| `src/editor/MarkStudioEditorProvider.ts` | Edited | `controllersByUri` map + `PendingReveals`; public `openInMarkStudio`; `applyPendingReveal` on `ready`; `openWikiLink` and the new `openMarkdownLink` both delegate; `resolveMarkdownLinkUri` (multi-root aware) |
| `src/links/registerBacklinks.ts` | Edited | Open source in MarkStudio via `provider.openInMarkStudio` |
| `src/webview/preview/markdownLinkClick.ts` | New | Delegated click listener + pure `isExternalHref` / `parseLocalMarkdownHref` helpers; posts `openMarkdownLink` |
| `src/webview/main.ts` | Edited | Mount `registerMarkdownLinkClicks(shell.previewPane, bus)` next to `registerWikiLinkClicks` |
| `src/messaging/messages.ts` | Edited | New `OpenMarkdownLinkMessage` in the union + boundary-guard case |
| `src/extension.ts` | Edited | `activate()` returns `MarkStudioExtensionApi { provider }` (for Extension Host tests) |
| `test/editor/pendingReveals.test.ts` | New | 8 unit tests for `PendingReveals` |
| `test/webview/markdownLinkClick.test.ts` | New | Unit tests for `isExternalHref` + `parseLocalMarkdownHref` |
| `test/integration/markdownLinkClick.test.ts` | New | jsdom delegated-click integration tests |
| `test/exthost/suite/navigation.test.ts` | New (then extended) | 5 Extension Host tests — backlinks, already-open, relative `.md`, workspace-absolute `/path`, external `https:` no-op |
| `test/exthost/index.ts` | Edited | Import the new navigation suite |
| `test/messaging/messages.test.ts` | Edited | `openMarkdownLink` boundary-guard tests |
| `docs/DECISIONS.md` | Edited | ADR-0021 two amendments; ADR-0020 item 1 superseded note |
| `docs/api/message-protocol.md` | Edited | `openMarkdownLink` + `revealLine` notes |
| `docs/CHANGELOG.md` | Edited | Two new Fixed entries |
| `docs/FEATURES.md` | Edited | Backlinks + In-preview navigation rows |
| `docs/PROJECT_STATUS.md` | Edited | Merged-snapshot |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Open `.md` targets in MarkStudio (not the built-in text editor) for click-navigation, backlinks, AND standard markdown links**, via `vscode.openWith` with the MarkStudio view type — consistency with the project philosophy (MarkStudio is *the* Markdown experience).
  * **Recorded as ADR?** Yes → **ADR-0021 amendment (2026-06-30)** for wiki-links / backlinks; **ADR-0021 second amendment (2026-06-30)** for standard markdown links.
* **Reveal via the existing `revealLine` message + a pending-reveal handshake**, not a new message: a MarkStudio editor is a webview, so the line cannot ride `showTextDocument`'s `selection`. Already-open → reveal in place; not-yet-open → park the line and apply on `ready`.
  * **Recorded as ADR?** Covered by the ADR-0021 amendment.
* **One shared `openInMarkStudio(uri, line)` on the provider** backs all three call sites, so they cannot drift.
  * **Recorded as ADR?** Covered by the ADR-0021 amendment.
* **Standard markdown links resolve via plain URI math, *not* the workspace link index.** The link index is a wiki-link basename index (it does not know about `./foo.md` syntax); standard markdown links carry an explicit relative or workspace-absolute path that `vscode.Uri.joinPath` resolves directly. Multi-root: a `/`-prefixed target is workspace-absolute against *the source note's* workspace folder.
  * **Recorded as ADR?** Yes → **ADR-0021 second amendment (2026-06-30)**.

---

## 6. Assumptions Made

* **Messages are processed in order in the webview**, so a `revealLine` sent right after `init` (on `ready`) is applied after the editor is built — matching how the outline tree's `revealLine` already works against a built editor.
* **`vscode.openWith` on an already-open document focuses the existing custom editor** (no duplicate, since `supportsMultipleEditorsPerDocument: false`).
* **The heading line is computed from the freshly opened target document's text** (`findHeadingLine`, raw-source exact match — the same v1 limitation as before; slug matching is the tracked follow-up).
* **A workspace-absolute (`/path`) markdown link is interpreted relative to the *source note's* workspace folder**, falling back to the first workspace folder when the source is outside the workspace.

---

## 7. Technical Debt Introduced

* **None new.** The fix removes a behavioural wart without adding scope. Carried-over debt is unchanged from the prior handoff (raw-source `findHeadingLine`, open-first on ambiguous basenames, status-bar-only unresolved targets, inert same-document `[[#heading]]`, wiki-links-only backlinks index, file-level `#heading` grouping, multi-root path-key collisions, Mermaid live re-theme, always-bundled KaTeX, console-only failure logging, active-webview-only commands/indicator, keyboard-only find panel, accumulating `StateStore` Memento entries, linear scroll-sync interpolation, raw-source outline text, read-only task-list checkboxes).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None.** The fix is merged on `main` (`dee909e`); local gate is green.
* **Push gate:** the Producer still needs to `git push origin main` so `origin/main` catches up to the local merge commit + the post-merge docs sync.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host bundle `dist/extension.js` **~55.2 KB**
* [x] `npm test` passes — **264 tests** (199 unit + 65 integration, `node:test`)
* [x] `npm run test:exthost` passes — **9** Extension Host tests (a harmless "Error mutex already exists" log prints; exit code 0)
* [x] **Manual verification in an Extension Development Host (F5)** — user-confirmed "all good" before merge (wiki-link click, backlinks row, standard markdown link, `#heading` reveal, already-open focus, external link untouched, modifier-key passthrough).
* [x] Webview is not recreated (reveal is a `postMessage`); CodeMirror state preserved.

---

## 10. Recommended Next Task

* **Task:** Continue Phase 4 with **M4.3 — Embedded notes / transclusion**, reusing the shared `src/links/` resolver and `extractExcerpt`.
* **Why this one:** Next roadmap milestone after backlinks + click-navigation + hover preview.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [design/wiki-navigation.md](design/wiki-navigation.md) — the navigation design to build on
  * `src/links/` — the shared resolver (`resolveForward` / `resolveTarget`) + `linkExcerpt.ts`
  * `src/webview/preview/wikiLinkHover.ts` — the hover seam a transclusion feature would parallel

---

## 11. Open Questions for the Next Agent

* **Should the already-open case scroll the existing editor even when it is in another tab group**, or only when focused? (Current behaviour: `openWith` focuses it, then reveals.)
* **Should ambiguous basenames get a quick-pick** rather than silently opening the first match (ADR-0021 follow-up)?
* **Should unresolved targets offer click-to-create** (with templates / location / front-matter), or stay a status-bar message?
* **Should heading matching slugify** (shared with the outline) so `[[Note#Bold]]` finds `## **Bold**`?
* **Should same-document `[[#heading]]` links scroll within the active note**, and if so via the editor (`revealLine`) or the preview?
* **Should standard markdown links also support non-`.md` targets** (`./image.png`, `./script.js`) by opening them with `vscode.commands.executeCommand("vscode.open", uri)`, or stay strict-`.md`?
