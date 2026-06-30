# QA Sign-off — Sprint 6 / T-4.1a + T-4.1c (Backlinks v2)

> QA: **Ivy**. Date: 2026-06-30. Branch under test: `feature/sprint-6` (HEAD `bcc3edf`, PR pending → `main`, NOT merged).
> Scope: the Backlinks panel now surfaces backlinks for **both** wiki-links (`[[note]]`) and standard Markdown links (`[label](./other.md)`) for the active note, and promotes a `#heading` anchor on either style to the target heading's actual line via a description suffix `→ Heading` and a tooltip `→ Heading (line N)`. Per-kind icon (`$(symbol-reference)` for wiki, `$(link)` for Markdown). One new pure extractor (`src/links/parseMarkdownTargets.ts`); widened `linkIndex.ts` (`Backlink.kind?`, `Backlink.targetLine?: number | null`); widened `LinkIndexService.ts` (dual-parse merge + threads source text through `ParsedNote.text`); widened `BacklinksTreeProvider.ts` (per-kind icon + description + tooltip). No new dependency, setting, command, or message; no new heading parser (reuses `findHeadingLine` from `src/outline/headings.ts` via a per-build cache).
> Design: [docs/design/backlinks.md](../design/backlinks.md) §v2 follow-ups · ADR: [ADR-0024](../DECISIONS.md#adr-0024-markdown-link-backlinks-resolution--heading-level-promotion-policy).

---

## Verdict

- **Automated: ✅ PASS — 394 tests** (316 unit + 65 integration + 13 ext-host), 0 failures.
  Lint, both typechecks, and the build all clean. **Every pre-Sprint-6 M4.1 / T-4.1b / M4.2 / M4.4 assertion intact** (byte-for-byte backwards-compat on the wiki/no-heading record shape).
- **Manual EDH (F5):** Producer-owned sign-off per `sprint-6/plan.md` §6 row "D". Test plan documented in `AGENT_HANDOFF.md` §9.

The implementation matches the plan exactly: **no new runtime dependency, no new setting, no new command, no new message**; `NoteLink` is **widened**, not refactored (optional `kind` field); Markdown-link resolution is **explicit-path only** (no basename fallback — that's a wiki-link affordance); heading-level granularity stays in the **index + Backlinks panel only** (the Graph view stays note-level per ADR-0023); the per-build heading-line cache reuses the existing `findHeadingLine` from `src/outline/headings.ts` so no new heading parser was added; `composeBacklink` builds output records by hand so wiki/no-heading entries preserve their pre-Sprint-6 shape byte-for-byte.

**No application source was modified by QA.** The branch is **ready for Producer merge to `main`** (regular `--no-ff` merge, never squash/rebase, per plan §8).

---

## Evidence

| Check | Result |
|---|---|
| `npm run lint` | ✅ 0 warnings (eslint `--max-warnings 0` + prettier) |
| `npm run typecheck` | ✅ 0 errors |
| `npm run typecheck:test` | ✅ 0 errors |
| `npm run build` | ✅ host **74.9 kB** (+9.4 kB from Sprint 5) · preview ~2.0 MB · mermaid ~7.5 MB · graph 19.3 kB |
| `npm test` | ✅ 316 unit + 65 integration = **381**, 0 fail |
| `npm run test:exthost` | ✅ **13** Extension Host tests, 0 fail |
| **Total automated tests** | ✅ **394** (316 + 65 + 13), **0 fail** |
| Producer F5 matrix | ⏳ Producer-owned — pipeline gates above are the dev-team's deliverable |

## Test-layer breakdown

| Layer | Pre-Sprint-6 | Sprint 6 delta | After |
|---|---|---|---|
| Unit (`node:test`) | 257 | **+59** | **316** |
| Integration (jsdom) | 65 | 0 | 65 |
| Ext-host (`@vscode/test-electron`) | 13 | 0 | 13 |
| **Total** | **335** | **+59** | **394** |

Unit delta breakdown:

| Suite | Tests added | Coverage |
|---|---|---|
| `test/links/parseMarkdownTargets.test.ts` (new) | +33 | full extractor surface: front matter / fences / inline code / titles / anchors / externals / balanced parens / angle-bracket form / escapes / reference-style rejection / workspace-absolute rejection / non-`.md` rejection |
| `test/links/linkIndex.test.ts` (+) | +7 (T-4.1a) | Markdown-link resolution (explicit path, with anchor, missing target, mixed-kind aggregation) |
| `test/links/linkIndex.test.ts` (+) | +9 (T-4.1c) | Heading-line promotion + cache hit/miss + multi-source aggregation + missing-text degradation + per-build cache scope |
| `test/links/backlinksTreeProvider.test.ts` (new) | +10 | Mixed-kind fixture vault → real `buildLinkIndex` → real `BacklinksTreeProvider` rendering; asserts icon / description / tooltip / open-command / backwards-compat shape |

## Boundary-guard / backwards-compat checks

| Check | Status |
|---|---|
| Pre-Sprint-6 wiki/no-heading `Backlink` record shape is byte-for-byte identical | ✅ verified in `test/links/linkIndex.test.ts` ("does not add `kind` to wiki backlinks", "does not add `targetLine` when no heading anchor present") |
| `Backlink.kind` is absent on wiki entries (not `kind: undefined`) | ✅ `composeBacklink` only sets the field when `kind !== undefined` |
| `Backlink.targetLine` is absent when no heading anchor present | ✅ `composeBacklink` only sets the field when `resolveHeadingLineCached` returned something other than `undefined` |
| `Backlink.targetLine` is `null` (not `undefined`) when lookup ran + missed | ✅ `resolveHeadingLineCached` returns `null` only for the miss case; `undefined` for the no-lookup case |
| `ResolvedBacklink` mirrors the same backwards-compat pattern | ✅ `backlinksFor` builds by hand, only setting `kind` / `targetLine` when present on the underlying `Backlink` |
| Tree item description / tooltip suffix only appears when heading resolved | ✅ `BacklinksTreeProvider` gates the suffix on `heading !== null && targetLine !== undefined && targetLine !== null` |
| Phantom heading (unresolved) degrades silently (no broken suffix) | ✅ matches the M4.2 hover-preview "unresolved heading → top-of-note" policy |
| Per-kind icon (`$(symbol-reference)` / `$(link)`) | ✅ `BacklinksTreeProvider.iconPath` ternary |
| Markdown-link resolution rejects external URLs / reference-style / workspace-absolute / non-`.md` | ✅ `parseMarkdownTargets.ts` extractor + `+33` unit tests |
| Markdown-link resolution is explicit-path only (no basename fallback) | ✅ `resolveMarkdownTarget` does not call the basename map |
| Heading-line cache is per-build (not process-lifetime) | ✅ cache is a `Map` instantiated inside the `buildLinkIndex` closure |
| Graph view continues to render wiki + Markdown edges identically (note-level) | ✅ no `Backlink.targetLine` read in `graphModel.ts`; `LinkIndex.allEdges()` ignores `kind` for dedup |
| `findHeadingLine` reused (no new heading parser) | ✅ verified by import in `linkIndex.ts` |
| No new `package.json` `dependencies` entry | ✅ |
| No new `contributes.configuration` entry | ✅ |
| No new `contributes.commands` entry | ✅ |
| No new `src/messaging/messages.ts` message | ✅ |

## Known issues / not in scope (Producer-owned)

- **Producer F5 matrix.** Pipeline gates above are the dev-team's deliverable; Producer's F5 sweep is the human sign-off step per `sprint-6/plan.md` §6 row "D". Test plan documented in `AGENT_HANDOFF.md` §9 (mixed-kind fixture vault; theme matrix; icon + description / tooltip verification; graph picks up Markdown edges).
- **Per-kind edge styling in the Graph view.** The graph now sees both wiki and Markdown edges but renders them identically. Deferred as an ADR-0023 follow-up (ADR-0024 §Follow-Ups).
- **Markdown-link `title` attribute** is dropped in the Backlinks tooltip (`[label](./note.md "title")`). Rejected as noise in v1.
- **Reference-style Markdown links** (`[label][ref]` + `[ref]: ./note.md`) are explicitly rejected by the extractor — out of scope for v1; would need a two-pass link-definition resolver.
- **Backlinks panel grouping mode** (by source note, by target heading) — v1 stays flat.

## Approval

QA approves the branch for merge.
— Ivy, 2026-06-30
