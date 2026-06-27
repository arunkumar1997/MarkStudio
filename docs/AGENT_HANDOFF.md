# AGENT HANDOFF — T-2.3 In-editor search & replace (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-2.3 session
* **Working branch:** `main` (repository is under git; changes from this session are uncommitted)
* **Last commit on this branch:** *(changes are uncommitted)*
* **Prompt used:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md) (Feature)

---

## 1. What Was Completed

Implemented **T-2.3 — In-editor search & replace** (Phase 2 milestone M2.3). The CodeMirror find/replace panel is now actually mounted in the editor and themed to look like the VS Code find widget. Before this session the `searchKeymap` was bound but the `search()` panel extension was not included, so the panel had no consistent home or VS Code styling. The whole change is **webview-contained** — no host code, no message-protocol change, and no new dependency (`@codemirror/search` has shipped in the bundle since T-104).

* **`src/webview/editor/extensions.ts` (edited).**
  * Imported `search` from `@codemirror/search` (alongside the existing `highlightSelectionMatches`, `searchKeymap`).
  * Added `search({ top: true })` to `buildExtensions(...)` so the find/replace panel mounts at the **top** of the editor, mirroring VS Code's find widget. `searchKeymap` (already in the keymap) activates it: `Ctrl/Cmd+F` opens find, the panel exposes the replace field + match-case / regexp / whole-word checkboxes, and `Enter`/`F3` / `Shift+Enter`/`Shift+F3` step through matches.
  * Extended the `markstudioTheme` `EditorView.theme({...})` with find-panel selectors — `.cm-panels`, `.cm-panels.cm-panels-top`, `.cm-panel.cm-search` text inputs (`[name=search]` / `[name=replace]`), the action buttons (`button:not([name=close])` / `.cm-button`), and the close affordance (`[name=close]`). Every value keys to a `--vscode-*` variable: `--vscode-editorWidget-background`/`-foreground`/`-border`, `--vscode-input-background`/`-foreground`/`-border`, `--vscode-button-secondaryBackground`/`-secondaryForeground`/`-secondaryHoverBackground`, `--vscode-toolbar-hoverBackground`, `--vscode-icon-foreground`, and `--vscode-focusBorder` (ADR-0004). The panel is therefore theme-correct in light, dark, and high-contrast without a reload.
* **Documentation pass:** [CHANGELOG.md](CHANGELOG.md), [FEATURES.md](FEATURES.md) (Search & replace → Shipped), [ROADMAP.md](ROADMAP.md) (M2.3 → Done), [TODO.md](TODO.md) (T-2.3 → Done; intro + backlog updated), [PROJECT_STATUS.md](PROJECT_STATUS.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-2.3 is complete and the full local pipeline is green: `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (53 unit + 8 integration).
* **Note on verification:** A manual run in an Extension Development Host (F5) to eyeball the find/replace panel — open with `Ctrl/Cmd+F`, run a replace, check the panel chrome matches the theme — is the one outstanding verification (see §9). CI has not run because the changes are uncommitted/unpushed; it invokes the same locally-green commands.

---

## 3. Remaining Work for This Initiative

Phase 2 — Editing Quality is **in progress**. Done: M2.1 scroll sync (T-2.1, early), M2.3 search & replace (T-2.3), and M2.4 word count (T-2.4). Remaining milestones, seeded in [TODO.md](TODO.md):

* **T-2.2 — Document outline (M2.2).** The headline Phase 2 exit criterion. **Needs a design decision first:** VS Code's native Outline view / breadcrumbs are driven by `vscode.window.activeTextEditor`, which is `undefined` while a custom editor is focused, so a plain `DocumentSymbolProvider` likely won't surface for MarkStudio. Choose a host-side `TreeDataProvider` (view container) or an in-webview outline pane.
* **T-2.5 — Word-wrap toggle and multiple cursors (M2.5).** A wrap toggle (likely a new `markstudio.*` setting via the `Compartment` pattern from T-111) plus confirmed multi-cursor support. Note: `EditorView.lineWrapping` is currently always on; T-2.5 should move it behind a compartment-backed setting.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `src/webview/editor/extensions.ts` | Edited | Added `search({ top: true })`; themed the find/replace panel via `--vscode-*` variables |
| `docs/CHANGELOG.md` | Edited | New T-2.3 Added entry |
| `docs/FEATURES.md` | Edited | Search & replace → Shipped |
| `docs/ROADMAP.md` | Edited | M2.3 → Done |
| `docs/TODO.md` | Edited | T-2.3 → Done; intro + backlog updated |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-2.3 |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed.

---

## 5. Decisions Made

* **Panel at the top (`search({ top: true })`).** VS Code's find widget anchors to the top-right of the editor; placing CodeMirror's panel at the top is the closest match and keeps the mental model consistent.
* **Reuse the existing keymap, no new commands.** `searchKeymap` was already in the keymap from T-104, so find/replace is reachable by keyboard the moment the panel extension is present. No host command or message was added — keeping the feature fully webview-contained, consistent with "less UI is better."
* **Theme only with `--vscode-*` variables.** The panel chrome is folded into the existing `markstudioTheme` rather than a separate stylesheet, so it lives next to the rest of the editor theming and inherits the same ADR-0004 discipline (no hardcoded colors).
* **No ADR.** This is a feature using an already-bundled dependency with no structural rule change — consistent with how earlier feature-only steps (e.g. T-2.4) were handled.

---

## 6. Assumptions Made

* **`Ctrl/Cmd+F` reaches CodeMirror, not the host.** When the CM6 editor is focused inside the webview iframe, keystrokes are handled by CodeMirror first, so `searchKeymap`'s `Mod-f` opens the panel. (To be confirmed in the EDH — see §9.)
* **The default CM search panel DOM is stable.** The theme targets `input[name=search]`, `input[name=replace]`, `button[name=close]`, and `.cm-button`, which are the class/name hooks the `@codemirror/search` panel emits. A future major bump of `@codemirror/search` could rename these; the panel would still function, only the theming would need a refresh.

---

## 7. Technical Debt Introduced

* **No toolbar button to open find.** The panel is keyboard-driven (`Ctrl/Cmd+F`) only; a Codicon button in the App Shell toolbar (T-107) is a natural small follow-up. Low severity.
* **Find-panel theming is not unit-tested.** It is CSS-in-JS over the CM search panel; covering it would need a real layout, so it belongs to the manual matrix / Extension Host layer, not the mocked unit layer.
* **Carried over from earlier sessions:** `applyEdit` / `error` / `StateStore.update` failures are still console-only; layout / toggle / focus commands and the word-count indicator target only the active webview; `Open in MarkStudio` not on the `editor/title` context menu; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); Extension Host CI is Linux-only (`xvfb`); the CI pipeline has not yet run on GitHub.

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* None.

---

## 9. Verification State

* [x] `npm run lint` — ESLint clean (`--max-warnings 0`) + `prettier --check .` clean
* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run test:unit` — **53 unit tests pass** on `node:test`
* [x] `npm run test:integration` — **8 integration tests pass** on `node:test` under jsdom
* [x] `npm test` — type-check + **61 tests** green end-to-end
* [x] `npm run build` is green; production-minified webview **~701.4 KB** (+~2 KB), host bundle unchanged (webview-only feature)
* [x] **Manual run in an Extension Development Host (F5) — done (2026-06-27).** Verified: `Ctrl/Cmd+F` opens the find panel at the top; typing highlights matches; `Enter`/`F3` step through; the replace field replaces; the match-case / regexp / whole-word checkboxes work; the panel chrome (inputs, buttons, close) matches the active VS Code theme.
* [ ] **CI run on GitHub — not yet executed** (changes uncommitted/unpushed).

---

## 10. Recommended Next Task

* **Task:** Continue **Phase 2 — Editing Quality** with **T-2.5 — Word-wrap toggle and multiple cursors** (M2.5) as the lowest-risk next step, or **T-2.2 — Document outline** (M2.2) if you first write the design note it needs.
* **Why T-2.5 first:** it reuses the established `MarkStudioConfig` + `ConfigurationService` + CM6 `Compartment` pattern (T-111) — move the always-on `EditorView.lineWrapping` behind a `markstudio.editor.wordWrap` setting and confirm multi-cursor — with no host/protocol surprises. **Why T-2.2 needs care:** VS Code's native Outline view does not surface for custom editors, so it requires a design decision (host `TreeDataProvider` vs. in-webview pane) before coding — capture it in [design/](design/) and likely an ADR.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [PROJECT_STATUS.md](PROJECT_STATUS.md) — current snapshot
  * [ROADMAP.md](ROADMAP.md) — Phase 2 scope and exit criteria
  * [TODO.md](TODO.md) — T-2.2 / T-2.5 details
  * [ARCHITECTURE.md](ARCHITECTURE.md) — the webview/editor seams (`webview/editor/extensions.ts`) and host services
* **Definition of done:** depends on the chosen task; keep `npm run lint` + `npm test` + CI green as the standing bar.

---

## 11. Open Questions for the Next Agent

* **Outline surface (T-2.2):** host-side `TreeDataProvider` in a view container, or an in-webview outline pane? This is the key design call before implementing M2.2.
* **A find toolbar button?** The find panel is keyboard-only today; a Codicon button in the App Shell toolbar (T-107) would make it discoverable. Small follow-up.
* **A `markstudio.statusBar.wordCount` toggle?** The word-count indicator is always-on while a MarkStudio editor is active; if users want it off, add a boolean setting via the `MarkStudioConfig` + `ConfigurationService` pattern (T-111).
* **Surface inbound `error` / `applyEdit` / `StateStore.update` failures via `vscode.window.showErrorMessage`?** Still a small follow-up carried from T-103…T-113.
* **Cross-OS CI matrix?** `extension-host-tests` is Linux-only (needs `xvfb`); add a Windows/macOS matrix entry if host behaviour ever diverges by OS.
