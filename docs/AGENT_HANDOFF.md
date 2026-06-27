# AGENT HANDOFF — T-3.3 Callouts / admonitions (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-3.3 session
* **Working branch:** `main` (repository is under git; changes from this session are uncommitted)
* **Last commit on this branch:** `faaa927` — *feat: implement word-wrap toggle and multiple cursors (T-2.5)* (Phase 2.5/3 work, incl. this session, is uncommitted on top of it)
* **Prompt used:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md) (Feature)

---

## 1. What Was Completed

Implemented **T-3.3 — Callouts / admonitions** (Phase 3 milestone M3.3). GitHub-style callout blockquotes (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`) now render in the preview as themed boxes with a Codicon icon + title, gated behind a new `markstudio.preview.callouts` setting (default on) and degrading to an ordinary blockquote when off. Implemented with **no new dependency** as a small markdown-it **core rule** that post-processes the token stream.

* **`src/webview/preview/callouts.ts` (new).** `applyCallouts(md)` registers a markdown-it core rule that scans for a `blockquote_open` whose first paragraph's first line matches a known `[!TYPE]` marker, rewrites the `blockquote_open` / `blockquote_close` tags to a `<div class="markstudio-callout markstudio-callout-<type>">`, injects an `html_block` title token (Codicon icon + escaped label or custom title), and strips the marker line (re-parsing the remaining inline body, or dropping a marker-only paragraph). A type table maps NOTE/TIP/IMPORTANT/WARNING/CAUTION → label + Codicon. **No `import` of any new package.**
* **`src/webview/preview/PreviewRenderer.ts` (edited).** `createMarkdownIt(math, mermaid, callouts)` applies the rule only when on; `setConfig` rebuilds the markdown-it instance when `math`, `mermaid`, **or** `callouts` flips (ADR-0008).
* **`src/messaging/messages.ts` (edited).** `MarkStudioConfig` gained `callouts: boolean`; the `isMarkStudioConfig` boundary guard now validates it.
* **`src/services/ConfigurationService.ts` (edited).** `read` resolves `preview.callouts` (default `true`).
* **`src/webview/main.ts` (edited).** Themed `.markstudio-callout` / `.markstudio-callout-title` styling driven entirely by `--vscode-*` variables, with a per-type `--markstudio-callout-accent`.
* **`package.json` (edited).** Contributed `markstudio.preview.callouts` (boolean, default `true`, `resource` scope). No dependency added.
* **Tests (edited).** 5 new integration tests in `test/integration/previewRenderer.test.ts` (styled markup when on, custom title, plain-blockquote fallback when off, ordinary blockquote untouched, live `setConfig` toggle) + 2 new `ConfigurationService` cases; config fixtures updated for the `callouts` field across all four config-bearing test files. Unit 81 → 83, integration 15 → 20.
* **Documentation pass:** [design/callouts.md](design/callouts.md) (new), **ADR-0017** in [DECISIONS.md](DECISIONS.md), [api/message-protocol.md](api/message-protocol.md), [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md), [ROADMAP.md](ROADMAP.md) (M3.3 → Done), [TODO.md](TODO.md) (T-3.3 → Done), [PROJECT_STATUS.md](PROJECT_STATUS.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-3.3 is complete and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (83 unit + 20 integration).
* **Note on verification:** A manual run in an Extension Development Host (F5) to confirm each callout type renders with the correct icon/colour and that toggling `markstudio.preview.callouts` off degrades to a plain blockquote live is the one outstanding verification (see §9).
* **Note on git:** This session's changes — plus the earlier uncommitted Phase 2.5/3 work (T-2.2 outline, T-3.1 math, T-3.2 mermaid) — sit together on top of `faaa927`. They have **not been committed**; see §8.

---

## 3. Remaining Work for This Initiative

Phase 3 — Modern Markdown is **~60% complete**. Done: M3.1 math (T-3.1), M3.2 Mermaid (T-3.2), and M3.3 callouts (T-3.3). Two milestones remain, seeded in [TODO.md](TODO.md):

1. **T-3.4 — Wiki-style links `[[…]]` (M3.4).** Parse `[[note]]` links in the preview (resolution to actual files comes later in Phase 4), behind a `markstudio.preview.wikiLinks` setting (default on), reusing the `MarkStudioConfig` + `configChanged` seam (T-111) and the `PreviewRenderer.setConfig` rebuild pattern.
2. **T-3.5 — Footnotes & GFM completeness (M3.5).** Footnotes, task lists, tables, and strikethrough via markdown-it plugins, each toggleable; verify they render and degrade gracefully.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/webview/preview/callouts.ts` | New | `applyCallouts(md)` — dependency-free markdown-it core rule |
| `src/webview/preview/PreviewRenderer.ts` | Edited | `createMarkdownIt(math, mermaid, callouts)`; `setConfig` rebuilds on `callouts` flip |
| `src/messaging/messages.ts` | Edited | `MarkStudioConfig.callouts`; `isMarkStudioConfig` validates it |
| `src/services/ConfigurationService.ts` | Edited | `read` resolves `preview.callouts` |
| `src/webview/main.ts` | Edited | Themed `.markstudio-callout` / `-title` styling via `--vscode-*` |
| `package.json` | Edited | Contributed `markstudio.preview.callouts` |
| `test/integration/previewRenderer.test.ts` | Edited | +5 callout integration tests |
| `test/services/ConfigurationService.test.ts` | Edited | +2 `callouts` tests; fixtures updated |
| `test/messaging/messages.test.ts` | Edited | `VALID_CONFIG` gained `callouts` |
| `test/integration/createEditor.test.ts` | Edited | `CONFIG` gained `callouts` |
| `docs/design/callouts.md` | New | Design note for the callout rule |
| `docs/DECISIONS.md` | Edited | ADR-0017 (dependency-free callout rule) |
| `docs/api/message-protocol.md` | Edited | `MarkStudioConfig` now includes `callouts` |
| `docs/CHANGELOG.md` | Edited | New T-3.3 Added entry |
| `docs/FEATURES.md` | Edited | Callouts → Shipped |
| `docs/ROADMAP.md` | Edited | M3.3 → Done |
| `docs/TODO.md` | Edited | T-3.3 → Done |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-3.3 |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Implement callouts as a dependency-free markdown-it core rule** rather than pulling an npm callout plugin. The transform is ~80 lines and fully under our control, consistent with the dependency-policy ADRs.
  * **Recorded as ADR?** Yes → **ADR-0017** in [DECISIONS.md](DECISIONS.md).
* **Default `callouts` to `true`.** Consistent with the `math` / `mermaid` toggles (T-3.1 / T-3.2): the richer rendering is on by default and degrades to a plain blockquote when off.
  * **Recorded as ADR?** No — a default value, covered by the feature entry and ADR-0017.
* **Reuse the `MarkStudioConfig` + `configChanged` + `setConfig`-rebuild seam (T-111 / T-3.1).** No new message type or esbuild target.
  * **Recorded as ADR?** No — extends the existing ADR-0010 / ADR-0008 design.

---

## 6. Assumptions Made

* **A single `[!TYPE]` table covers the common cases.** NOTE/TIP/IMPORTANT/WARNING/CAUTION match GitHub's set; an unknown `[!FOO]` marker is left as an ordinary blockquote (graceful degradation). Verify the type set against any future spec/feature request.
* **Reusing the Codicons font (T-107) for callout icons is sufficient.** No new icon assets are shipped; the per-type icon is a codicon suffix. Safe given the font is already loaded in the webview.
* **The added required config field is safe.** `MarkStudioConfig` is plain JSON built host-side via `ConfigurationService.read` (never a partial literal); the `isMarkStudioConfig` guard now enforces `callouts`, so a malformed payload is dropped at the boundary.

---

## 7. Technical Debt Introduced

* **Custom callout titles are escaped but not re-parsed as inline Markdown.** A title like `> [!NOTE] **Heads up**` shows the literal `**`. Low severity; matches the conservative `html: false` posture. A follow-up could render the title line through markdown-it inline.
  * **Location:** `src/webview/preview/callouts.ts` (title injection).
  * **TODO item created in docs/TODO.md?** No — captured here and in T-3.3 follow-ups.
* **Mermaid live re-theme (carried from T-3.2)** and the **always-bundled KaTeX cost (T-3.1)** are unchanged by this session and remain in [PROJECT_STATUS.md](PROJECT_STATUS.md) §7.
* **Carried over from earlier sessions:** `applyEdit` / `error` / `StateStore.update` failures are console-only; layout/toggle/focus commands and the word-count indicator target only the active webview; the find panel is keyboard-only; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the document outline shows raw heading source text (T-2.2).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* **Uncommitted Phase 2.5/3 work.** This session (T-3.3) plus T-2.2, T-3.1, and T-3.2 are all uncommitted on top of `faaa927`, undivided in the working tree.
  * **Impact:** Git history does not yet reflect the completed milestones; a single commit would bundle four tasks together, and CI has not run (it runs on push/PR).
  * **What is needed to unblock:** A maintainer decision on whether to commit these as one batch or split per task (T-2.2 / T-3.1 / T-3.2 / T-3.3), then commit + push so CI runs the same locally-green commands.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run build` passes — production-minified webview **~977.7 KB** (+~3.4 KB over T-3.2 for the callouts rule + CSS; Mermaid stays in its own ~3.3 MB lazy bundle), host **~12.1 KB** (≈ unchanged)
* [x] `npm test` passes — **103 tests** (83 unit + 20 integration, `node:test`); Extension Host lifecycle layer (`npm run test:exthost`, 4 tests) runs separately
* [ ] **Manual verification in an Extension Development Host (F5)** — **not yet done.** Verify each callout type renders with the correct icon/accent in dark / light / high-contrast themes, custom titles show, and toggling `markstudio.preview.callouts` off degrades to a plain blockquote live.
* [ ] Manual verification done in dark theme — pending the F5 run above
* [ ] Manual verification done in light theme — pending the F5 run above
* [ ] Manual verification done in high-contrast theme — pending the F5 run above
* [x] Webview is not recreated on tab switch (unchanged this session; `retainContextWhenHidden`)
* [x] CodeMirror state preserved on tab switch (unchanged this session)
* [x] Preview patches DOM (block-diff patching unchanged; callouts ride the same render path)
* [ ] **CI run on GitHub — not yet executed** (changes uncommitted/unpushed; see §8)

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 3 — Modern Markdown** with **T-3.4 — Wiki-style links (`[[…]]`)** (M3.4). Parse `[[note]]` links in the preview (resolution to actual files comes later in Phase 4), behind a `markstudio.preview.wikiLinks` setting (default on).
* **Why this one:** M3.1 (math), M3.2 (mermaid), and M3.3 (callouts) are complete; M3.4 is the next sequenced Phase 3 milestone. Like callouts, it is markdown-it-only with no large dependency, so it reuses the same seam (`MarkStudioConfig` + `configChanged` + `PreviewRenderer.setConfig` rebuild).
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) — Phase 3 scope and exit criteria
  * [TODO.md](TODO.md) — T-3.4 details
  * `src/webview/preview/callouts.ts` and `src/webview/preview/PreviewRenderer.ts` — the markdown-it rule + `setConfig` rebuild pattern to mirror
* **Definition of done for this task:** `[[note]]` renders as a link in the preview, toggleable via `markstudio.preview.wikiLinks`, degrading to literal text when off; tests added; `npm run lint` + `npm test` + (once committed) CI green.

---

## 11. Open Questions for the Next Agent

* **Commit strategy for the uncommitted batch (§8):** one batch commit, or split per task (T-2.2 / T-3.1 / T-3.2 / T-3.3)? This is the key call before more Phase 3 work piles on.
* **Wiki-link target syntax (T-3.4):** support `[[note]]`, `[[note|alias]]`, and `[[note#heading]]`, or start with bare `[[note]]` only? Resolution to real files is Phase 4, so v1 may just style the link and carry the target as a data attribute.
* **Should custom callout titles render inline Markdown?** Currently escaped literally (§7). Small follow-up if desired.
* **A preview toolbar/Codicon control for the Phase 3 toggles?** Math/mermaid/callouts/wiki-links are settings only; a discoverability follow-up, consistent with "less UI is better."
