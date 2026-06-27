# PROJECT STATUS — 2026-06-27

> Overwritten at the end of every working session. History lives in git. Template: [.ai/TEMPLATES/STATUS.md](../.ai/TEMPLATES/STATUS.md).

---

## 1. Snapshot

* **Current phase:** Phase 1 — Editing Core, **in progress**.
* **Current milestone:** **T-120 — CI pipeline Done.** A GitHub Actions workflow (`.github/workflows/ci.yml`) now runs on every push to `main` and every pull request and gates merges: a **build-and-test** job (`npm ci` → `npm run typecheck` → `npm run build` → `npm test`, the 51 unit + integration tests) and an **extension-host-tests** job (`xvfb-run -a npm run test:exthost`, the 4 Extension Host lifecycle tests on a real VS Code) with the VS Code download cached under `.vscode-test/`. All three automated layers — unit (43) + integration (8) + Extension Host lifecycle (4) — are now wired into CI. The recommended next task is **T-121 — lint/format**.
* **Overall completion (qualitative):** Phase 0: 100%. Phase 1: ~99% (editor + preview + resizable split + per-webview layout persistence + three absolute layout commands + Codicon toolbar + five convenience commands + default keybindings + CM6 cursor / scroll snapshot/restore + per-file Memento for layout mode + cursor-preserving external-change reconciliation + editor ⇄ preview scroll sync + reactive configuration service + unit-test harness + jsdom integration layer + Extension Host lifecycle test layer + CI pipeline are live; remaining work: lint/format).
* **Last updated:** 2026-06-27 by the T-120 session
* **Last commit on `main`:** *(repository is still not under git; first commit should establish `main`)*

---

## 2. Current Focus

* **Active initiative:** **Phase 1 — Editing Core.** T-120 lands the CI pipeline. The workflow `.github/workflows/ci.yml` triggers on push to `main` and on pull requests, with `concurrency` cancelling superseded runs on the same ref. Two `ubuntu-latest` jobs: **build-and-test** runs `npm ci`, `npm run typecheck`, `npm run build`, then `npm test` (unit + integration); **extension-host-tests** runs `npm ci` then `xvfb-run -a npm run test:exthost`, because the Extension Host layer boots a real VS Code via `@vscode/test-electron` and needs a display on the headless runner. The downloaded VS Code build (~280 MB) is cached under `.vscode-test/` keyed on `package-lock.json`, so only the first run (or a dependency bump) re-downloads it; the Extension Host job is split out so that heavy download never blocks the fast unit/integration feedback. **No new dependency, no app-code change.** The remaining Phase 1 robustness gap is lint/format (T-121), at which point a `lint` step joins the build-and-test job.
* **Owner (current agent):** T-120 session
* **Started:** 2026-06-27
* **Target outcome:** Land lint/format (T-121) and wire its `lint` step into the CI build-and-test job.

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
| *(none — T-120 closed)* | — | — | T-121 (lint/format) is the recommended next task |

---

## 5. Blockers

* **Blocker:** None. T-121 is unblocked.

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

* No lint configuration yet (T-121). The unit harness (T-112), the jsdom webview-seam integration harness (T-113), the Extension Host lifecycle harness (T-113b), and the CI pipeline (T-120) are all in place; a `lint` step joins the CI build-and-test job once ESLint lands.
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

* Implemented **T-120 — CI pipeline** (GitHub Actions):
  * Added `.github/workflows/ci.yml`, triggered on push to `main` and on pull requests, with `concurrency` cancelling superseded runs on the same ref and `permissions: contents: read`.
  * **build-and-test** job (`ubuntu-latest`): `actions/checkout@v4`, `actions/setup-node@v4` (Node 20, npm cache), `npm ci`, `npm run typecheck`, `npm run build`, then `npm test` (43 unit + 8 integration).
  * **extension-host-tests** job (`ubuntu-latest`): `npm ci`, an `actions/cache@v4` step caching `.vscode-test/` keyed on `package-lock.json`, then `xvfb-run -a npm run test:exthost` — the Extension Host layer boots a real VS Code via `@vscode/test-electron`, which needs a display on the headless runner, and the ~280 MB VS Code download is cached so only the first run re-downloads it.
  * Split the Extension Host run into its own job so the heavy VS Code download never blocks the fast unit/integration feedback; a red pipeline blocks merge.
  * Documentation pass: [CHANGELOG.md](CHANGELOG.md), [TESTING.md](TESTING.md) (§7 CI now live), [TODO.md](TODO.md) (T-120 → Done; T-121 now leads), this file, and [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
  * **No new dependency, no app-code or bundle-size change.** `npm test` (43 unit + 8 integration) and `npm run typecheck` remain green locally; the workflow invokes only existing, verified scripts.

---

## 10. Recommended Next Task

* **Task:** **T-121 — Linting and formatting.** Configure ESLint with strict TypeScript rules (and a formatter) consistent with [CODING_GUIDELINES.md](CODING_GUIDELINES.md), expose it as `npm run lint`, and add a `lint` step to the CI **build-and-test** job (T-120).
* **Why this one:** It is the last remaining Phase 1 robustness gap now that all three test layers and CI are in place; wiring `lint` into the existing CI job is a small, natural follow-on.
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
