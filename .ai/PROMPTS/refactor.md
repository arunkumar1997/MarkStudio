# PROMPT — Refactor

> Use this prompt as your working framework for any change that **does not alter user-visible behavior**.

A refactor is justified only when it improves clarity, performance, or maintainability **measurably**. "It feels cleaner" is not a justification.

---

## 0. Pre-Flight

Read first:

1. [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md)
2. [.ai/CONTEXT.md](../CONTEXT.md) — especially Anti-Patterns We Refuse
3. [.ai/WORKFLOW.md](../WORKFLOW.md)
4. docs/ARCHITECTURE.md
5. docs/DECISIONS.md
6. docs/AGENT_HANDOFF.md

---

## 1. Justification

* **What is being refactored:**
* **Why now:** *(blocker for a feature? performance issue? bug-prone area?)*
* **Concrete benefit:** *(e.g., "removes 200 lines of duplication", "drops keystroke latency from 18ms to 6ms", "eliminates a circular import")*
* **What happens if we do NOT refactor:**

If the answer to "concrete benefit" is vague or aesthetic, **do not refactor**. Close this prompt.

---

## 2. Scope

* **Files in scope:**
* **Files explicitly out of scope:**
* **Public API changes:** *(should be NONE for a pure refactor)*
* **Behavior changes:** *(must be NONE — otherwise this is a feature or fix)*

If the refactor changes a public API or message contract, escalate via [PROMPTS/architecture.md](architecture.md) and write an ADR.

---

## 3. Compliance Check

* [ ] No new dependency introduced
* [ ] No UI framework introduced
* [ ] No CSS framework introduced
* [ ] No hardcoded colors / fonts
* [ ] Custom Editor lifecycle unchanged
* [ ] Webview lifecycle unchanged
* [ ] CodeMirror lifecycle unchanged
* [ ] Preview rendering strategy unchanged (still incremental)
* [ ] State persistence keys and shapes unchanged

---

## 4. Plan

Ordered list of mechanical, reviewable steps. Each step should leave the codebase in a working state.

1.
2.
3.

---

## 5. Safety Net

Before changing code, confirm the refactored area is covered by tests.

* **Existing tests that cover this area:**
* **Tests added to cover untested behavior BEFORE refactoring:**
* [ ] All tests pass on the current code
* [ ] All tests still pass after the refactor

If the area is undertested, **add tests first**. Refactoring without tests is forbidden.

---

## 6. Verification

* [ ] All tests pass
* [ ] No public API changed (run a diff)
* [ ] No message contract changed
* [ ] No persisted state shape changed
* [ ] Manual smoke test in dark / light / high-contrast themes
* [ ] No new console errors or warnings
* [ ] Bundle size did not increase (or increase is justified and noted)

---

## 7. Documentation Updates

* [ ] docs/ARCHITECTURE.md — if module boundaries shifted
* [ ] docs/DECISIONS.md — if any judgment call was made during refactor
* [ ] docs/CHANGELOG.md — under **Changed** (only if developer-visible)
* [ ] docs/PROJECT_STATUS.md
* [ ] docs/TODO.md — remove "refactor X" items now done
* [ ] docs/AGENT_HANDOFF.md

User-facing CHANGELOG entry is usually **not** required for a pure refactor.

---

## 8. Handoff Note

Rewrite docs/AGENT_HANDOFF.md using [TEMPLATES/HANDOFF.md](../TEMPLATES/HANDOFF.md). Include:

* Refactor scope
* Files changed
* Tests added
* Any follow-up technical debt
* Recommended next task
