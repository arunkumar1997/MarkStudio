# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** Phase 1 — Editing Core, **effectively complete**.
* **Current milestone:** **T-121 — Linting and formatting Done.** ESLint (flat config, `eslint.config.mjs`, ESLint 9 + `typescript-eslint`) and Prettier (`.prettierrc.json`) now gate the codebase via `npm run lint`, and a `lint` step runs in the CI **build-and-test** job so a lint or format violation blocks merge. The rules encode [CODING_GUIDELINES.md](CODING_GUIDELINES.md) (no-`any`, explicit exported types, no stray `console`, `===`, no unused code); Prettier owns formatting (2-space, double quotes, semicolons, no trailing commas, 80 cols, `endOfLine: auto`) with `eslint-config-prettier` last. The existing tree was normalised once (mostly 4-space → 2-space indentation). With this, all three test layers + CI + lint/format are in place and **every Phase 1 robustness gap is closed.** The recommended next move is to begin **Phase 2** (see [ROADMAP.md](ROADMAP.md)).
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: ~100% (editor + preview + resizable split + per-webview layout persistence + three absolute layout commands + Codicon toolbar + five convenience commands + default keybindings + CM6 cursor / scroll snapshot/restore + per-file Memento for layout mode + cursor-preserving external-change reconciliation + editor ⇄ preview scroll sync + reactive configuration service + unit-test harness + jsdom integration layer + Extension Host lifecycle test layer + CI pipeline + lint/format are all live).
* **Last updated:** 2026-06-27 by the T-121 session
* **Last commit on `main`:** *(repository is under git; changes from this session are uncommitted)*

---

## 2. Current Focus

* **Active initiative:** **Phase 1 — Editing Core (closing out).** T-121 lands lint/format. `npm run lint` runs `eslint . --max-warnings 0` over the flat config (`eslint.config.mjs`) and then `prettier --check .`; `npm run lint:fix` applies both. ESLint scopes `@typescript-eslint` recommended + the guideline rules to `**/*.ts`, lints the root CommonJS esbuild scripts as Node, and relaxes the exported-type/console rules for `test/**`. Prettier formats source/config (with `docs/`, `*.md`, and the lockfile ignored), and `eslint-config-prettier` removes any stylistic overlap. The CI **build-and-test** job gained a `lint` step before `typecheck`. **Five dev dependencies added** (`eslint`, `@eslint/js`, `typescript-eslint`, `prettier`, `eslint-config-prettier`); no runtime dependency, no app-code logic change, no bundle-size change.
* **Owner (current agent):** T-121 session
* **Started:** 2026-06-27
* **Target outcome:** Phase 1 is complete; begin Phase 2 (see [ROADMAP.md](ROADMAP.md)).

---

## 3. Completed Features

User-visible features that are shipped and stable.

| Feature | Phase | Shipped in |
| ------- | ----- | ---------- |
| MarkStudio registered as a custom editor for `.md` | 0 | Unreleased (T-101) |
| Two-way document editing via `WorkspaceEdit` (dirty state, undo/redo, save, revert) | 0 | Unreleased (T-102) |
| Typed message protocol with boundary validation | 0 | Unreleased (T-103) |
| CodeMirror 6 source editor — single long-lived `EditorView`, Markdown grammar, history, search, multi-cursor, line wrap, theme-aware highlighting, diff-based edits | 1 | Unreleased (T-104) |
| Live Markdown preview (markdown-it) — single long-lived renderer; block-level incremental DOM patching; debounced; theme-keyed to `--vscode-*` variables | 1 | Unreleased (T-105) |
| App Shell with resizable split + layout modes — draggable gutter (160 px min per pane, double-click resets to 50/50), `split` / `editor-only` / `preview-only` modes, per-webview `splitRatio` + `layoutMode` persistence via `vscode.setState()`, three command-palette commands | 1 | Unreleased (T-106) |
| Codicon toolbar — three layout-mode buttons (editor-only / split / preview-only) mounted inside the App Shell, themed through `--vscode-*` variables, keyboard-focusable, `aria-pressed` reflects the active mode; buttons share the `setLayoutMode` code path with the command-palette commands | 1 | Unreleased (T-107) |
| Core commands and keybindings — five new commands: **Open in MarkStudio**, **Toggle Preview** (split ↔ editor-only), **Toggle Split View**, **Focus Editor**, **Focus Preview** (auto-promotes to `split` if the preview pane is hidden). Default keybindings (`Ctrl+K V` / `Ctrl+K Ctrl+V` / `Ctrl+K Ctrl+E` / `Ctrl+K Ctrl+R`) scoped to MarkStudio editors via an `activeCustomEditorId` `when` clause | 1 | Unreleased (T-108) |
| **View-state and layout persistence** — CM6 cursor (anchor + head) and scroll position snapshot/restore via `vscode.setState()` (debounced 250 ms); per-file last layout mode persists across full extension reloads via a workspace `Memento` (`StateStore`) and overrides the webview cache on conflict | 1 | Unreleased (T-109) |
| **External file-change reconciliation** — on-disk changes (revert, `git pull`, another editor's save, an external formatter) reconcile through VS Code's managed `TextDocument` + `onDidChangeTextDocument`; the webview applies the new text as a minimal single-span diff so the cursor is preserved when the edit is elsewhere (ADR-0009) | 1 | Unreleased (T-110) |
| **Editor ⇄ preview scroll synchronisation** — in `split` mode, scrolling either pane scrolls the other to the matching Markdown block; preview blocks are anchored to source lines via the markdown-it token map and interpolated for smooth alignment, with per-direction feedback suppression | 1 | Unreleased (T-2.1) |
| **Reactive configuration service** — `markstudio.*` settings read host-side and applied live without a reload; first setting `markstudio.editor.lineNumbers` toggles the CM6 line-number gutter via a `Compartment` (ADR-0010) | 1 | Unreleased (T-111) |

For details, see [FEATURES.md](FEATURES.md). The next gap is the integration-test layer (T-113); the unit layer (T-112) is in place.

---

## 4. In Progress

| Item | State | Owner | Notes |
| ---- | ----- | ----- | ----- |
| *(none — T-121 closed)* | — | — | Phase 1 robustness is complete; Phase 2 is the next initiative |

---

## 5. Blockers

* **Blocker:** None.

---

## 6. Known Issues

| Issue | Severity | Workaround | Tracked in |
| ----- | -------- | ---------- | ---------- |
| The Extension Host layer asserts only host-observable behaviour; the `init`/`ready` handshake observed *inside* the webview iframe, focus, and pixel/scroll geometry cannot be introspected via the public API and stay in the manual matrix | Expected | Manual verification in the EDH | T-113b / ADR-0013 follow-ups |
| Scroll sync anchors on per-block source lines; very tall blocks (long code fences, big tables) interpolate linearly across the block, so the panes can drift a little mid-block before re-aligning at the next block boundary | Low | N/A — acceptable; finer intra-block anchoring is a possible future refinement | T-2.1 follow-ups |
| `applyEdit` failure is silently logged on the host (no user-visible notification) | Low | N/A — the bus carries a typed `error` message so a notification can be wired with a small follow-up | TODO (open question in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §11) |
| External (on-disk) file changes are reconciled as a single-span minimal diff; an edit that simultaneously touches the top and bottom of the file collapses to one span over the middle (still correct, just not maximally minimal), and the cursor cannot be preserved when the external edit lands exactly where the cursor sits | Low | N/A — acceptable; a host-side multi-range diff is a possible future refinement (ADR-0009) | T-110 ADR-0009 follow-ups |
| Markdown highlight in the source pane is intentionally minimal (typography-based + a few stable theme tokens) | Low | N/A — adequate for editing; richer coloring waits for a proper theme-token mapping | T-104 ADR-0007 follow-ups |
| Preview disables raw HTML (`html: false`) | By design | Safer default; revisit only after an explicit Phase 3 security review | ADR-0008 follow-ups |

---

## 7. Technical Debt

* The unit harness (T-112), the jsdom webview-seam integration harness (T-113), the Extension Host lifecycle harness (T-113b), the CI pipeline (T-120), and the ESLint/Prettier lint-format gate (T-121) are all in place; lint runs in the CI build-and-test job.
* The `vscode` mock (`test/_mocks/vscode.ts`) must be kept in step with any new host API a unit under test starts using.
* jsdom does no real layout, so the integration layer cannot assert pixel-measurement behaviour (scroll-sync geometry, CM6 viewport measurement); those stay in the manual matrix / future `@vscode/test-electron` (T-113b).
* `applyEdit` failures are console-only; not surfaced as a VS Code notification.
* Preview bundle adds ~151 KB minified for markdown-it + its transitive utilities; acceptable for what it delivers (ADR-0008), revisit only if Phase 1 budgets are missed.
* Layout / toggle / focus commands target only the **active** MarkStudio webview (tracked via `onDidChangeViewState`); a user with two side-by-side MarkStudio editors can only drive the focused one. Acceptable for Phase 1; revisit if/when multi-target commands are needed.
* Codicons font + stylesheet (~160 KB total) are copied as separate assets next to `dist/webview.js`; they are loaded on demand by the browser, not bundled into the webview JS. Acceptable; no inlining planned.
* `StateStore` Memento entries accumulate forever (one key per opened file URI). Cheap individually but never garbage-collected; revisit if a workspace racks up thousands of `.md` files. A periodic `keys()` sweep against the workspace's `findFiles` is the obvious fix.
* `editor` (the `MarkStudioEditor` returned by `createEditor`) is currently never `destroy()`-ed in the webview because the webview only ever has one editor for its lifetime. Acceptable today; revisit if the webview ever rebuilds the editor (which would itself be a bigger violation).

---

## 8. Health Checks

* [x] Build is green — `npm run build` produces `dist/extension.js` (14.6 KB dev / **~7.0 KB production-minified**), `dist/webview.js` (1.3 MB dev / **~699.6 KB production-minified**, ≈ unchanged over T-2.1), and the Codicons assets in `dist/codicons/` (`codicon.css` 33 KB, `codicon.ttf` 126 KB)
* [x] Typecheck is green — `npm run typecheck` (strict) **and** `npm run typecheck:test` (strict, incl. tests) pass
* [x] Tests are green — `npm test` runs **51 tests** (43 unit + 8 integration, `node:test`); the Extension Host lifecycle layer (`npm run test:exthost`, 4 tests on `@vscode/test-electron`) runs separately and is green. CI (`.github/workflows/ci.yml`, T-120) runs all three layers on push/PR
* [x] No unresolved high-severity issues
* [x] Documentation is current with the codebase
* [x] Last handoff is fresh
* [x] No undocumented architectural changes

---

## 9. Recently Completed (Last Session)

* Implemented **T-121 — Linting and formatting** (the last Phase 1 robustness gap):
  * Added `eslint.config.mjs` (ESLint 9 flat config + `typescript-eslint`) encoding the lint-able rules from [CODING_GUIDELINES.md](CODING_GUIDELINES.md): `eqeqeq`, `no-console` (allow `warn`/`error`), `explicit-module-boundary-types`, and `no-unused-vars` (with a `^_` escape hatch). Scoped blocks lint `**/*.ts` with the TS recommended set, the root CommonJS esbuild scripts as Node, and relax exported-type/console rules for `test/**`.
  * Added `.prettierrc.json` (2-space, double quotes, semicolons, no trailing commas, 80 cols, `endOfLine: auto` for the CRLF tree) and `.prettierignore` (build output, deps, `docs/`, `*.md`, lockfile). `eslint-config-prettier` is applied last so no stylistic rule conflicts.
  * Added `npm run lint` (`eslint . --max-warnings 0 && prettier --check .`) and `npm run lint:fix`; five lint/format dev dependencies. Added a `lint` step to the CI **build-and-test** job.
  * One-time `prettier --write` normalised 33 source/config files (mostly 4-space → 2-space indentation; no logic change).
  * Documentation pass: [CHANGELOG.md](CHANGELOG.md), [CODING_GUIDELINES.md](CODING_GUIDELINES.md), [TESTING.md](TESTING.md), [TODO.md](TODO.md) (T-121 → Done), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **No runtime dependency, no app-code or bundle-size change.** `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, and `npm test` (43 unit + 8 integration) are all green locally.

---

## 10. Recommended Next Task

* **Task:** **Begin Phase 2** (see [ROADMAP.md](ROADMAP.md)). Phase 1 — Editing Core is complete: editor, preview, split/layout, persistence, reconciliation, scroll sync, configuration service, all three test layers, CI, and lint/format are live.
* **Why this one:** Every Phase 1 robustness gap is now closed, so the foundation is stable enough to build the next feature set on. Pick the next task ID from [TODO.md](TODO.md) against the Phase 2 scope in [ROADMAP.md](ROADMAP.md).
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).

---

## 11. Links

* Vision: [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md)
* Philosophy: [.ai/CONTEXT.md](../.ai/CONTEXT.md)
* Workflow: [.ai/WORKFLOW.md](../.ai/WORKFLOW.md)
* Architecture: [ARCHITECTURE.md](ARCHITECTURE.md)
* Decisions: [DECISIONS.md](DECISIONS.md)
* Roadmap: [ROADMAP.md](ROADMAP.md)
* Features: [FEATURES.md](FEATURES.md)
* TODO: [TODO.md](TODO.md)
* Changelog: [CHANGELOG.md](CHANGELOG.md)
* Handoff: [AGENT_HANDOFF.md](AGENT_HANDOFF.md)
