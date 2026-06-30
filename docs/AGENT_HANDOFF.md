# AGENT HANDOFF — Bugfix: wiki-link / Backlinks open in MarkStudio (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Dev Team (Sage — host + messaging)
* **Working branch:** `fix/wikilink-open-in-markstudio` (off `main` `8bf1a86`)
* **Last commit on `main`:** `8bf1a86` *(`--no-ff` merge of `feature/sprint-4` / PR #3 — M4.2)*
* **Branch state:** Fix implemented and **uncommitted** in the working tree — left for the Producer to review, commit, and merge. Local gate green (180 unit + 52 integration + 6 exthost).
* **Prompt used:** ai-team-dev (bugfix)

---

## 1. What Was Completed

Fixed the defect where clicking a wiki-link (`[[note]]` / `[[note#heading]]`) in the preview — and clicking a row in the **Backlinks** panel — opened the target `.md` in VS Code's **built-in text editor** (raw Markdown) instead of the **MarkStudio** custom editor. Root cause: both call sites used `vscode.window.showTextDocument(...)`, which does not route to a custom editor registered at `priority: "option"` (this was the deliberate prior ADR-0021 / ADR-0020 choice).

Both call sites now open the target in MarkStudio via `vscode.commands.executeCommand("vscode.openWith", targetUri, MarkStudioEditorProvider.viewType)` (mirroring the existing `markstudio.openMarkStudio` command), and reveal the target line through the existing host → webview **`revealLine`** message using a **pending-reveal handshake**.

* **`src/editor/pendingReveals.ts` (new, pure).** `PendingReveals` — a tiny `Map<string, number>` wrapper (`set` / `take` / `clear`) keyed by `uri.toString()`, parking the requested 0-based reveal line for a target that is not yet open. No `vscode`/DOM imports → unit-testable.
* **`src/editor/MarkStudioEditorProvider.ts` (edited).** Added `controllersByUri: Map<string, MarkStudioEditorController>` (every resolved editor, keyed by URI; one per document since `supportsMultipleEditorsPerDocument: false`) alongside the existing single-`activeController` focus tracking, and a `PendingReveals` instance. New **public** `openInMarkStudio(targetUri, line)`: already-open target → `openWith` focuses its tab + `revealLine` immediately on the live controller; not-yet-open target → record the line in `pendingReveals` **before** `openWith`, applied by `applyPendingReveal(uri)` in the `ready` handler. `openWikiLink` now computes the heading line (`findHeadingLine`, miss → top), clamps, and delegates to `openInMarkStudio`; it keeps the try/catch → transient status-bar fallback. The controller is registered in `controllersByUri` at resolve and removed on dispose, where the pending entry is also cleared (so a reveal queued for an editor that closed before `ready` cannot leak onto a later editor).
* **`src/links/registerBacklinks.ts` (edited).** The `markstudio.backlinks.open` handler's `openSourceAtLine` (which used `showTextDocument`) is replaced by `openSourceInMarkStudio(provider, uri, line)`: open the source doc to clamp the linking line, then `provider.openInMarkStudio(uri, safeLine)`. Wrapped in try/catch → transient status-bar fallback; stays fire-and-forget (`void`).
* **Resolver unchanged.** Both paths still resolve through the shared `LinkIndexService.resolveTarget` (open-first on ambiguity), so hover, click, and backlinks continue to agree.

**Tests.** Unit 172 → **180** (`test/editor/pendingReveals.test.ts` — set/take one-shot, line-0 preserved, independent URIs, most-recent-wins, clear). Integration **52** (unchanged). Exthost 4 → **6** (`test/exthost/suite/navigation.test.ts` — the Backlinks open command lands a `TabInputCustom` with `viewType === "markstudio.editor"`, both fresh-open and already-open cases; registered in `test/exthost/index.ts`).

**Docs.** ADR-0021 amended (Status + a new "Amendment (2026-06-30)" section + index-table status); ADR-0020 Decision item 1 marked superseded; [api/message-protocol.md](api/message-protocol.md) `revealLine` / `openWikiLink` / the T-4.1 note updated; [CHANGELOG.md](CHANGELOG.md) (new Fixed entry); [FEATURES.md](FEATURES.md) (Backlinks + In-preview navigation rows); [PROJECT_STATUS.md](PROJECT_STATUS.md); this handoff. Code comments in `MarkStudioEditorProvider.ts` and `registerBacklinks.ts` that described the old text-editor behaviour were rewritten.

---

## 2. Current Work In Progress

* **Item:** None in-flight. The fix is complete and **uncommitted** on `fix/wikilink-open-in-markstudio`, awaiting Producer review + commit + merge (the Dev Team does not commit/push/merge).

---

## 3. Remaining Work for This Initiative

Phase 4 continues. After this fix merges, the next roadmap milestone is **M4.3 — Embedded notes / transclusion**, then **M4.4 — Graph view**. Tracked follow-ups (in [TODO.md](TODO.md)): T-4.1a (Markdown-link backlinks), T-4.1c (heading-level backlinks), and the ADR-0021 follow-ups (quick-pick disambiguation, click-to-create, slug-based heading matching, same-document `[[#heading]]` navigation).

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/editor/pendingReveals.ts` | New | Pure `PendingReveals` registry (`set` / `take` / `clear`) for the reveal handshake |
| `src/editor/MarkStudioEditorProvider.ts` | Edited | `controllersByUri` map + `PendingReveals`; public `openInMarkStudio`; `applyPendingReveal` on `ready`; `openWikiLink` delegates; comment rewrite |
| `src/links/registerBacklinks.ts` | Edited | Open source in MarkStudio via `provider.openInMarkStudio`; comment rewrite |
| `test/editor/pendingReveals.test.ts` | New | 8 unit tests for `PendingReveals` |
| `test/exthost/suite/navigation.test.ts` | New | 2 Extension Host tests (open lands a `TabInputCustom` for the MarkStudio view type) |
| `test/exthost/index.ts` | Edited | Import the new navigation suite |
| `docs/DECISIONS.md` | Edited | ADR-0021 amendment + status; ADR-0020 item 1 superseded note |
| `docs/api/message-protocol.md` | Edited | `revealLine` / `openWikiLink` / T-4.1 note updated (no message added) |
| `docs/CHANGELOG.md` | Edited | New Fixed entry |
| `docs/FEATURES.md` | Edited | Backlinks + In-preview navigation rows |
| `docs/PROJECT_STATUS.md` | Edited | In-flight bugfix snapshot |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Open `.md` targets in MarkStudio (not the built-in text editor) for both click-navigation and backlinks**, via `vscode.openWith` with the MarkStudio view type — consistency with the project philosophy (MarkStudio is *the* Markdown experience).
  * **Recorded as ADR?** Yes → **ADR-0021 amendment (2026-06-30)**; supersedes the prior "open in built-in text editor" detail in ADR-0021 and ADR-0020.
* **Reveal via the existing `revealLine` message + a pending-reveal handshake**, not a new message: a MarkStudio editor is a webview, so the line cannot ride `showTextDocument`'s `selection`. Already-open → reveal in place; not-yet-open → park the line and apply on `ready`. No new message, setting, command, or dependency.
  * **Recorded as ADR?** Covered by the ADR-0021 amendment.
* **One shared `openInMarkStudio(uri, line)` on the provider** backs both call sites, so they cannot drift.
  * **Recorded as ADR?** Covered by the ADR-0021 amendment.

---

## 6. Assumptions Made

* **Messages are processed in order in the webview**, so a `revealLine` sent right after `init` (on `ready`) is applied after the editor is built — matching how the outline tree's `revealLine` already works against a built editor.
* **`vscode.openWith` on an already-open document focuses the existing custom editor** (no duplicate, since `supportsMultipleEditorsPerDocument: false`).
* **The heading line is computed from the freshly opened target document's text** (`findHeadingLine`, raw-source exact match — the same v1 limitation as before; slug matching is the tracked follow-up).

---

## 7. Technical Debt Introduced

* **None new.** The fix removes a behavioural wart without adding scope. Carried-over debt is unchanged from the prior handoff (raw-source `findHeadingLine`, open-first on ambiguous basenames, status-bar-only unresolved targets, inert same-document `[[#heading]]`, wiki-links-only backlinks, file-level `#heading` grouping, multi-root path-key collisions, Mermaid live re-theme, always-bundled KaTeX, console-only failure logging, active-webview-only commands/indicator, keyboard-only find panel, accumulating `StateStore` Memento entries, linear scroll-sync interpolation, raw-source outline text, read-only task-list checkboxes).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None.** The fix is implemented and the local gate is green.
* **Merge gate:** ⏳ open — pending Producer review + commit + `--no-ff` merge (and any QA F5 pass the Producer requires).

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host bundle `dist/extension.js` **~51.5 KB**
* [x] `npm test` passes — **232 tests** (180 unit + 52 integration, `node:test`)
* [x] `npm run test:exthost` passes — **6** Extension Host tests (a harmless "Error mutex already exists" log prints; exit code 0)
* [ ] **Manual verification in an Extension Development Host (F5)** — **pending QA/Producer** (human-only): click `[[note]]` / `[[note#heading]]` in the preview opens the target in MarkStudio at the right line; click a Backlinks row opens the source in MarkStudio at the linking line; already-open target focuses + reveals (no duplicate tab); unresolved target / failed open shows the transient status-bar message.
* [x] Webview is not recreated (reveal is a `postMessage`); CodeMirror state preserved.

---

## 10. Recommended Next Task

* **Task:** Once the Producer merges this fix, continue Phase 4 with **M4.3 — Embedded notes / transclusion**, reusing the shared `src/links/` resolver and `extractExcerpt`.
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
