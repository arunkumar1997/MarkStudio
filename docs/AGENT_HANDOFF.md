# AGENT HANDOFF — T-120 CI pipeline (2026-06-27)

> Overwrite this file at the end of every working session; do not append. The previous handoff is preserved in git history. Template: [.ai/TEMPLATES/HANDOFF.md](../.ai/TEMPLATES/HANDOFF.md).
>
> The next agent must be able to continue with **only** this file, [.ai/START_HERE.md](../.ai/START_HERE.md), and [PROJECT_STATUS.md](PROJECT_STATUS.md).

---

## Session Metadata

* **Date:** 2026-06-27
* **Agent / Author:** T-120 session
* **Working branch:** *(repository not yet under git — establish `main` on first commit)*
* **Last commit on this branch:** *(none yet — changes are uncommitted)*
* **Prompt used:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md) (Feature)

---

## 1. What Was Completed

Implemented **T-120 — CI pipeline**. MarkStudio now gates every push to `main` and every pull request behind a GitHub Actions workflow that runs the build and all three automated test layers; a red pipeline blocks merge. The next task is **T-121** (lint/format).

* **Workflow (`.github/workflows/ci.yml`).** Triggers on `push` to `main` and on `pull_request` to `main`. A `concurrency` group cancels superseded runs on the same ref, and `permissions` is narrowed to `contents: read`.
* **`build-and-test` job (`ubuntu-latest`).** `actions/checkout@v4` → `actions/setup-node@v4` (Node 20, `cache: npm`) → `npm ci` → `npm run typecheck` → `npm run build` → `npm test` (the 43 unit + 8 integration tests).
* **`extension-host-tests` job (`ubuntu-latest`).** `checkout` → `setup-node` → `npm ci` → `actions/cache@v4` over `.vscode-test/` (keyed on `package-lock.json`) → `xvfb-run -a npm run test:exthost`. The Extension Host layer boots a real VS Code via `@vscode/test-electron`, which needs a display, so it runs under `xvfb` on the headless Linux runner; the ~280 MB VS Code download is cached so only the first run (or a dependency bump) re-downloads it.
* **Why two jobs.** Splitting the Extension Host run out keeps its heavy VS Code download off the critical path for the fast unit/integration feedback; both jobs must pass for the pipeline to be green.
* **No new dependency, no app-code change.** The workflow only invokes existing, verified `package.json` scripts.
* **Documentation pass:** [CHANGELOG.md](CHANGELOG.md), [TESTING.md](TESTING.md) (§7 CI now live), [TODO.md](TODO.md) (T-120 → Done; T-121 now leads), [PROJECT_STATUS.md](PROJECT_STATUS.md), and this handoff.

---

## 2. Current Work In Progress

* **Item:** None. T-120 is complete. `npm test` (type-check + 51 unit/integration tests) is green locally; `npm run typecheck` / `npm run typecheck:test` (strict) pass; the workflow invokes only existing, verified scripts.
* **Note on verification:** The workflow itself has not yet run on GitHub (the repository is not under git / not pushed). The scripts it calls are all locally green. **The first CI run on a fresh runner will download VS Code (~280 MB) in the `extension-host-tests` job; the cache warms it for subsequent runs.** Watch the first run to confirm `xvfb-run` provides a usable display for `@vscode/test-electron` on the runner image.

---

## 3. Remaining Work for This Initiative

Phase 1 — Editing Core continues. The only remaining robustness task is **T-121** (lint/format), after which a `lint` step joins the CI `build-and-test` job.

---

## 4. Files Changed This Session

| File | Change | Notes |
| ---- | ------ | ----- |
| `.github/workflows/ci.yml` | **Added** | Two-job CI: build-and-test (typecheck + build + `npm test`) and extension-host-tests (`xvfb-run` + cached `.vscode-test/`) |
| `docs/CHANGELOG.md` | Edited | New T-120 Added entry |
| `docs/TESTING.md` | Edited | §7 CI now live (two jobs documented; lint pending T-121) |
| `docs/TODO.md` | Edited | T-120 → Done; T-121 now leads + intro updated |
| `docs/PROJECT_STATUS.md` | Rewritten | Snapshot for T-120; recommends T-121 |
| `docs/AGENT_HANDOFF.md` | Rewritten | This file |

`dist/`, `dist-test/`, and `.vscode-test/` are build/download artifacts (git-ignored), not committed. No `src/` or `test/` file was changed this session — CI only invokes existing scripts.

---

## 5. Decisions Made

* **GitHub Actions on `ubuntu-latest`.** The standard, free runner; the Extension Host layer's `xvfb` requirement is Linux-only, so a single Linux OS keeps the matrix simple (resolves the prior handoff's "Linux-only vs OS matrix" open question → Linux-only for now).
* **Two separate jobs.** Splitting `extension-host-tests` from `build-and-test` keeps the ~280 MB VS Code download off the fast unit/integration path; both must pass to merge.
* **Cache `.vscode-test/` keyed on `package-lock.json`.** Avoids re-downloading VS Code every run; a dependency bump (which can change the pinned VS Code version) invalidates the cache.
* **No ADR.** CI is process/infrastructure, not an architecture decision — it neither adds a runtime dependency nor changes how the app is built or structured, so the workflow comments + this handoff capture the rationale (consistent with how earlier tooling-only steps were handled).

---

## 6. Assumptions Made

* **The `ubuntu-latest` runner image ships `xvfb`** (it does today), so `xvfb-run -a` provides the display `@vscode/test-electron` needs without an extra apt install.
* **`package-lock.json` is a stable cache key for the VS Code download.** `@vscode/test-electron` resolves a VS Code version that only changes when its own version (pinned in the lockfile) changes, so keying the `.vscode-test/` cache on the lockfile invalidates it exactly when needed.
* **The default branch is `main`.** The workflow triggers on push/PR to `main`; once the repo is under git, the first commit should establish `main` (consistent with every prior handoff).
* **The existing scripts are the right CI surface.** CI invokes `npm run typecheck` / `npm run build` / `npm test` / `npm run test:exthost` as-is rather than introducing CI-only script variants.

---

## 7. Technical Debt Introduced

* **No lint step in CI yet.** The `build-and-test` job has no `lint` step because `npm run lint` does not exist until T-121; the workflow gains it then.
* **Extension Host CI is Linux-only.** `test:exthost` runs only on `ubuntu-latest` (it needs `xvfb`), so a Windows/macOS-specific host regression would not be caught by CI. Acceptable for now; revisit if cross-OS host behaviour becomes a concern.
* **CI has not yet run on GitHub.** The repo is not under git/pushed, so the workflow is unverified on a real runner — watch the first run (especially the `xvfb-run` + cache-miss VS Code download in `extension-host-tests`).
* **Carried over from earlier sessions:** `applyEdit` / `error` / `StateStore.update` failures are still console-only (no VS Code notification); layout / toggle / focus commands target only the active webview; no lint; `Open in MarkStudio` not on the `editor/title` context menu yet; `StateStore` Memento entries accumulate forever; scroll-sync interpolates linearly across very tall blocks (T-2.1); the Extension Host suite uses a short fixed `delay()` after open/revert (switch to event-based waits if CI is flaky).

None of these reverse the architecture; they are scoped placeholders with named successors.

---

## 8. Blockers

* None.

---

## 9. Verification State

* [x] `npm run typecheck` (strict, `src`) passes
* [x] `npm run typecheck:test` (strict, `src` + `test`) passes
* [x] `npm run test:unit` — **43 unit tests pass** on `node:test`
* [x] `npm run test:integration` — **8 integration tests pass** on `node:test` under jsdom
* [x] `npm test` — type-check + **51 tests** (43 unit + 8 integration) green end-to-end
* [x] `npm run build` is green; no app-code or bundle-size change
* [x] `.github/workflows/ci.yml` is valid YAML and invokes only existing, verified scripts
* [ ] **CI run on GitHub — not yet executed** (repo not under git/pushed). Watch the first run, especially `xvfb-run` + the cache-miss VS Code download in `extension-host-tests`.
* [ ] **Manual run in an Extension Development Host (F5) — not required for this session** (no app code changed). The T-111 manual checks remain the outstanding EDH verification from a prior session.

---

## 10. Recommended Next Task

* **Task:** **T-121 — Linting and formatting.**
* **Why this one:** It is the last remaining Phase 1 robustness gap now that all three test layers and CI are in place.
* **Scope ([TODO.md](TODO.md) T-121):**
  * Configure ESLint with strict TypeScript rules (and a formatter) consistent with [CODING_GUIDELINES.md](CODING_GUIDELINES.md).
  * Expose it as `npm run lint` (and likely `npm run format`).
  * Add a `lint` step to the CI **build-and-test** job in `.github/workflows/ci.yml`.
* **Suggested prompt:** [.ai/PROMPTS/feature.md](../.ai/PROMPTS/feature.md).
* **Starting files to read:**
  * [CODING_GUIDELINES.md](CODING_GUIDELINES.md) — the style rules ESLint must encode
  * `package.json` — where the `lint` script lands
  * `.github/workflows/ci.yml` — the `build-and-test` job to extend with a `lint` step
* **Definition of done:** `npm run lint` passes clean on the current tree and runs in CI on push/PR, failing the pipeline on any violation.

---

## 11. Open Questions for the Next Agent

* **Flat config vs `.eslintrc` (T-121).** ESLint 9 defaults to flat config (`eslint.config.js`); decide whether to adopt it or pin the classic `.eslintrc` the TODO names. Either is fine; flat config is the forward-looking choice.
* **Formatter choice (T-121).** Prettier vs ESLint stylistic rules vs the built-in VS Code formatter — pick one and document it in [CODING_GUIDELINES.md](CODING_GUIDELINES.md) so it is not re-litigated.
* **Cross-OS CI matrix.** `extension-host-tests` is Linux-only (needs `xvfb`). If host behaviour ever diverges by OS, add a Windows/macOS matrix entry that runs `build-and-test` (not `test:exthost`).
* **Surface inbound `error` / `applyEdit` / `StateStore.update` failures via `vscode.window.showErrorMessage`?** Still a small follow-up carried from T-103…T-113; a regression test pairs naturally with the Extension Host layer.
* **Next `markstudio.*` settings to add?** Font size/family overrides, preview options, and a word-wrap toggle remain natural extensions of `MarkStudioConfig` + the compartment pattern.
