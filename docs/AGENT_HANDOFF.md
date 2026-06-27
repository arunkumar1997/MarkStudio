# AGENT HANDOFF — T-3.4 Wiki-style links (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-3.4 session
* **Working branch:** `main` (repository is under git; changes from this session are uncommitted)
* **Last commit on this branch:** `faaa927` — *feat: implement word-wrap toggle and multiple cursors (T-2.5)* (Phase 2.5/3 work, incl. this session, is uncommitted on top of it)
* **Prompt used:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md) (Feature)

---

## 1. What Was Completed

Implemented **T-3.4 — Wiki-style links** (Phase 3 milestone M3.4). Wiki-style links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`, `[[note#heading|alias]]`) now render in the preview as styled links, gated behind a new `markstudio.preview.wikiLinks` setting (default on) and degrading to literal `[[…]]` text when off. Implemented with **no new dependency** as a small markdown-it **inline rule**.

* **`src/webview/preview/wikiLinks.ts` (new).** `applyWikiLinks(md)` registers a markdown-it inline rule **before** the built-in `link` rule, so a `[[` opener is claimed before the ordinary `[link](url)` parser sees it. The rule scans to the closing `]]`, rejects anything containing a newline or a nested `[`/`]`, parses the target / alias / heading, and pushes a `wikilink_open` (`a`) token carrying `class="markstudio-wikilink"`, `data-wikilink-target`, an optional `data-wikilink-heading`, and a `title` tooltip, a `text` token for the display label (alias, else the raw target text), and a `wikilink_close`. **No `import` of any new package.**
* **`src/webview/preview/PreviewRenderer.ts` (edited).** `createMarkdownIt(math, mermaid, callouts, wikiLinks)` applies the rule only when on; `setConfig` rebuilds the markdown-it instance when any preview flag (`math` / `mermaid` / `callouts` / `wikiLinks`) flips (ADR-0008).
* **`src/messaging/messages.ts` (edited).** `MarkStudioConfig` gained `wikiLinks: boolean`; the `isMarkStudioConfig` boundary guard now validates it.
* **`src/services/ConfigurationService.ts` (edited).** `read` resolves `preview.wikiLinks` (default `true`).
* **`src/webview/main.ts` (edited).** Themed `.markstudio-wikilink` styling driven entirely by `--vscode-*` variables (link colour + dashed underline, solid on hover) — a dashed underline marks the link as not-yet-resolved.
* **`package.json` (edited).** Contributed `markstudio.preview.wikiLinks` (boolean, default `true`, `resource` scope). No dependency added.
* **Tests (edited).** 6 new integration tests in `test/integration/previewRenderer.test.ts` (styled link with target when on, alias display, captured heading, literal-text fallback when off, ordinary `[link](url)` untouched, live `setConfig` toggle) + 2 new `ConfigurationService` cases; config fixtures updated for the `wikiLinks` field across all four config-bearing test files. Unit 83 → 85, integration 20 → 26.
* **Documentation pass:** [design/wiki-links.md](design/wiki-links.md) (new), **ADR-0018** in [DECISIONS.md](DECISIONS.md) (the previously missing ADR-0017 index row was also added), [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M3.4 → Done), [TODO.md](TODO.md) (T-3.4 → Done), [PROJECT_STATUS.md](PROJECT_STATUS.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-3.4 is complete and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (85 unit + 26 integration).
* **Note on verification:** A manual run in an Extension Development Host (F5) to confirm each wiki-link form renders as a styled link, the alias/heading are honoured, and toggling `markstudio.preview.wikiLinks` off degrades to literal `[[…]]` text live is the one outstanding verification (see §9).
* **Note on git:** This session's changes — plus the earlier uncommitted Phase 2.5/3 work (T-2.2 outline, T-3.1 math, T-3.2 mermaid, T-3.3 callouts) — sit together on top of `faaa927`. They have **not been committed**; see §8.

---

## 3. Remaining Work for This Initiative

Phase 3 — Modern Markdown is **~80% complete**. Done: M3.1 math (T-3.1), M3.2 Mermaid (T-3.2), M3.3 callouts (T-3.3), and M3.4 wiki links (T-3.4). One milestone remains, seeded in [TODO.md](TODO.md):

1. **T-3.5 — Footnotes & GFM completeness (M3.5).** Footnotes, task lists, tables, and strikethrough via markdown-it plugins, each toggleable; verify they render and degrade gracefully.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/webview/preview/wikiLinks.ts` | New | `applyWikiLinks(md)` — dependency-free markdown-it inline rule |
| `src/webview/preview/PreviewRenderer.ts` | Edited | `createMarkdownIt(math, mermaid, callouts, wikiLinks)`; `setConfig` rebuilds on any preview-flag flip |
| `src/messaging/messages.ts` | Edited | `MarkStudioConfig.wikiLinks`; `isMarkStudioConfig` validates it |
| `src/services/ConfigurationService.ts` | Edited | `read` resolves `preview.wikiLinks` |
| `src/webview/main.ts` | Edited | Themed `.markstudio-wikilink` styling via `--vscode-*` |
| `package.json` | Edited | Contributed `markstudio.preview.wikiLinks` |
| `test/integration/previewRenderer.test.ts` | Edited | +6 wiki-link integration tests; `CONFIG` gained `wikiLinks` |
| `test/services/ConfigurationService.test.ts` | Edited | +2 `wikiLinks` tests; fixtures updated |
| `test/messaging/messages.test.ts` | Edited | `VALID_CONFIG` gained `wikiLinks` |
| `test/integration/createEditor.test.ts` | Edited | `CONFIG` gained `wikiLinks` |
| `docs/design/wiki-links.md` | New | Design note for the wiki-link rule |
| `docs/DECISIONS.md` | Edited | ADR-0018 (dependency-free wiki-link rule); ADR-0017 index row added |
| `docs/api/message-protocol.md` | Edited | `MarkStudioConfig` now includes `wikiLinks` |
| `docs/CHANGELOG.md` | Edited | New T-3.4 Added entry |
| `docs/FEATURES.md` | Edited | Wiki links → Shipped |
| `docs/ROADMAP.md` | Edited | M3.4 → Done |
| `docs/TODO.md` | Edited | T-3.4 → Done |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-3.4 |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Implement wiki links as a dependency-free markdown-it inline rule** rather than pulling an npm wiki-link plugin. The rule is ~60 lines and fully under our control, and most plugins hard-code a URL resolver we do not want until Phase 4.
  * **Recorded as ADR?** Yes → **ADR-0018** in [DECISIONS.md](DECISIONS.md).
* **Register the rule before the built-in `link` rule.** This claims the `[[` opener before the ordinary `[link](url)` parser; a single `[` falls straight through, so existing link/reference syntax is untouched.
  * **Recorded as ADR?** Yes — covered by ADR-0018.
* **Defer resolution to Phase 4.** v1 styles the link and carries `data-wikilink-target` / `data-wikilink-heading`; the anchor has no `href` and does not navigate yet.
  * **Recorded as ADR?** Yes — covered by ADR-0018.
* **Default `wikiLinks` to `true`.** Consistent with the math / mermaid / callouts toggles.
  * **Recorded as ADR?** No — a default value, covered by the feature entry and ADR-0018.

---

## 6. Assumptions Made

* **The `[[target]]` / `[[target|alias]]` / `[[target#heading]]` syntax covers v1.** Nested brackets and newlines inside `[[…]]` are rejected so ordinary links are never swallowed. Verify against any future spec/feature request.
* **Carrying the target as `data-*` is sufficient until Phase 4.** The Phase 4 resolver will read `data-wikilink-target` / `data-wikilink-heading` and wire navigation; no `href` is emitted now.
* **The added required config field is safe.** `MarkStudioConfig` is plain JSON built host-side via `ConfigurationService.read` (never a partial literal); the `isMarkStudioConfig` guard now enforces `wikiLinks`, so a malformed payload is dropped at the boundary.

---

## 7. Technical Debt Introduced

* **Wiki links do not yet navigate.** The anchor is styled and carries its target/heading but has no `href`; resolution + click-to-open is Phase 4. Intentional, recorded in ADR-0018.
  * **Location:** `src/webview/preview/wikiLinks.ts` (token emission).
  * **TODO item created in docs/TODO.md?** No — it is the Phase 4 scope, not a defect.
* **The display label is not re-parsed as inline Markdown.** `[[note|**bold**]]` shows literal `**`. Low severity; matches the conservative posture. A follow-up could render the label through markdown-it inline.
* **Carried over from earlier sessions:** custom callout titles are escaped but not re-parsed (T-3.3); Mermaid live re-theme (T-3.2); always-bundled KaTeX cost (T-3.1); `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **Uncommitted Phase 2.5/3 work.** This session (T-3.4) plus T-2.2, T-3.1, T-3.2, and T-3.3 are all uncommitted on top of `faaa927`, undivided in the working tree.
  * **Impact:** Git history does not yet reflect the completed milestones; a single commit would bundle several tasks together, and CI has not run (it runs on push/PR).
  * **What is needed to unblock:** A maintainer decision on whether to commit these as one batch or split per task (T-2.2 / T-3.1 / T-3.2 / T-3.3 / T-3.4), then commit + push so CI runs the same locally-green commands.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — the wiki-link inline rule + CSS add only a few KB over T-3.3 (Mermaid stays in its own ~3.3 MB lazy bundle), host ≈ unchanged
* [x] `npm test` passes — **111 tests** (85 unit + 26 integration, `node:test`); Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately
* [ ] **Manual verification in an Extension Development Host (F5)** — **not yet done.** Verify each wiki-link form (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`) renders as a styled link in dark / light / high-contrast themes, the alias/heading are honoured, and toggling `markstudio.preview.wikiLinks` off degrades to literal `[[…]]` text live.
* [ ] Manual verification done in dark theme — pending the F5 run above
* [ ] Manual verification done in light theme — pending the F5 run above
* [ ] Manual verification done in high-contrast theme — pending the F5 run above
* [x] Webview is not recreated on tab switch (unchanged this session; `retainContextWhenHidden`)
* [x] CodeMirror state preserved on tab switch (unchanged this session)
* [x] Preview patches DOM (block-diff patching unchanged; wiki links ride the same render path)
* [ ] **CI run on GitHub — not yet executed** (changes uncommitted/unpushed; see §8)

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 3 — Modern Markdown** with **T-3.5 — Footnotes & GFM completeness** (M3.5). Add footnotes, task lists, tables, and strikethrough via markdown-it plugins, each individually toggleable.
* **Why this one:** M3.1–M3.4 are complete; M3.5 is the final Phase 3 milestone, after which Phase 3 closes.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) — Phase 3 scope and exit criteria
  * [TODO.md](TODO.md) — T-3.5 details
  * `src/webview/preview/wikiLinks.ts` and `src/webview/preview/PreviewRenderer.ts` — the markdown-it rule + `setConfig` rebuild pattern to mirror
* **Definition of done for this task:** footnotes, task lists, tables, and strikethrough render in the preview, each toggleable via a `markstudio.preview.*` setting and degrading gracefully when off; tests added; `npm run lint` + `npm test` + (once committed) CI green.

---

## 11. Open Questions for the Next Agent

* **Commit strategy for the uncommitted batch (§8):** one batch commit, or split per task (T-2.2 / T-3.1 / T-3.2 / T-3.3 / T-3.4)? This is the key call before more Phase 3 work piles on.
* **GFM scope for T-3.5:** one combined `markstudio.preview.gfm` toggle, or a setting per feature (footnotes / task lists / tables / strikethrough)? Tables and strikethrough are GFM staples likely wanted on by default.
* **Should the wiki-link display label render inline Markdown?** Currently the alias/label is plain text (§7). Small follow-up if desired.
* **A preview toolbar/Codicon control for the Phase 3 toggles?** Math/mermaid/callouts/wiki-links are settings only; a discoverability follow-up, consistent with "less UI is better."
