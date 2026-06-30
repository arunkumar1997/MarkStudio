# Sprint 6 — Done (T-4.1a + T-4.1c / Backlinks v2)

> Close-out record. Written by the dev team (Nova + Sage + Milo) at branch ready. History lives in git.

---

## Outcome

**T-4.1a (Markdown-link backlinks) + T-4.1c (Heading-level backlinks)** are **complete on `feature/sprint-6`, pending PR + `--no-ff` merge to `main`**.

The Backlinks panel now surfaces backlinks for **both** link styles for the active note and promotes a `#heading` anchor on either style to the target heading's actual line:

- A standard Markdown link to a workspace `.md` file (`[label](./other.md)`, `[label](other.md#Section)`, `[label](<../sub/other.md>)`, with or without a `"title"`) now produces a backlink alongside the wiki-link entries it already produced (T-4.1a).
- A wiki-link or Markdown link that carries an anchor (`[[note#Heading]]` or `(./note.md#Heading)`) shows `→ Heading` in the tree-item description and `→ Heading (line N)` in the tooltip, with `N` resolved against the target note's actual text (T-4.1c).
- The icon vocabulary distinguishes the two kinds at a glance: `$(symbol-reference)` for wiki, `$(link)` for Markdown.

- **Branch:** `feature/sprint-6` (off `main`); 5 commits ahead + the Phase E docs commit.
- **ADR:** **ADR-0024** — Markdown-link backlinks resolution rules + heading-level promotion policy.
- **This closes Phase 4 — Knowledge Management.** The remaining open carry-overs T-4.1a + T-4.1c are now shipped; no open Phase 4 work remains.

## Verification

- **Automated — PASS (394 tests, 0 failures):** 316 unit (+59) · 65 integration · 13 exthost.
- **Gate:** `npm run lint` (eslint `--max-warnings 0` + prettier) · `npm run typecheck` · `npm run typecheck:test` · `npm run build` — all green.
- **Bundle deltas:** host `dist/extension.js` **65.5 → 74.9 kB** (+9.4 kB total: Phase B +7.9 kB for the CommonMark grammar, Phase C +1.5 kB for the heading-line cache + per-record `composeBacklink` widening). Preview, Mermaid, and graph bundles unchanged.
- **Producer F5:** scheduled per `sprint-6/plan.md` §6 row "D" (Producer-owned). Pipeline gates above are the dev-team's deliverable.
- QA sign-off: [../qa/sprint-6-signoff.md](../qa/sprint-6-signoff.md).

## Commits

| Commit | Description |
|---|---|
| `c0c27d5` | docs(sprint-6): ADR-0024 + design v2 section (Phase A) |
| `7eb1dcf` | feat(links): Markdown-link backlinks (T-4.1a, Phase B) |
| `752a6ac` | feat(links): heading-level backlinks (T-4.1c, Phase C) |
| `bcc3edf` | test(links): Backlinks tree pipeline coverage (Phase D) |
| `9121623` | docs(sprint-6): close-out + QA sign-off (Phase E) |

(The Phase E hash is recorded in `progress.md` as soon as this doc commits.)

## What shipped

### Host (extension)

- `src/links/parseMarkdownTargets.ts` (new, pure) — mirrors `parseWikiTargets.ts`. Full CommonMark inline-link grammar (balanced parens, angle-bracket destinations, optional `"title"`, backslash escapes). Skips fenced code blocks, YAML front matter, inline code spans. Explicitly rejects external URLs, bare `#fragment` anchors, reference-style links, workspace-absolute `/`-prefixed paths, and non-`.md` destinations.
- `src/links/linkIndex.ts` — widened: `NoteLink.kind?: "wiki" | "markdown"` (optional); `Backlink.kind?` and `Backlink.targetLine?: number | null` (both optional, emitted only when they carry info — pre-Sprint-6 wiki/no-heading shape preserved byte-for-byte). `ParsedNote.text?: string` threaded through so the index can resolve anchors against the target note's content during build. New per-build heading-line cache keyed `${targetPath}\u0000${heading}`. New helpers: `resolveMarkdownTarget` (explicit-path only), `composeBacklink` (preserves absent optionals), `resolveHeadingLineCached` (`null` = lookup ran + missed, `undefined` = no lookup).
- `src/links/LinkIndexService.ts` — `extractLinks(text)` runs both extractors per file and merges; `indexFile` stores the source text on `ParsedNote.text`; `backlinksFor` builds `ResolvedBacklink` by hand so absent optionals stay absent. New optional fields on `ResolvedBacklink`: `kind?`, `targetLine?: number | null`.
- `src/links/BacklinksTreeProvider.ts` — per-kind `iconPath` (`$(symbol-reference)` / `$(link)`); description ` → <heading>` suffix when resolved; tooltip appends `→ <heading> (line N)` when resolved. Phantom-heading degrades silently to no suffix.
- **Heading-line reuse.** No new heading parser — `findHeadingLine` from `src/outline/headings.ts` is reused as-is via the per-build cache.
- **Graph stays note-level (ADR-0023 / ADR-0024).** It picks up the new Markdown edges **for free** because the same `Backlink` flow feeds `LinkIndex.allEdges()`. Per-kind edge styling is deferred.

### Producer non-negotiables held

- **No new dependency, no new setting, no new command, no new message.**
- **Widen — not refactor — `NoteLink`.** Optional `kind` on the existing record; no rename, no split, no second index.
- **Markdown-link resolution is explicit-path only.** No basename fallback.
- **Heading-level granularity stays in the index + Backlinks panel only.** Graph stays note-level.
- **Every existing M4.1 / T-4.1b / M4.2 / M4.4 test passes unchanged.** Byte-for-byte backwards-compat on the wiki/no-heading record shape.

### Tests

- `test/links/parseMarkdownTargets.test.ts` (new, +33 unit) — front matter, fences, inline code, titles, anchors, externals, balanced parens, angle-bracket form, escapes, reference-style rejection, workspace-absolute rejection, non-`.md` rejection.
- `test/links/linkIndex.test.ts` (+16) — Markdown-link resolution (T-4.1a, +7); heading-line promotion + cache hit/miss + multi-source aggregation + missing-text degradation + per-build cache scope (T-4.1c, +9).
- `test/links/backlinksTreeProvider.test.ts` (new, +10 integration-style) — mixed-kind fixture vault driven through real `buildLinkIndex` → real `BacklinksTreeProvider` rendering; asserts icon / description / tooltip / open-command / backwards-compat shape.
- `test/_mocks/vscode.ts` — widened with `Uri`, `TreeItem`, `TreeItemCollapsibleState`, `ThemeIcon`, `MarkdownString`, `EventEmitter<T>`, `workspace.asRelativePath`. Test casts the mock `Uri` to `vscode.Uri` at the boundary (matches the pre-existing `MarkStudioDocument` pattern).
- **No integration or exthost delta.** No new host surface; existing 65 integration + 13 exthost tests continue to pass.

### Docs

- **New ADR-0024** in `docs/DECISIONS.md` — Markdown-link backlinks resolution rules + heading-level promotion policy.
- **`## v2 follow-ups` section** at the bottom of `docs/design/backlinks.md` — pins the explicit-path + heading-line policies + the `null` vs `undefined` semantics.
- `docs/CHANGELOG.md` — new `Added` entry at the top of `## [Unreleased]`.
- `docs/FEATURES.md` — Backlinks row rewritten; Graph view row notes "picks up Markdown edges for free".
- `docs/ROADMAP.md` — Phase 4 M4.1 row gains T-4.1a + T-4.1c sub-bullets as Done.
- `docs/TODO.md` — T-4.1a + T-4.1c removed; carry-over section now empty.
- `docs/PROJECT_STATUS.md` — §1 snapshot rewritten for Sprint 6; §2 current focus flipped.
- `docs/ARCHITECTURE.md` — §4 link-index notes updated for `kind` + `targetLine` + the new extractor.
- `docs/sprint-6/plan.md` — sprint source of truth (unchanged).
- `docs/sprint-6/progress.md` — phase-by-phase tracker with all 5 commit hashes.
- `docs/qa/sprint-6-signoff.md` — QA sign-off (Ivy).
- `docs/AGENT_HANDOFF.md` — rewritten for Sprint 6.

## Bundle deltas

| Bundle | Before (Sprint 5) | After (Sprint 6) | Delta |
|---|---|---|---|
| `dist/extension.js` | 65.5 kB | **74.9 kB** | **+9.4 kB** |
| `dist/webview.js` | ~2.0 MB | ~2.0 MB | unchanged |
| `dist/mermaid.js` | ~7.5 MB | ~7.5 MB | unchanged |
| `dist/graph.js` | 19.3 kB | 19.3 kB | unchanged |

Phase B contributed +7.9 kB (CommonMark grammar in `parseMarkdownTargets.ts`); Phase C contributed +1.5 kB (heading-line cache + per-record `composeBacklink` widening + `resolveHeadingLineCached`).

## Phase summary

| Phase | Status | Output |
|---|---|---|
| **A — ADR + design** | ✅ committed `c0c27d5` | ADR-0024; design v2 follow-ups |
| **B — Markdown extractor + index widening** | ✅ committed `7eb1dcf` | `parseMarkdownTargets.ts`; `linkIndex.ts` + `LinkIndexService.ts` + `BacklinksTreeProvider.ts` widened for `kind`; +33 + +7 unit tests; gate 290 unit + 65 integration + 13 exthost = 368 |
| **C — Heading-line promotion** | ✅ committed `752a6ac` | per-build heading-line cache; `Backlink.targetLine`; tooltip + description suffix; +9 unit tests; gate 306 unit + 65 integration + 13 exthost = 384 |
| **D — Integration test** | ✅ committed `bcc3edf` | `backlinksTreeProvider.test.ts` (+10); widened `test/_mocks/vscode.ts`; gate 316 unit + 65 integration + 13 exthost = 394 |
| **E — Docs + close-out** | 🟡 in this commit | this doc; QA sign-off; CHANGELOG / ROADMAP / FEATURES / TODO / PROJECT_STATUS / ARCHITECTURE / AGENT_HANDOFF |

## Compliance checklist

| Producer rule | Status |
|---|---|
| Zero new dependency | ✅ (no `package.json` `dependencies` delta) |
| Zero new setting | ✅ (no `package.json` `contributes.configuration` delta) |
| Zero new command | ✅ (no `package.json` `contributes.commands` delta) |
| Zero new message | ✅ (no `src/messaging/messages.ts` delta) |
| Widen — not refactor — `NoteLink` | ✅ (`kind` is optional; no rename, no split) |
| Markdown-link resolution is explicit-path only | ✅ (no basename fallback in `resolveMarkdownTarget`) |
| Heading-level lives in the index + Backlinks panel only | ✅ (graph stays note-level — no `Backlink.targetLine` read in `graphModel.ts`) |
| Every existing M4.1 / T-4.1b / M4.2 / M4.4 test passes unchanged | ✅ (byte-for-byte backwards-compat on the wiki/no-heading shape) |
| One phase per commit | ✅ (5 commits, A → E) |
| Producer does the `--no-ff` merge | ⏳ pending push + PR |

## Handoff

The next agent picks up from `docs/AGENT_HANDOFF.md` (Sprint 6 close-out). After the Producer merges `feature/sprint-6` to `main`, the next focus is **Phase 5 — Authoring Workflows** per `docs/ROADMAP.md` §5.
