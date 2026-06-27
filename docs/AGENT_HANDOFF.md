# AGENT HANDOFF — T-4.1 Backlinks panel merged; Sprint 3 (T-4.1b) planned (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** Producer (Remy) — post-merge sync + Sprint 3 planning
* **Working branch:** `main` (no code changed this session — docs/planning only)
* **Last commit on `main`:** `31fe689` *(Sprint 2 closed; T-4.1 merged via `--no-ff` merge `79369f2`)*
* **Branches:** `feature/sprint-1` and `feature/sprint-2` are fully merged and have been pruned (local + remote).
* **Prompt used:** ai-team-producer mode

---

## 1. What Was Completed

Implemented **T-4.1 — Backlinks panel** (Phase 4 milestone M4.1), the **first Phase 4 — Knowledge Management** feature. A native **`MarkStudio Backlinks`** tree view (Explorer container, visible only while a MarkStudio editor is active) lists every *other* workspace note that links to the active note via a wiki-link (`[[note]]`), one node per source note + linking line; clicking opens the source at the linking line. This also lands the **wiki-link resolver** deferred from Phase 3 (T-3.4 / ADR-0018).

Entirely host-side, mirroring the Outline (ADR-0014) — **no webview/protocol change**. New `src/links/` module:

* **`src/links/parseWikiTargets.ts` (new).** **Pure** `parseWikiTargets(text): WikiTarget[]` — no `vscode`/DOM imports. Extracts `[[target]]` / `[[target|alias]]` / `[[target#heading]]` targets with the same T-3.4 syntax rules as the preview's inline rule (close on the line, reject nested `[`/`]`); skips fenced code blocks, leading YAML front matter, and inline code spans; drops same-document `[[#heading]]` links (no note target).
* **`src/links/linkIndex.ts` (new).** **Pure** `buildLinkIndex(notes): LinkIndex` — the reverse index + **resolver**. No `vscode`/fs imports. Case-insensitive **basename** matching; path-qualified targets resolve **relative-first** then basename; ambiguous basename links **all** matches; **no self-backlink**; per-line dedupe; stable sort. `#heading` is captured and carried but resolved to the file this sprint.
* **`src/links/LinkIndexService.ts` (new).** Owns the I/O: an **async, batched** `workspace.findFiles("**/*.md")` (default excludes) + `fs.readFile` scan kicked off but **not awaited** so activation never blocks; a `FileSystemWatcher` on `**/*.md` (create/change/delete); a **250 ms debounce**; **incremental** per-file re-parse from a cached `Map<path, ParsedNote>`; and an `onDidChangeIndex` event. Maps the pure index's path strings back to `vscode.Uri`.
* **`src/links/BacklinksTreeProvider.ts` (new).** `vscode.TreeDataProvider<ResolvedBacklink>` — a flat node per source note + linking line; label = note name, description/tooltip = trimmed snippet + line, `iconPath` = the `references` Codicon, click runs `markstudio.backlinks.open`. Exposes `backlinkCount` for the empty-state message.
* **`src/links/registerBacklinks.ts` (new).** Creates the service + `TreeView`, follows the active doc via `onDidChangeActiveDocument`, refreshes on `onDidChangeIndex`, registers the internal `markstudio.backlinks.open` command (opens the source in a text editor at the line via `showTextDocument`), and shows an "Indexing…"/"No backlinks" message. Returns one disposable. Calls `service.start()` (non-blocking).
* **`src/extension.ts` (edited).** `registerBacklinks(provider)` in `context.subscriptions`, alongside `registerOutline`.
* **`package.json` (edited).** Contributes the `markstudio.backlinks` view under `contributes.views.explorer` (same `when` clause as the Outline). **No new setting, no new dependency.**
* **Tests (new).** 41 **pure, mock-free** unit tests — `test/links/parseWikiTargets.test.ts` (basic syntax, rejections, skipped regions) and `test/links/linkIndex.test.ts` (basic resolution, basename-in-any-folder, path-qualified relative-first + fallback, self-links/dedupe, ordering). Unit 93 → 129. The `vscode` mock was **not** touched — the service is host-API glue exercised manually / in the Extension Host layer, like `registerOutline`.
* **Documentation pass:** [design/backlinks.md](design/backlinks.md) (new), **ADR-0020** in [DECISIONS.md](DECISIONS.md), [api/message-protocol.md](api/message-protocol.md) ("no change" note), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M4.1 → Done, Phase 4 → In progress), [TODO.md](TODO.md) (T-4.1 → Done + follow-ups T-4.1a/b/c), [ARCHITECTURE.md](ARCHITECTURE.md) (`src/links/` landed + host component rows + `FileWatcherService` note), [PROJECT_STATUS.md](PROJECT_STATUS.md), [sprint-2/progress.md](sprint-2/progress.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-4.1 is complete, **merged to `main`** (merge `79369f2`, Sprint 2 closed `31fe689`), and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` (132 unit + 39 integration); `npm run test:exthost` (4) also passes.
* **Next sprint (planned, not started):** **Sprint 3 → T-4.1b — In-preview wiki-link navigation** ([sprint-3/plan.md](sprint-3/plan.md)).
* **Note on git:** `feature/sprint-2` was merged with `--no-ff` (preserving the T-4.1 commits) and pruned along with `feature/sprint-1`.

---

## 3. Remaining Work for This Initiative

**Phase 4 — Knowledge Management is under way.** M4.1 (backlinks panel) is done. Remaining milestones: **M4.2 — Hover preview for links**, **M4.3 — Embedded notes / transclusion**, **M4.4 — Graph view**.

Tracked follow-ups spun out of T-4.1 (in [TODO.md](TODO.md)):
* **T-4.1a — Markdown-link backlinks** (`[text](note.md)`): a second extractor feeding the same index.
* **T-4.1b — In-preview wiki-link navigation:** resolve + open `[[target]]` clicked inside the preview (reuses this resolver; needs a webview → host message).
* **T-4.1c — Heading-level backlinks:** group/resolve `#heading` rather than only capturing it.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/links/parseWikiTargets.ts` | New | Pure wiki-link target extractor (T-3.4 rules; skips fences/front matter/inline code) |
| `src/links/linkIndex.ts` | New | Pure reverse index + basename resolver (relative-first, no self-link, dedupe, sort) |
| `src/links/LinkIndexService.ts` | New | Async batched scan + `FileSystemWatcher` + 250 ms debounce + incremental + `onDidChangeIndex` |
| `src/links/BacklinksTreeProvider.ts` | New | `vscode.TreeDataProvider`; one node per source note + linking line |
| `src/links/registerBacklinks.ts` | New | TreeView + active-doc follow + `markstudio.backlinks.open` command |
| `src/extension.ts` | Edited | `registerBacklinks(provider)` alongside `registerOutline` |
| `package.json` | Edited | Contributes the `markstudio.backlinks` view (no new dep, no new setting) |
| `test/links/parseWikiTargets.test.ts` | New | Pure unit tests for the extractor |
| `test/links/linkIndex.test.ts` | New | Pure unit tests for the resolver |
| `docs/design/backlinks.md` | New | Design note |
| `docs/DECISIONS.md` | Edited | ADR-0020 + index row |
| `docs/api/message-protocol.md` | Edited | "No protocol change in T-4.1" note |
| `docs/CHANGELOG.md` | Edited | New T-4.1 Added entry |
| `docs/FEATURES.md` | Edited | Backlinks → Shipped |
| `docs/ROADMAP.md` | Edited | M4.1 → Done; Phase 4 → In progress |
| `docs/TODO.md` | Edited | T-4.1 → Done; follow-ups T-4.1a/b/c added |
| `docs/ARCHITECTURE.md` | Edited | `src/links/` in the tree + host component rows + watcher note |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-4.1 |
| `docs/sprint-2/progress.md` | Edited | Phases marked done |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Host-side `TreeDataProvider` + workspace link index behind a `FileSystemWatcher` (ADR-0020).** Mirrors the Outline (ADR-0014); no webview UI, no protocol change. A workspace `FileSystemWatcher` **is** warranted here — the index must see files no editor has open — in deliberate contrast to ADR-0009, which left the *editor's* external-change detection to the managed `TextDocument`.
  * **Recorded as ADR?** Yes → **ADR-0020**.
* **Case-insensitive basename resolution; path-qualified targets resolve relative-first** (Producer decision). Ambiguous basenames link all matches; a note never backlinks itself.
  * **Recorded as ADR?** Yes → ADR-0020.
* **Wiki-links only in v1; no new setting; file-level grouping; snippet = the trimmed source line** (Producer decisions, plan §4).
  * **Recorded as ADR?** Covered by ADR-0020.
* **Keep `parseWikiTargets` / `linkIndex` pure** so QA can unit-test them without booting VS Code; the I/O lives in `LinkIndexService` (exercised manually / in the Extension Host layer).
  * **Recorded as ADR?** Covered by ADR-0020.

---

## 6. Assumptions Made

* **`workspace.asRelativePath(uri, false)` yields a stable, workspace-relative path** good enough for relative-first resolution between notes. Backslashes are normalised to `/` so the pure index is platform-independent. In a multi-root workspace, two roots with an identically-named file could collide on this key — acceptable for v1 (single-root is the common case), noted as a known issue.
* **`showTextDocument` opens the built-in text editor, not the MarkStudio webview.** The custom editor is registered at `priority: "option"`, so it does not hijack the navigation; `showTextDocument({ selection })` reliably reveals the linking line.
* **`workspace.findFiles("**/*.md")` with `exclude` left `undefined` applies the user's default `files.exclude` / `search.exclude`** — so `node_modules` and the like are skipped without bespoke filtering.
* **A debounced full reverse-index rebuild from cached parsed notes is cheap enough.** Only the changed file is re-read/re-parsed; the reverse index is rebuilt from the in-memory `Map`, which is O(total links) and runs after the 250 ms debounce.

---

## 7. Technical Debt Introduced

* **Wiki-links only.** Standard Markdown links (`[text](note.md)`) are not indexed (T-4.1a).
* **`#heading` is captured but grouped at the file level** (T-4.1c); heading-level backlinks are a follow-up.
* **In-preview wiki-link navigation is not wired** (T-4.1b); the panel resolves targets host-side, but clicking a `[[…]]` *inside the preview* still does nothing (the T-3.4 anchors carry `data-*` but no `href`).
* **The link index holds parsed links for every workspace `.md` file in memory.** Small per file (targets + lines + a snippet string), but proportional to vault size.
* **Multi-root path collisions** on the relative-path key are possible (see §6).
* **Carried over from earlier sessions:** Mermaid live re-theme (T-3.2); always-bundled KaTeX cost (T-3.1); `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2); task-list checkboxes are read-only (T-3.5).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **None.** The full local pipeline is green and T-4.1 is merged to `main`.
* **No outstanding merge gate:** Sprint 2 is closed. The manual EDH (F5) spot-check from the QA sign-off was completed by the maintainer at merge (backlinks list/snippet, click-to-open at line, live create/change/delete updates, case-insensitive + path-qualified resolution all confirmed — see [sprint-2/done.md](sprint-2/done.md)).

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host bundle **~25.4 KB → ~40.4 KB** (+~15.0 KB for `src/links/`); webview unchanged (Mermaid stays in its own lazy bundle)
* [x] `npm test` passes — **171 tests** (132 unit + 39 integration, `node:test`)
* [x] `npm run test:exthost` passes — 4 Extension Host lifecycle tests
* [x] **Manual verification in an Extension Development Host (F5)** — **done at merge** by the maintainer on a multi-file workspace: (1) `[[B]]` from A surfaces A with the linking line + snippet; (2) clicking opens A at the line; (3) create/change/delete each update the panel debounced without a manual refresh; (4) case-insensitive basename + path-qualified targets resolve; (5) large-workspace activation/typing stay responsive while the panel shows "Indexing…" then fills in.
* [x] Webview is not recreated on tab switch (unchanged this session; entirely host-side)
* [x] CodeMirror state preserved on tab switch (unchanged this session)
* [x] No protocol change; no new host ⇄ webview message
* [x] **CI run on GitHub — done** (ran green on the `feature/sprint-2` push/PR before merge)

---

## 10. Recommended Next Task

* **Task:** Execute **Sprint 3 → T-4.1b — In-preview wiki-link navigation** ([sprint-3/plan.md](sprint-3/plan.md)): make a `[[target]]` clicked **inside the preview** resolve via the host-side `src/links/` resolver (shipped in M4.1) and open the note at the linking/heading line. Then continue Phase 4 with **M4.2 — Hover preview for links**.
* **Why this one:** It is the most user-visible Phase 4 gap surfaced during the M4.1 F5 pass — clicking a `[[…]]` in the preview currently does nothing (T-3.4 anchors carry `data-wikilink-target` but no `href`). It reuses the merged resolver directly and is low-risk. M4.2 (the next *roadmap* milestone) is also resolver-backed, so T-4.1b is the natural stepping stone.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [sprint-3/plan.md](sprint-3/plan.md) — the Sprint 3 spec (scope, architecture, owners, DoD)
  * [design/backlinks.md](design/backlinks.md) + `src/links/` — the resolver + index to reuse (needs a new `resolveTarget(fromUri, target)` surface on `LinkIndexService`)
  * `src/webview/preview/wikiLinks.ts` — the anchors + `data-*` the click handler consumes
  * `src/messaging/messages.ts` — where the new typed `openWikiLink` (webview → host) message + boundary guard land
* **Definition of done for T-4.1b:** clicking a `[[target]]` in the preview opens the resolved note at the linking/heading line; resolution reuses `src/links/`; the new message is typed + boundary-validated; ambiguous/unresolved targets degrade gracefully; tests added; pipeline + CI green.

---

## 11. Open Questions for the Next Agent

* **Should backlinks index Markdown links (`[text](note.md)`) too, or stay wiki-link-only?** Producer scoped v1 to wiki-links (T-4.1a tracks the follow-up).
* **Should the relative-path key be hardened for multi-root workspaces** (e.g. fold in the workspace folder), or is single-root the assumed deployment?
* **Should the panel show a count / group by source file** when one note links the active note from several lines, or keep the current flat one-node-per-line list?
* **Next sprint base:** `feature/sprint-3` branches off `main` (`31fe689`). T-4.1b is purely additive plus a new typed `openWikiLink` message and a one-instance hoist of `LinkIndexService` to `extension.ts` (see [sprint-3/plan.md](sprint-3/plan.md) §3).
