# CODING GUIDELINES

> The code standards for MarkStudio. These exist to keep the codebase small, native, and maintainable across long-running, multi-agent development. They derive from [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) and [.ai/CONTEXT.md](../.ai/CONTEXT.md).

---

## 1. Language and Compiler

* **TypeScript, strict mode.** `tsconfig.json` enables `strict`, `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`, `noUnusedParameters`, and `noFallthroughCasesInSwitch`.
* **No `any`.** Use precise types, generics, or `unknown` with narrowing. If `any` is truly unavoidable, isolate it behind a typed boundary and comment why.
* **Explicit public types.** Every exported function, class, and message type has explicit parameter and return types.
* **Prefer `readonly` and `const`.** Default to immutability; mutate only where necessary and locally.

### Enforcement

* **ESLint** (flat config, `eslint.config.mjs`) encodes the lint-able rules here — `@typescript-eslint` recommended plus no-`any`, explicit exported types, no unused code, `===` over `==`, and no stray `console` (only `warn`/`error`). Run `npm run lint`.
* **Prettier** (`.prettierrc.json`) owns formatting: 2-space indent, double quotes, semicolons, no trailing commas, 80-column width. `eslint-config-prettier` switches off any ESLint stylistic rules so the two never fight. `npm run lint` runs `prettier --check`; `npm run lint:fix` applies fixes.
* Both run in CI on every push/PR (TESTING.md §7); a violation fails the pipeline.

---

## 2. Files and Modules

* **Small files, single responsibility.** A file does one thing. If you cannot summarize a file's purpose in one sentence, split it.
* **One primary export per file** where practical; name the file after it.
* **Folder = concern.** Group by responsibility (`editor/`, `messaging/`, `preview/`, `services/`), not by type.
* **No god files / utility dumping grounds.** A `utils.ts` that accumulates unrelated helpers is forbidden; put helpers next to the concern they serve.

---

## 3. Functions

* **Small and focused.** Prefer functions that fit on one screen. Extract when a function grows multiple responsibilities.
* **Few parameters.** Beyond three, pass a typed options object.
* **Pure where possible.** Keep side effects (DOM, `vscode` API, I/O) at the edges; keep transformation logic pure and testable.
* **Shallow nesting.** Use early returns and guard clauses instead of deep `if` pyramids.

---

## 4. Naming

* **Clear over clever.** Names describe intent, not implementation.
* **Conventions:** `PascalCase` for types/classes, `camelCase` for variables/functions, `SCREAMING_SNAKE_CASE` only for true compile-time constants, `kebab-case` for file and folder names except class files which match the class (`MessageBus.ts`).
* **No magic strings or numbers.** Message types, command IDs, configuration keys, and storage keys are named constants in one place (e.g., `messaging/messages.ts`, a `commandIds` module).

---

## 5. Architecture Discipline

These mirror the non-negotiable rules ([ARCHITECTURE.md](ARCHITECTURE.md), [DECISIONS.md](DECISIONS.md)). Code that violates them must not be merged:

* Use the **Custom Editor API**; never a plain WebviewPanel as the editor.
* Keep **one persistent webview**; set `retainContextWhenHidden: true`; assign `webview.html` once and never reassign it.
* Never recreate **CodeMirror** or the **preview DOM**; update incrementally.
* All host ⇄ webview communication goes through the **typed MessageBus**; payloads are plain JSON (no `vscode` objects, DOM nodes, or functions).
* **No UI framework** (React/Vue/Svelte/Angular/Lit) and **no CSS framework** (Tailwind/Bootstrap/Material UI).
* **No hardcoded colors, fonts, or sizes** — style only with `--vscode-*` variables.
* **No custom autosave**; respect VS Code autosave. **No custom file watcher** when `workspace.createFileSystemWatcher` suffices.

Any deviation requires an ADR in [DECISIONS.md](DECISIONS.md) **before** implementation.

---

## 6. Composition over Inheritance

* Prefer small composable functions and modules to deep class hierarchies.
* Use classes for entities with clear identity and lifecycle (e.g., `MarkStudioDocument`), not as namespaces.
* Avoid base classes that exist only to share code; share via functions/modules instead.

---

## 7. State Management

* **No ambient global mutable state.** Pass dependencies explicitly; scope state to the component that owns it.
* **View state** (cursor, scroll, split ratio, preview visibility) lives in the webview via `vscode.setState()`/`getState()`.
* **Document state** (content, dirty, undo) lives in the host's `CustomDocument`.
* **Preferences/settings** come from the Configuration API; **persisted cross-session data** uses Memento. Never store document content in a Memento.

---

## 8. Performance

Performance is a feature ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.4):

* Send **diffs**, not whole-document snapshots, across the message bus.
* **Debounce** expensive preview work; never block typing on a full render.
* **Patch** the DOM; never replace the preview tree.
* Avoid unnecessary allocations and redundant event listeners; remove listeners on disposal.
* Never do synchronous, blocking work on the extension-host main thread.

---

## 9. Error Handling

* Fail loudly in development, gracefully in production. Surface errors through a typed `error` message and VS Code notifications where appropriate.
* Never swallow errors silently. If you intentionally ignore one, comment why.
* Validate messages at the boundary; treat anything crossing the MessageBus as untrusted input.

---

## 10. Dependencies

Apply the **Dependency Policy** from [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) before adding anything. Answer, in the ADR:

1. Why is it needed?
2. Is it actively maintained?
3. Can VS Code, CodeMirror, or markdown-it already do this?
4. Can it be implemented simply ourselves?
5. What is the bundle-size impact?

Every new runtime dependency requires an ADR in [DECISIONS.md](DECISIONS.md).

---

## 11. Comments and Documentation

* **Comment the "why", not the "what".** Code should be self-explanatory; comments explain intent, trade-offs, and non-obvious constraints.
* **No commented-out code** in commits.
* Public/exported API has a short doc comment describing purpose, parameters, and return value.
* Update the relevant `docs/` files in the **same change** as the code (see [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) §2.6).

---

## 12. Testing Expectations

* New logic ships with unit tests; lifecycle/message/persistence changes ship with integration tests.
* Keep transformation logic pure so it is testable without VS Code or the DOM. See [TESTING.md](TESTING.md).

---

## 13. Commit Hygiene

Follow the convention in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) and [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) §3:

```
feat:  fix:  perf:  docs:  refactor:  style:  test:  build:  chore:
```

* One logical change per commit.
* Code and its documentation update belong in the **same commit**.
* No unrelated refactors smuggled into a feature commit.

---

## 14. Definition of Done (Code)

A change is done only when it satisfies the Definition of Done in [.ai/START_HERE.md](../.ai/START_HERE.md) §6 and [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) §2.8: compiles under strict TypeScript, `npm run lint` passes clean, tests pass, no hardcoded colors, webview/editor/preview not recreated, verified across themes, and all relevant docs updated.
