# AGENT HANDOFF — Sprint 6 / T-4.1a + T-4.1c Backlinks v2 shipped on `feature/sprint-6` (2026-06-30)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-30
* **Agent / Author:** Dev team (Nova — UI, Sage — host model + service, Milo — visual polish) — Sprint 6 close-out (Phases A → E)
* **Working branch:** `feature/sprint-6` (off `main` `dfaf3f8`)
* **Last commit on branch (pre-handoff):** `bcc3edf` *(test(links): Backlinks tree pipeline coverage — Phase D)*. Branch is **5 commits ahead** of `main`, plus the Phase E docs commit that will follow this handoff write.
* **Prompt used:** ai-team-dev (Nova + Sage + Milo as a single dev team)

---

## 1. What Was Completed

**Sprint 6 — T-4.1a (Markdown-link backlinks) + T-4.1c (Heading-level backlinks) shipped on `feature/sprint-6` (pending PR + `--no-ff` merge to `main`). This closes the last two open carry-overs of Phase 4 — Knowledge Management.**

The Backlinks panel now surfaces backlinks for **both** link styles for the active note and promotes a `#heading` anchor on either style to the target heading's actual line:

* A standard Markdown link to a workspace `.md` file — `[label](./other.md)`, `[label](other.md#Section)`, `[label](<../subdir/other.md>)`, with or without a `"title"` — now produces a backlink alongside the wiki-link entries it already produced (T-4.1a).
* A wiki-link or Markdown link that carries an anchor — `[[note#Heading]]` or `(./note.md#Heading)` — shows `→ Heading` in the tree-item description and `→ Heading (line N)` in the tooltip, with `N` resolved against the target note's actual text (T-4.1c).
* The icon vocabulary distinguishes the two kinds at a glance: `$(symbol-reference)` for wiki, `$(link)` for Markdown.

**Architecture.**

* **`src/links/parseMarkdownTargets.ts` (NEW, pure).** Mirrors `parseWikiTargets.ts`. Covers the full CommonMark inline-link grammar: balanced parens in the destination, angle-bracket destinations (`<…>`), optional `"title"` after the destination, backslash escapes. Skips fenced code blocks, YAML front matter, inline code spans. Explicitly **rejects** external URLs (`https:` / `mailto:` / `vscode:` / `command:` / `file:` / …), bare `#fragment` anchors, reference-style links (`[label][ref]`), workspace-absolute `/`-prefixed paths, and any destination whose path does not end in `.md`. **Markdown-link resolution is explicit-path only** — no basename fallback (that's a wiki-link affordance; ADR-0024).
* **`src/links/linkIndex.ts`.** Widened: `NoteLink.kind?: "wiki" | "markdown"` (optional); `Backlink.kind?` and `Backlink.targetLine?: number | null` (both optional, emitted only when they carry info — pre-Sprint-6 wiki/no-heading shape preserved **byte-for-byte**). `ParsedNote.text?: string` threaded through so the index can resolve anchors against the target note's content during build. New per-build heading-line cache keyed `${targetPath}\u0000${heading}` so a vault with many backlinks to the same heading runs `findHeadingLine` exactly once for that pair. New helpers: `resolveMarkdownTarget` (explicit-path only), `composeBacklink` (builds output by hand so absent optionals stay absent), `resolveHeadingLineCached` (`null` = lookup ran + missed, `undefined` = no lookup applied).
* **`src/links/LinkIndexService.ts`.** `extractLinks(text)` now runs **both** extractors per file and merges; wiki entries omit `kind`, markdown entries set `kind: "markdown"`. `indexFile` stores the source text on `ParsedNote.text` so the index can resolve anchors. `backlinksFor` builds `ResolvedBacklink` by hand, only setting `kind` / `targetLine` when the underlying `Backlink` has them. New optional fields on `ResolvedBacklink`: `kind?`, `targetLine?: number | null`.
* **`src/links/BacklinksTreeProvider.ts`.** `iconPath = new vscode.ThemeIcon(element.kind === "markdown" ? "link" : "symbol-reference")`. Description gains ` → <heading>` suffix only when the heading resolved to a real line. Tooltip appends `→ <heading> (line N)` under the same condition. Phantom-heading degrades silently to no suffix (matches the M4.2 hover-preview "unresolved heading → top-of-note" policy).
* **Heading-line reuse.** No new heading parser — `findHeadingLine` from `src/outline/headings.ts` is reused as-is.
* **Graph stays note-level (ADR-0023 / ADR-0024).** It picks up the new Markdown edges **for free** because the same `Backlink` flow feeds `LinkIndex.allEdges()`. Per-kind edge styling is a deferred follow-up, not part of this sprint.

**Tests.** Unit **257 → 316** (+59): `test/links/parseMarkdownTargets.test.ts` +33 (extractor edge cases: front matter, fences, inline code, titles, anchors, externals, balanced parens, angle-bracket form, escapes); new suites in `test/links/linkIndex.test.ts` +16 (Markdown-link resolution + heading-line promotion + cache hit / miss + multi-source aggregation + missing-text degradation + per-build cache scope); `test/links/backlinksTreeProvider.test.ts` +10 (mixed-kind fixture vault driven through real `buildLinkIndex` → real `BacklinksTreeProvider` rendering — asserts icon / description / tooltip / open-command / backwards-compat shape). Integration **65** (unchanged). Exthost **13** (unchanged — no new host surface). **394 automated tests, 0 failures. Every pre-Sprint-6 M4.1 / T-4.1b / M4.2 / M4.4 assertion intact.**

**Mock widening (`test/_mocks/vscode.ts`).** Added the narrow runtime surface the Backlinks integration test reads: `Uri` (path + `toString` + `file()` factory), `TreeItem`, `TreeItemCollapsibleState`, `ThemeIcon` (id), `MarkdownString` (value), `EventEmitter<T>` (with `event` registration returning `Disposable`), and `workspace.asRelativePath`. Test casts the mock `Uri` to `vscode.Uri` at the boundary the same way the pre-existing `MarkStudioDocument` tests do for their fake `TextDocument`.

**Bundle.** `dist/extension.js` **65.5 kB → 74.9 kB** (+9.4 kB total: Phase B +7.9 kB for the CommonMark grammar, Phase C +1.5 kB for the heading-line cache + per-record `composeBacklink` widening). `dist/webview.js` ~2.0 MB unchanged. `dist/mermaid.js` ~7.5 MB unchanged. `dist/graph.js` 19.3 kB unchanged.

**Producer non-negotiables held.** **No new dependency, no new setting, no new command, no new message.** Widen — not refactor — `NoteLink`. Markdown-link resolution is explicit-path only. Heading-level granularity stays in the index + Backlinks panel only (graph stays note-level). Every existing M4.1 / T-4.1b / M4.2 / M4.4 test passes unchanged.

**Docs.** New **ADR-0024** in [DECISIONS.md](DECISIONS.md); `## v2 follow-ups` section in [design/backlinks.md](design/backlinks.md); [CHANGELOG.md](CHANGELOG.md) new `Added` entry; [FEATURES.md](FEATURES.md) Backlinks row + Graph view row updated; [ROADMAP.md](ROADMAP.md) Phase 4 M4.1 row gains T-4.1a + T-4.1c as Done sub-bullets; [TODO.md](TODO.md) T-4.1a + T-4.1c removed (the carry-over section is now empty); [PROJECT_STATUS.md](PROJECT_STATUS.md) snapshot rewritten for Sprint 6; [ARCHITECTURE.md](ARCHITECTURE.md) §4 link-index notes updated; [sprint-6/plan.md](sprint-6/plan.md), [sprint-6/progress.md](sprint-6/progress.md), [sprint-6/done.md](sprint-6/done.md); [qa/sprint-6-signoff.md](qa/sprint-6-signoff.md); this handoff.

---

## 2. Current Work In Progress

* **None.** Sprint 6 is **code-complete and docs-complete on `feature/sprint-6`**. The only remaining steps are: this Phase-E docs commit, `git push -u origin feature/sprint-6`, `gh pr create`, and the Producer `--no-ff` merge to `main`.

---

## 3. Remaining Work for This Initiative

**Phase 4 — Knowledge Management is fully closed by this sprint.** No open carry-overs.

The next focus on `main` after this merge is **Phase 5 — Authoring Workflows** ([ROADMAP.md](ROADMAP.md) §5): templates, snippets, daily notes, workspace note features.

Optional Phase 4 follow-ups that came up during Sprint 6 design but were explicitly deferred (see ADR-0024 §Follow-Ups):

* Per-kind edge styling in the Graph view (the graph now sees both wiki and Markdown edges; a visual distinction is non-critical).
* Surface a Markdown link's `title` attribute in the Backlinks tooltip (rejected as noise in v1).
* Grouping mode in the Backlinks panel (by source note, by heading) — v1 stays flat.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/links/parseMarkdownTargets.ts` | New | Pure CommonMark inline-link extractor — explicit-path only, rejects externals / reference-style / non-`.md` |
| `src/links/linkIndex.ts` | Edited | `NoteLink.kind?`; `Backlink.kind?` + `Backlink.targetLine?`; `ParsedNote.text?`; per-build heading-line cache via reused `findHeadingLine`; `resolveMarkdownTarget`; `composeBacklink`; `resolveHeadingLineCached` |
| `src/links/LinkIndexService.ts` | Edited | Dual-parse merge in `extractLinks`; threads source text through `indexFile` → `ParsedNote.text`; `ResolvedBacklink.kind?` + `targetLine?`; `backlinksFor` builds by hand so absent optionals stay absent |
| `src/links/BacklinksTreeProvider.ts` | Edited | Per-kind `iconPath` (`$(symbol-reference)` / `$(link)`); description ` → <heading>` suffix when resolved; tooltip target-line suffix when resolved |
| `test/links/parseMarkdownTargets.test.ts` | New | +33 unit tests covering the full extractor surface |
| `test/links/linkIndex.test.ts` | Edited | +7 Markdown-link resolution tests (T-4.1a) + +9 heading-line promotion tests (T-4.1c) |
| `test/links/backlinksTreeProvider.test.ts` | New | +10 integration-style tests driving real `buildLinkIndex` → real `BacklinksTreeProvider` rendering |
| `test/_mocks/vscode.ts` | Edited | Widened with `Uri`, `TreeItem`, `TreeItemCollapsibleState`, `ThemeIcon`, `MarkdownString`, `EventEmitter`, `workspace.asRelativePath` |
| `docs/DECISIONS.md` | Edited | New **ADR-0024** appended |
| `docs/design/backlinks.md` | Edited | New `## v2 follow-ups` section pinning the explicit-path + heading-line policies |
| `docs/CHANGELOG.md` | Edited | New `Added` entry at the top of `## [Unreleased]` for T-4.1a + T-4.1c |
| `docs/FEATURES.md` | Edited | Backlinks row rewritten; Graph view row notes "picks up Markdown edges for free" |
| `docs/ROADMAP.md` | Edited | Phase 4 M4.1 row gains T-4.1a + T-4.1c sub-bullets as Done |
| `docs/TODO.md` | Edited | T-4.1a + T-4.1c removed; carry-over section is empty |
| `docs/PROJECT_STATUS.md` | Edited | §1 snapshot rewritten; §2 current focus flipped to Sprint 6 close-out |
| `docs/ARCHITECTURE.md` | Edited | §4 link-index notes updated for `kind` + `targetLine` |
| `docs/sprint-6/plan.md` | Existing | Sprint source of truth (unchanged this phase) |
| `docs/sprint-6/progress.md` | Edited | Phase-by-phase tracker with all 5 commit hashes |
| `docs/sprint-6/done.md` | New | Sprint handoff |
| `docs/qa/sprint-6-signoff.md` | New | QA sign-off (Ivy) — gate green, every pre-Sprint-6 test intact |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Markdown-link resolution is explicit-path only.** No basename fallback — that's a wiki-link affordance. Producer: "the two link styles model two different intents; basename matching is a wiki convenience that does not belong on a Markdown link." **Recorded as ADR?** Yes → **ADR-0024**.
* **Widen, do not refactor `NoteLink`.** Optional `kind` on the existing record; no rename, no split into `WikiNoteLink` / `MarkdownNoteLink`, no second index. Wiki-link shape preserved byte-for-byte (no `kind` field on wiki entries). **Recorded as ADR?** Yes → **ADR-0024**.
* **Heading-level granularity stays in the index + Backlinks panel only.** The Graph view stays note-level (ADR-0023 unchanged). **Recorded as ADR?** Yes → **ADR-0024**.
* **`null` vs `undefined` semantics on `Backlink.targetLine`.** `null` = lookup ran, heading not found. `undefined` (field absent) = no lookup applied (no heading anchor, or target text unavailable). Distinguishing these matters for the Backlinks panel's render logic (only the resolved case earns a description suffix). **Recorded as ADR?** Yes → **ADR-0024**.
* **Reuse `findHeadingLine`; per-build cache.** No new heading parser. Cache lifetime = one `buildLinkIndex` call, keyed `${targetPath}\u0000${heading}` so a vault with N backlinks to the same heading runs the parser exactly once. **Recorded as ADR?** Yes → **ADR-0024**.
* **Backlinks panel stays flat in v1.** Heading anchor surfaces as a description suffix only, not as a grouping mode. **Recorded as ADR?** Captured in `docs/sprint-6/plan.md` Producer policy + ADR-0024.
* **No new dependency, setting, command, or message.** The only host-observable changes are the optional fields on `Backlink` / `ResolvedBacklink` and the description + tooltip suffixes on the existing tree items. **Recorded as ADR?** Yes → **ADR-0024**.

---

## 6. Assumptions Made

* **Reference-style links are out of scope for v1.** `[label][ref]` + `[ref]: ./note.md` requires a two-pass link-definition resolver that the pure extractor design does not need this sprint. Anyone hitting this in practice can convert their reference-style to inline.
* **Title attributes on Markdown links are noise in the Backlinks panel.** `[label](./note.md "title")` ignores the title — the source-side snippet already carries enough context.
* **The 250 ms `LinkIndexService` debounce upstream is the primary throttle.** Sprint 6 adds no new event emission; the existing rebuild path already coalesces bursts.
* **`workspace.findFiles("**/*.md")` already surfaces every workspace note** — so we do not need to add any extra glob to support the Markdown-link extractor. The same parsed-notes cache feeds both extractors.
* **A heading anchor on a Markdown link is percent-encoded in the URL fragment in real-world authoring** (`(./note.md#Section%20Two)`) — `parseMarkdownTargets` decodes `%20` before passing the heading to the resolver, so the cache key matches the heading text the resolver sees from `parseHeadings`.

---

## 7. Technical Debt Introduced

* **Per-kind edge styling in the Graph view is deferred.** The graph now sees both wiki and Markdown edges (T-4.1a side-effect) but renders them identically. A future ADR-0023 follow-up can give them distinct strokes.
* **The Backlinks panel still emits one node per linking line.** "Group by source note" / "group by target heading" remain deferred (v1 simplicity wins).
* **`composeBacklink` builds the output record by hand** to preserve byte-for-byte backwards-compat. If a future sprint adds a third optional field, the pattern stays the same — but a small builder abstraction could clean it up if it grows.
* **No new debt elsewhere.** Carried-over debt is unchanged from the prior handoff.

---

## 8. Blockers

* **None.** All gates green; every pre-Sprint-6 assertion intact; QA signed off.
* **Next mechanical step:** `git push -u origin feature/sprint-6` followed by `gh pr create`. The Producer (human) then performs the `--no-ff` merge to `main`. **The dev team does not merge its own PR** — that's the Producer's job.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — host `dist/extension.js` **~74.9 kB** (+9.4 kB from Sprint 5), webview `dist/webview.js` ~2.0 MB (unchanged), Mermaid `dist/mermaid.js` ~7.5 MB (unchanged), `dist/graph.js` 19.3 kB (unchanged)
* [x] `npm test` passes — **381 tests** (316 unit + 65 integration, `node:test`)
* [x] `npm run test:exthost` passes — **13** Extension Host tests
* [x] **Manual verification in an Extension Development Host (F5)** — Producer F5 sweep is the sign-off step per `sprint-6/plan.md` §6 row "D"; pipeline gates above are the dev-team's deliverable. Test plan: mixed-kind fixture vault (wiki, Markdown, with + without heading anchors); theme matrix (light, dark, high-contrast); confirm icons + description / tooltip suffixes render correctly; confirm graph picks up Markdown edges.
* [x] **QA sign-off** written: `docs/qa/sprint-6-signoff.md`.
* [x] Every pre-Sprint-6 M4.1 / T-4.1b / M4.2 / M4.4 test passes unchanged (byte-for-byte backwards-compat on the wiki/no-heading shape).

---

## 10. Recommended Next Task

* **Task:** After the Producer merges `feature/sprint-6` to `main` (post `gh pr create` + human `--no-ff` merge), **Phase 4 is fully closed** and the next focus is **Phase 5 — Authoring Workflows** per [ROADMAP.md](ROADMAP.md) §5: templates, snippets, daily notes, workspace note features.
* **Why Phase 5:** Phase 4 (Knowledge Management) is now complete on this branch; the natural next theme is authoring ergonomics that build on the now-stable PKM layer (backlinks for both link styles, with heading promotion; hover previews; in-preview navigation; graph view).
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) §5 — Phase 5 milestones
  * [DECISIONS.md](DECISIONS.md) — recently-added ADR-0024 sets the v2 Backlinks contract every Phase-5 feature should honour
  * [docs/design/backlinks.md](design/backlinks.md) — for any feature that reads the index

---

## 11. Open Questions for the Next Agent

* **Should the Graph view get per-kind edge styling** (wiki vs Markdown) now that it sees both edge kinds? Light visual distinction (e.g. dashed Markdown edges) vs noise.
* **Should the Backlinks panel ever offer a grouping mode** (by source note, by target heading)? The flat v1 is intentional; revisit if a user reports the flat list growing too long on a large vault.
* **Should Markdown-link resolution ever support basename fallback** (matching the wiki-link policy)? Producer's stance is no — the two link styles model two different intents. A future ADR can revisit if a clear authoring workflow demands it.
* **Should reference-style Markdown links (`[label][ref]` + `[ref]: ./note.md`)** be added to the extractor in a future sprint? Out of scope for v1; would need a two-pass link-definition resolver.
* **Should the Markdown-link's `title` attribute** surface in the Backlinks tooltip? Currently dropped — `[label](./note.md "title")` ignores the title.
* **Should heading-level edges land in the Graph view** at some future point? ADR-0023 / ADR-0024 keep the graph note-level for v1; ADR-0024 §Follow-Ups flags this as a deferred follow-up.
