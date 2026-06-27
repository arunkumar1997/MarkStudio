# TESTING

> The test strategy for MarkStudio: what we test, how we test it, and the manual verification every change must pass. The **unit-test harness exists** (task **T-112**): `node:test` + `node:assert`, with esbuild bundling the TypeScript tests and aliasing the host-only `vscode` module to a mock (ADR-0011). The **integration layer for the webview DOM seams exists** (task **T-113**): the same `node:test` runner under a jsdom harness, covering CodeMirror and the markdown-it preview (ADR-0012). The **Extension Host lifecycle layer now exists too** (task **T-113b**): a real VS Code booted by `@vscode/test-electron` with a minimal in-host runner, covering the Custom Editor lifecycle (ADR-0013). This document defines the full target.

---

## 1. Testing Philosophy

* **Test behavior, not implementation.** Tests assert observable outcomes (document content, dirty state, emitted messages, rendered DOM), not private internals.
* **Keep logic pure to keep it testable.** Transformation logic (diffing, message construction, view-state shaping) is written as pure functions that run without VS Code or a DOM. Side effects live at the edges.
* **Fast feedback.** Unit tests run in milliseconds and are the default. Integration tests cover the seams that unit tests cannot.
* **A change is not done until it is verified.** See the Definition of Done in [.ai/START_HERE.md](../.ai/START_HERE.md) §6.

---

## 2. Test Layers

### 2.1 Unit tests

Pure logic, no VS Code host, no real DOM.

Targets include:
* `MarkStudioDocument` — content edits, dirty state transitions, undo/redo bookkeeping.
* `messaging/` — message construction, discriminated-union narrowing, boundary validation.
* `webview/state/viewState` — serialization/restoration of cursor, scroll, split ratio, preview visibility.
* `webview/preview` diff logic — choosing the minimal set of nodes to patch.

### 2.2 Integration tests

Two strata, by what the seam needs.

**Webview DOM seams (live — task T-113, ADR-0012).** CodeMirror and the markdown-it preview need a real DOM but not a running VS Code, so they run on the same `node:test` runner under a jsdom harness (`npm run test:integration`). Covered:
* The CM6 `RemoteSync` echo path: a host `setContentFromHost` updates the document but does **not** round-trip back as a local `edit`.
* Minimal-diff cursor preservation: host content that changes a region after the cursor leaves the cursor offset put (T-110).
* A user edit forwards to `onLocalChange` as a diff batch.
* The preview's incremental DOM patching: only the edited block's `Element` is replaced; unchanged blocks keep node identity. Plus the source-line mapping and update coalescing.

**Extension Host lifecycle (live — task T-113b, ADR-0013).** Exercises the Custom Editor lifecycle and the native document lifecycle in a real Extension Host (booted by `@vscode/test-electron`; `npm run test:exthost`). A minimal hand-rolled in-host runner over `node:assert` (no Mocha) keeps the dependency list lean. Because a custom editor's webview runs in an isolated iframe with no public introspection API, these tests assert the **host-observable** contract rather than the webview DOM (that is the jsdom layer's job). Covered:
* The extension is discoverable and activates.
* Resolving the custom editor (`vscode.openWith`) opens the document without error — the resolve path builds the webview and starts the `init`/`ready` handshake.
* An `edit` (a `WorkspaceEdit`, the same host path the webview's `edit` message takes) makes the document dirty; `save` clears it.
* Revert restores the on-disk content and clears dirty state.

Not asserted here (out of reach of the public API): the `init`/`ready` handshake observed *inside* the webview, focus, and pixel/scroll geometry — these stay in the manual matrix (§4).

### 2.3 Manual verification

Some guarantees (visual correctness, theme behavior, scroll feel, large-file smoothness) require a human in the Extension Development Host. The matrix in §4 is mandatory for every user-facing change.

---

## 3. Running Tests (target commands)

The unit layer is live (T-112); the webview-seam integration layer is live (T-113); the Extension Host lifecycle layer is live (T-113b).

```
npm run build           # type-check + bundle (must pass before tests)
npm test                # type-check tests, then run the unit + integration suites
npm run test:unit        # fast unit tests only (bundle + node --test)
npm run test:integration # jsdom webview-seam tests (bundle + node --test)
npm run test:exthost     # Extension Host lifecycle tests (build + bundle + boot VS Code)
npm run typecheck:test   # strict type-check of test sources
npm run lint             # ESLint (strict TypeScript rules) + Prettier --check
npm run lint:fix         # auto-fix ESLint findings + Prettier --write
```

The unit harness uses Node's built-in runner (`node:test`); esbuild bundles `test/**/*.test.ts` into `dist-test/` and aliases the host-only `vscode` module to `test/_mocks/vscode.ts` (ADR-0011). The integration harness reuses that runner under a jsdom DOM, bundling `test/integration/**/*.test.ts` into `dist-test/integration.cjs` (ADR-0012). The Extension Host harness boots a real VS Code via `@vscode/test-electron`, bundling a launcher (`dist-test/exthost-runner.cjs`) and an in-host suite (`dist-test/exthost-suite.cjs`, `vscode` left external) run by a minimal in-host runner (ADR-0013); it is kept **out** of the default `test` because it downloads a full VS Code. `npm run lint` (T-121) runs ESLint (flat config, `eslint.config.mjs`) with `--max-warnings 0` and `prettier --check .`; it runs in CI on every push/PR.

---

## 4. Manual Verification Matrix

Every user-facing change must be verified against the following before it is marked done (mirrors [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) §2.5 and [.ai/TEMPLATES/FEATURE.md](../.ai/TEMPLATES/FEATURE.md) §7):

* [ ] Dark theme correct
* [ ] Light theme correct
* [ ] High-contrast theme correct
* [ ] Keyboard-only operation works for the change
* [ ] Webview is **not** recreated on tab switch
* [ ] CodeMirror state preserved across tab switch
* [ ] Cursor and scroll preserved across tab switch
* [ ] Preview **patches** the DOM (verified in DevTools — no full re-render on keystroke)
* [ ] Behaves on a large file (≥ 1 MB)
* [ ] Behaves when the file is modified externally
* [ ] Behaves with VS Code autosave enabled
* [ ] No new errors in the webview console
* [ ] No new errors in the extension host

---

## 5. Performance Verification

Performance is a feature ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.4). For changes that touch editing or preview, record measurements against the budget in the feature's [implementation/](implementation/) record:

* Keystroke-to-preview latency (target set per feature).
* DOM nodes touched per update (should be minimal, never the whole tree).
* Memory delta per open MarkStudio tab.
* Bundle-size delta.

Use the browser DevTools Performance panel (attached to the webview) and the VS Code process explorer.

---

## 6. What Must Have Tests

* Any new pure logic → unit test.
* Any change to the Custom Editor lifecycle, message bus, or persistence → integration test.
* A bug fix → a regression test that fails before the fix and passes after.

Never delete or skip a failing test to make a build green. If a test fails and the cause is unknown, document it under **Blockers** in [AGENT_HANDOFF.md](AGENT_HANDOFF.md).

---

## 7. Continuous Integration

CI is **live** (tasks **T-120, T-121**): the GitHub Actions workflow at `.github/workflows/ci.yml` runs on every push to `main` and every pull request, and a red pipeline blocks merge. It has two jobs on `ubuntu-latest`:

* **build-and-test** — `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build`, then `npm test` (the unit + integration layers).
* **extension-host-tests** — `npm ci`, then `xvfb-run -a npm run test:exthost` (the Extension Host layer needs a display, so it runs under `xvfb` on the headless Linux runner). The VS Code build downloaded by `@vscode/test-electron` (~280 MB) is cached under `.vscode-test/`, keyed on `package-lock.json`, so only the first run (or a dependency bump) re-downloads it.

Linting and format-checking (`npm run lint` — ESLint + `prettier --check`) run in the **build-and-test** job and fail the pipeline on any violation (T-121).
