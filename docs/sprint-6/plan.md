# Sprint 6 — Phase 4 carry-overs (T-4.1a + T-4.1c)

> Producer: **Remy**. Created 2026-06-30. Phase 4 carry-over sprint — finishes the two follow-ups left open by M4.1 / T-4.1b / M4.2 / M4.4.
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).
> Branch: `feature/sprint-6` off `main` (`dfaf3f8`).

---

## 1. Sprint Goal

Close the two Phase 4 carry-overs in a single sprint, on the shared infrastructure they both touch:

* **T-4.1a — Markdown-link backlinks.** Standard Markdown links (`[text](./note.md)`, `[text](note.md#heading)`) now feed the same backlinks index that wiki-links already feed. The Backlinks panel surfaces both. The Graph view picks them up for free through `LinkIndex.allEdges()`.
* **T-4.1c — Heading-level backlinks.** A link that targets `#heading` is resolved to a heading **line** (via the existing `findHeadingLine` / `parseHeadings`), not just captured-and-collapsed to the file. The Backlinks panel shows the target heading in the tree-item description; the panel still lists one entry per linking line (no new grouping mode in v1).

After this sprint, **Phase 4 is fully closed** with no open follow-ups.

## 2. Scope (Producer decisions)

**In scope**

* **One new pure extractor** — `src/links/parseMarkdownTargets.ts`. Mirrors `parseWikiTargets.ts`: skips code fences / YAML front matter / inline code, scans for `[text](destination)` (incl. titled `[text](dest "title")`), and emits a `{ target, heading, line, snippet }` for each link whose destination is a relative `.md` path. External links (`http://`, `https://`, `mailto:`, `tel:`, `file://`, etc.), bare anchors (`[text](#heading)`), and reference-style links (`[text][id]`) are skipped in v1.
* **Unified link record** — extend `NoteLink` in `linkIndex.ts` with `kind: "wiki" | "markdown"`. Both parsers feed the same builder; the reverse index and `allEdges()` carry the kind through.
* **Markdown-link resolution rules** — explicit-path only, **no basename fallback** (Markdown links are author-explicit; basename matching is a wiki-link affordance). Resolution path:
  1. Strip any `?query` / `#anchor` from the destination.
  2. Trim wrapping `<…>` if present.
  3. Skip if the destination is an absolute URL (`scheme:` prefix), starts with `//`, starts with `#`, or is empty.
  4. Normalise via `joinPath(dirname(sourcePath), destination)` (the same helper `resolveTarget` already uses for path-qualified wiki-links) and look up case-insensitively in `canonicalByLowerPath`.
  5. If the file does not exist in the index, drop the link.
* **Heading promotion (T-4.1c)** — extend `Backlink` and `GraphEdge` consumers with an optional `targetLine: number | null` field (heading line in the **target** note, not the source). Computed lazily per (target, heading) pair using `findHeadingLine` from `src/outline/headings.ts`; cached on the index for the build pass so a heavily-linked heading is not re-scanned per backlink. `null` when the heading is not found in the target note (graceful degradation: the link still backlinks at the file level).
* **`LinkIndexService`** — call **both** extractors when parsing a note (`parseWikiTargets(text)` + `parseMarkdownTargets(text)`); merge into one `NoteLink[]` tagged with `kind`. No new public method, no new event, no resolver change.
* **`BacklinksTreeProvider`** — tree-item description gains `→ <heading>` when `backlink.heading` is non-null, regardless of kind. Tree-item `iconPath` reflects the link kind (`$(link)` for Markdown, `$(symbol-reference)` for wiki — both Codicons; subject to Milo's visual review).
* **Graph view (M4.4)** — **no code change**. Already iterates `LinkIndex.allEdges()`; Markdown-link edges flow in automatically once the index produces them. Edge weight semantics are unchanged (one entry per ordered pair, summing occurrences across both link kinds).
* **Hover preview (M4.2)** — **no code change**. Already heading-aware via `extractExcerpt` / `findHeadingLine`. Markdown-link hover is not contributed (preview clicks/hovers route through `data-wikilink-*` attributes; standard Markdown links already render as ordinary `<a>` and follow VS Code's default open behaviour). Out of scope for this sprint — see §3 below.
* **One ADR (ADR-0024)** — records the Markdown-link resolution rules and the heading-level promotion policy. Updates ADR-0020 (the backlinks design) by reference.
* **Pipeline gate:** lint clean, typecheck clean, build clean, all three test layers green; target ~30–45 new tests (mostly unit, a handful of integration, zero new exthost — no new host surface).

**Out of scope (explicit, tracked separately if at all)**

* **Hover preview on standard Markdown links.** The hover-card path (`requestLinkPreview`/`linkPreviewContent`) is wiki-link only (M4.2). Adding Markdown-link hover would need a second delegated listener and a re-evaluation of the security boundary — defer.
* **In-preview Markdown-link click interception.** Standard Markdown links in the preview already work via VS Code's default `<a>` handling; we are **not** routing them through `provider.openInMarkStudio` in this sprint. (T-4.1b's `openWikiLink` is wiki-specific.) Revisit only if a user signal asks for it.
* **Reference-style Markdown links** (`[text][id]` + `[id]: ./note.md`). Skipped in v1; the index would need a two-pass resolver. Tracked as a follow-up.
* **External-link or footnote-link indexing.**
* **Heading-level *grouping* in the Backlinks panel** ("show me everything pointing at the **Installation** heading as a sub-group"). v1 keeps the flat one-per-line list; the heading is surfaced in the description only. Grouping is a deferred UX choice, not a correctness bug.
* **Heading-level *nodes* in the Graph view.** ADR-0023 keeps the graph at note-level granularity. Edges still carry the heading anchor in the data, but the renderer does not split a node per heading. Defer permanently unless a user signal justifies the complexity.
* **New setting / new command / new dependency.** None.

## 3. Architecture

Touches three files in `src/links/` plus the Backlinks panel. **No protocol message changes, no webview-bundle changes, no graph-view changes.** The work is host-side and pure-extractor-additive.

| File | Responsibility | Must NOT |
|---|---|---|
| `src/links/parseMarkdownTargets.ts` (new, **pure**) | `parseMarkdownTargets(text): MarkdownTarget[]`. Walks lines, skips front-matter / fences / inline code, emits one entry per relative-`.md` link. Mirrors `parseWikiTargets.ts` shape: `{ target, heading, line, snippet }`. | Import `vscode`/DOM; resolve paths; accept external URLs |
| `src/links/linkIndex.ts` | Extend `NoteLink` with `kind`; widen `Backlink` with `kind` + `targetLine: number \| null`; widen `GraphEdge` with `weight` per kind (or keep summed — see §4.6); add a per-build heading-line cache so `findHeadingLine` runs at most once per (targetPath, heading) pair; add a `resolveMarkdownTarget` helper alongside the existing `resolveTarget`. **No behavioural change for wiki-only inputs** — every existing unit test must still pass without modification. | Touch the wiki-link resolver semantics |
| `src/links/LinkIndexService.ts` | When (re-)parsing a note, run `parseMarkdownTargets(text)` next to `parseWikiTargets(text)` and merge with `kind` tags. **Heading-line resolution needs target-note text**, so either (a) cache parsed-note text alongside `ParsedNote`, or (b) compute heading lines lazily inside `buildLinkIndex` when both endpoints are present. Option (b) is preferred — pure builder, no extra state. | Add a second `FileSystemWatcher`; re-scan synchronously |
| `src/links/BacklinksTreeProvider.ts` | Render `kind` as a Codicon `iconPath`; render `heading` as ` → <heading>` in the tree-item description; tooltip gains the target line number when `targetLine` is non-null. | Add a new view; change tree shape (still flat); change command id |
| `src/extension.ts` | **No change.** | — |
| `package.json` | **No change** (no new command / view / setting). | — |
| `src/graph/*` | **No change.** Graph already consumes `allEdges()`. | — |
| `docs/DECISIONS.md` | Append **ADR-0024**: Markdown-link backlinks + heading-level resolution policy. | — |
| `docs/design/backlinks.md` | Append a "v2 follow-ups (T-4.1a + T-4.1c)" section describing the parser, resolver, and tree-item change. | — |

**Reuse, don't duplicate.** The Markdown extractor borrows the front-matter / fence / inline-code skipping logic from `parseWikiTargets.ts` — the *shape* should mirror exactly so the diff between the two parsers is visually small (this is a maintainability win). The heading-line resolver is `findHeadingLine` from `src/outline/headings.ts` (already in production for M4.2's hover preview and T-4.1b's click navigation) — do not write a second one.

## 4. Producer decisions (pre-empt scope creep)

1. **Markdown-link paths are explicit-only.** No basename fallback — that's a wiki-link affordance. A `[text](Guide.md)` from `notes/foo.md` resolves to `notes/Guide.md`, not to a random `Guide.md` somewhere else in the workspace. (Authors who want fuzzy matching can use `[[Guide]]`.)
2. **Markdown-link absolute paths are skipped in v1.** A leading `/` is ambiguous across multi-root workspaces and is uncommon in note-style writing; defer until a user signal justifies it.
3. **Heading-line resolution is per-target, cached for the build pass.** A workspace with 500 notes and 50 backlinks to the same heading still calls `findHeadingLine` once for that pair. Cache lives inside `buildLinkIndex`'s closure (not on the service) so it is naturally scoped to one rebuild.
4. **Heading miss = file-level backlink, never a drop.** A `[[note#typo-heading]]` (or `[text](./note.md#typo)`) where the heading does not exist in the target note still backlinks at the file level — `targetLine: null` is rendered as no description suffix. This matches the existing M4.2 hover-preview policy (unresolved heading → top-of-note excerpt).
5. **The Backlinks panel stays flat — one entry per linking line.** No new grouping mode in v1. Heading-level visibility is the description suffix only. Grouping is a deferred UX choice ("group by source note", "group by target heading") — pulling it forward would risk a second redesign once both kinds are in.
6. **Edge weight collapses across both kinds.** `LinkIndex.allEdges()` continues to dedupe per (from, to) and sum weights. If author writes both `[[B]]` and `[text](./B.md)` in note A, the A→B edge has `weight: 2`. The graph view renders a slightly heavier edge — no per-kind split in v1.
7. **Icon vocabulary for the Backlinks tree.** Wiki = `$(symbol-reference)`; Markdown = `$(link)`. Milo confirms in Phase D's theme matrix. Both Codicons are already loaded (T-107) — no asset change.
8. **Tooltip surfaces target line, not slug.** When `targetLine` is non-null, the tree-item tooltip ends with `→ <heading> (line N)`. This is information the user might actually click to reach; the slug is internal.
9. **Zero new runtime dependencies, zero new settings, zero new commands.** Confirmed.
10. **Backwards compatibility.** Every M4.1 + T-4.1b + M4.2 + M4.4 test must still pass without modification — only **additive** assertions land on the existing suites. New behaviour is covered by new tests.
11. **Performance.** The Markdown extractor is O(text length) (single linear scan, same as wiki). The heading-line cache makes the per-build cost O(distinct (target, heading) pairs) calls to `parseHeadings` rather than O(backlinks). Watcher rebuild stays under the existing 250 ms debounce.

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| **A** | **Design + ADR-0024 + extension to `design/backlinks.md`** | **Remy / Sage** |
| 1 | `parseMarkdownTargets.ts` (pure) — extractor + unit tests | **Sage** |
| 2 | `linkIndex.ts` — `NoteLink.kind`, `Backlink.targetLine`, heading-line cache; `resolveMarkdownTarget`; widen `allEdges` if needed | **Sage** |
| 3 | `LinkIndexService.ts` — call both parsers, merge tagged links | **Sage** |
| 4 | `BacklinksTreeProvider.ts` — `iconPath` per kind, heading description, tooltip target-line | **Milo** (visual) + **Sage** (wiring) |
| 5 | Unit tests: extractor edge cases (front-matter, fences, inline code, titles, anchors, externals); index integration (mixed wiki+Markdown notes); heading-line cache hit/miss; backwards-compat on wiki-only inputs | **Ivy** |
| 6 | Integration test: a Backlinks tree refresh against a fixture vault with mixed link kinds + heading anchors; assert flat list ordering + description suffix | **Ivy** |
| 7 | Docs pass: ADR-0024, `design/backlinks.md` (v2 section), `CHANGELOG.md`, `FEATURES.md`, `ROADMAP.md` (Phase 4 → fully closed), `TODO.md` (T-4.1a / T-4.1c → Done), `ARCHITECTURE.md` (note kind support), `PROJECT_STATUS.md`, `AGENT_HANDOFF.md`, sprint-6 `done.md`, QA `sprint-6-signoff.md` | **Sage + Remy** |
| 8 | Manual F5: open a small fixture workspace mixing wiki + Markdown + heading anchors; verify Backlinks panel description; verify Graph view picks up the new edges; theme matrix (dark / light / high-contrast) on the Backlinks tree icons | **Ivy** + human |

## 6. Phases

| Phase | Scope | Exit |
|---|---|---|
| **A — Design** | This plan + ADR-0024 + `design/backlinks.md` v2 section | Plan committed on `feature/sprint-6` |
| **B — T-4.1a host** | `parseMarkdownTargets.ts`, `linkIndex.ts` (kind), `LinkIndexService.ts` (dual-parse), `BacklinksTreeProvider.ts` (icon). All wiki-only tests still green. | Lint + typecheck + build + tests green; Markdown-link backlinks visible in F5 |
| **C — T-4.1c heading promotion** | `Backlink.targetLine`, heading-line cache in `buildLinkIndex`, `BacklinksTreeProvider` description + tooltip | Heading description visible in F5; cache asserted by unit test (no extra `parseHeadings` calls) |
| **D — Tests + F5 matrix** | New unit + integration tests; manual F5 sanity sweep | All gates green; F5 confirmed |
| **E — Docs + QA sign-off** | Docs pass + `done.md` + `qa/sprint-6-signoff.md`; final commit; PR | Branch pushed + PR opened; human `--no-ff` merge |

## 7. Verification (sprint exit criteria)

* [ ] `npm run lint` clean (`--max-warnings 0` + `prettier --check .`).
* [ ] `npm run typecheck` and `npm run typecheck:test` clean.
* [ ] `npm run build` clean — host bundle delta within ~+2 kB (one new pure module + small index changes); no webview-bundle change; no `dist/graph.js` change.
* [ ] `npm test` green — unit baseline 257 → ~285 (+~30); integration 65 → ~70 (+~5); exthost 13 (unchanged — no new host surface).
* [ ] `npm run test:exthost` green.
* [ ] **Backwards compatibility:** every existing M4.1 / T-4.1b / M4.2 / M4.4 test passes without modification.
* [ ] Manual F5 against a mixed fixture vault: wiki + Markdown links + heading anchors → Backlinks panel renders correct icons + heading description; Graph view picks up Markdown edges; theme matrix correct.
* [ ] ADR-0024 written + accepted; `design/backlinks.md` v2 section written; all stat docs updated (`PROJECT_STATUS`, `AGENT_HANDOFF`, `ROADMAP`, `TODO`, `FEATURES`, `CHANGELOG`, `ARCHITECTURE`).
* [ ] QA sign-off written in `docs/qa/sprint-6-signoff.md`.

## 8. Risks + mitigations

| Risk | Mitigation |
|---|---|
| Markdown link grammar is broader than wiki (titles, angle-bracket destinations, line-wrapped link refs). | v1 supports: inline links, optional `"title"` after the destination, optional `<destination>` angle brackets. Reference-style and line-wrapped links are explicitly out of scope. The integration test fixture pins the supported grammar. |
| Heading-line cache could mask a real heading-text drift if the cache is shared across rebuilds. | Cache lives inside `buildLinkIndex`'s closure — a rebuild rebuilds the cache. Watcher-driven rebuilds therefore never serve stale heading lines. |
| Backlinks-panel description could grow unwieldy when both kind icon + heading anchor + line + snippet are present. | Truncate the snippet portion if the description exceeds ~80 chars (existing snippet trimming is already in place). Heading suffix is shown before the snippet so it is never the part that gets dropped. |
| Edge weight conflation could be ambiguous when both link kinds point at the same target. | Documented in ADR-0024. Per-kind split is a deferred follow-up. The graph view continues to render a single line per ordered pair, slightly thicker. |
| Multi-root workspace: a Markdown link `[text](../other-root/note.md)` could resolve outside the current root. | `LinkIndexService` already keys notes by workspace-relative path; an out-of-root resolution falls back to the index miss path (drop the link). Behaviour matches T-4.1's existing handling of cross-root wiki-links. |
| Phase B could grow if Sage decides to refactor the existing wiki-only `NoteLink` site instead of widening it. | Producer rule: **widen, don't refactor**. The diff to the existing index must be additive; renaming or splitting `NoteLink` into `WikiNoteLink` / `MarkdownNoteLink` is rejected for v1. |

## 9. Open questions (resolve during the sprint)

* **Should a Markdown link with a `title` (e.g. `[text](./note.md "title")`) surface the title in the Backlinks tooltip?** Default: no — keep parity with the wiki path (which has no title). Revisit if QA asks.
* **Should `[text](note.md)` (no `./`) be treated as relative-to-source or be rejected?** Default: relative-to-source. CommonMark treats relative destinations as relative to the source; no `./` is a stylistic choice.
* **Should the Backlinks tree show the kind icon next to the source-note label or use it as the tree-item `iconPath`?** Default: `iconPath`. Cleaner, themes correctly via Codicons.
* **Should the heading anchor be slug-normalised before lookup (lowercase, dashed) or matched literally against the heading source line?** Default: continue using `findHeadingLine` as-is — it already matches by trimmed heading text. Slug normalisation is the existing M4.2 / T-4.1b behaviour; do not diverge.
* **Should heading-level promotion also be reflected in the Graph view tooltip on hover?** Default: no in v1. The graph stays note-level.

## 10. Non-goals (just say no)

* No new dependency.
* No new VS Code setting, command, view, or contributed menu.
* No new host → webview message; no new webview → host message.
* No second link-index instance, no second `FileSystemWatcher`, no second async scan.
* No refactor of the wiki-link resolver, parser, or index shape — only additive widening.
* No transclusion (already dropped from scope).
* No persistence of graph layout (already deferred in ADR-0023).
* No heading-level *nodes* or per-kind edge split in the Graph view.

## 11. Definition of Done

* [ ] T-4.1a + T-4.1c land in **one** PR off `feature/sprint-6`.
* [ ] All exit-criteria boxes in §7 ticked.
* [ ] ADR-0024 accepted.
* [ ] [ROADMAP.md](../ROADMAP.md) updated: Phase 4 now has **zero** open follow-ups.
* [ ] [TODO.md](../TODO.md) moves T-4.1a + T-4.1c to **Done**.
* [ ] [docs/sprint-6/done.md](done.md) written; [docs/qa/sprint-6-signoff.md](../qa/sprint-6-signoff.md) written.
* [ ] [PROJECT_STATUS.md](../PROJECT_STATUS.md) snapshot updated.
* [ ] [AGENT_HANDOFF.md](../AGENT_HANDOFF.md) rewritten.

---

## Links

* Plan source-of-truth: this file.
* Live progress: [progress.md](progress.md).
* Sprint-end handoff (written at close): [done.md](done.md).
* Underpinning ADRs: ADR-0020 (backlinks design), ADR-0021 (in-preview wiki-link nav), ADR-0022 (hover preview), ADR-0023 (graph view).
* Upstream design: [../design/backlinks.md](../design/backlinks.md).
