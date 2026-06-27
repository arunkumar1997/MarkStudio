# PROMPT — Code Review

> Use this prompt to review a change (PR, patch, or in-progress work) against MarkStudio's standards.

Review is **enforcement** of [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md), [.ai/CONTEXT.md](../CONTEXT.md), and docs/CODING_GUIDELINES.md. It is not a stylistic opinion exchange.

---

## 0. Pre-Flight

Read first:

1. [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md) — Non-Negotiable Rules
2. [.ai/CONTEXT.md](../CONTEXT.md) — Anti-Patterns We Refuse
3. docs/ARCHITECTURE.md
4. docs/DECISIONS.md — recent ADRs
5. The matching prompt for the change type ([feature](feature.md) / [bugfix](bugfix.md) / [refactor](refactor.md) / [architecture](architecture.md))

---

## 1. Change Summary

* **Title:**
* **Type:** *(feature / bugfix / refactor / architecture)*
* **Files changed:**
* **Lines added / removed:**
* **Linked TODO / ADR / handoff item:**

---

## 2. Non-Negotiable Rule Gate

Hard fail if any answer is "No":

* [ ] Uses Custom Editor API (no new WebviewPanel-only editor)
* [ ] Uses CodeMirror 6 (no alternate editor)
* [ ] Uses markdown-it (no alternate renderer)
* [ ] No React / Vue / Angular / Svelte / Lit / other UI framework
* [ ] No Tailwind / Bootstrap / Material UI / other CSS framework
* [ ] No hardcoded theme colors, fonts, or sizes
* [ ] `webview.html` not reassigned after initialization
* [ ] Webview not recreated on tab switch
* [ ] CodeMirror not recreated
* [ ] Preview patches DOM (not full re-render)

A failure here blocks the change. No exceptions without an accepted ADR.

---

## 3. Architecture & Design

* [ ] Module boundaries respected
* [ ] Single Responsibility Principle followed
* [ ] No god classes / kitchen-sink utility files introduced
* [ ] No new global mutable state
* [ ] Composition preferred over inheritance
* [ ] Message bus types are explicit and exhaustive
* [ ] State persistence keys and shapes documented
* [ ] No magic strings — constants or types used

---

## 4. TypeScript & Code Quality

* [ ] Strict TypeScript — no `any`, no implicit `any`
* [ ] Explicit return types on public functions
* [ ] No `// @ts-ignore` / `// @ts-expect-error` without a comment explaining why
* [ ] Small files, small functions
* [ ] Naming is clear and consistent with the rest of the codebase
* [ ] No dead code, no commented-out code
* [ ] No console.log left behind (logger used instead, if any)
* [ ] Imports are clean (no unused, no deep relative climbs like `../../../`)

---

## 5. Performance

* [ ] No synchronous heavy work on the extension host main thread
* [ ] Hot paths (keystroke → preview) are debounced / throttled appropriately
* [ ] No full DOM regeneration for incremental updates
* [ ] No unnecessary event listeners (added without being removed)
* [ ] No allocations in tight loops where avoidable
* [ ] Large file scenario considered

---

## 6. Theme & A11y

* [ ] All styling uses `--vscode-*` variables
* [ ] Light, dark, and high-contrast themes verified
* [ ] Focus indicators visible
* [ ] Keyboard navigation works without mouse
* [ ] `prefers-reduced-motion` respected where animations exist
* [ ] Codicons used for icons (no custom icon assets)

---

## 7. Tests

* [ ] New behavior is covered by tests
* [ ] Regression test added for any bug fix
* [ ] Tests are deterministic (no time-based flakiness, no network)
* [ ] Tests run reasonably fast
* [ ] No tests skipped without explanation in code + handoff

---

## 8. Documentation

* [ ] docs/CHANGELOG.md updated
* [ ] docs/PROJECT_STATUS.md updated
* [ ] docs/TODO.md updated
* [ ] docs/AGENT_HANDOFF.md rewritten using [TEMPLATES/HANDOFF.md](../TEMPLATES/HANDOFF.md)
* [ ] docs/ARCHITECTURE.md updated if structure changed
* [ ] docs/DECISIONS.md has an ADR if a decision was made (use [TEMPLATES/ADR.md](../TEMPLATES/ADR.md))
* [ ] docs/FEATURES.md updated for feature changes
* [ ] Any new public API has documentation

---

## 9. Commit Hygiene

* [ ] Commit messages follow `feat: / fix: / perf: / docs: / refactor: / style: / test: / build: / chore:`
* [ ] One logical change per commit
* [ ] Documentation update is in the **same commit** as the code change
* [ ] No noisy "fix typo" or "wip" commits that should be squashed

---

## 10. Review Verdict

Pick one:

* **Approve** — all gates pass, no concerns.
* **Approve with comments** — minor non-blocking suggestions; author may merge after addressing or noting.
* **Request changes** — one or more gate failures, must be resolved before merge.
* **Block** — non-negotiable rule violated; needs ADR + redesign, not a patch.

### Comments

Group feedback by file and severity. Use prefixes:

* `[BLOCK]` — must fix, gate failure
* `[CHANGE]` — must fix before merge
* `[NIT]` — optional improvement
* `[QUESTION]` — needs author clarification
* `[PRAISE]` — worth calling out so the pattern spreads

---

## 11. Reviewer Handoff

If the review is incomplete (out of context, large change), record in docs/AGENT_HANDOFF.md:

* Which sections of the change were reviewed
* Which were not
* Which gates still need verification
* The next reviewer's recommended starting point
