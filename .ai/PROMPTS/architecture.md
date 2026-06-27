# PROMPT — Architectural Change

> Use this prompt for any change that affects module boundaries, the message bus, the Custom Editor lifecycle, state persistence shape, or introduces a new dependency.

Architectural changes are **slow on purpose**. They must outlive the agent who proposes them.

---

## 0. Pre-Flight

Read **all** of these before writing anything:

1. [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md) — entire file
2. [.ai/CONTEXT.md](../CONTEXT.md) — entire file
3. [.ai/WORKFLOW.md](../WORKFLOW.md)
4. docs/ARCHITECTURE.md — entire file
5. docs/DECISIONS.md — all prior ADRs
6. docs/PROJECT_STATUS.md
7. docs/AGENT_HANDOFF.md

---

## 1. Trigger

* **What forced this change:** *(feature blocked? performance ceiling? bug pattern? scaling concern?)*
* **Evidence:** *(benchmark, repeated bugs, failed feature attempts)*
* **What happens if we do NOT change:**

Architectural change without a concrete trigger is **forbidden**. Close this prompt.

---

## 2. Proposal Summary

* **Title:**
* **Affected layers:** *(extension host / webview / message bus / state persistence / build / dependencies)*
* **One-paragraph description:**
* **Alternatives considered:**

---

## 3. Compliance Check

The proposal must not violate any non-negotiable rule. If it does, the proposal must include a justification strong enough to overturn that rule **and** a migration plan.

* [ ] Still uses Custom Editor API
* [ ] Still uses CodeMirror 6
* [ ] Still uses markdown-it
* [ ] No UI framework introduced
* [ ] No CSS framework introduced
* [ ] No hardcoded colors / fonts
* [ ] Webview remains persistent and singular
* [ ] CodeMirror remains persistent and singular
* [ ] Preview remains incremental
* [ ] Theme variables still drive all styling

For each unchecked item, write a dedicated subsection explaining why the rule should bend and how the bend will be contained.

---

## 4. Impact Analysis

| Area                        | Impact | Migration cost |
| --------------------------- | ------ | -------------- |
| Public commands             |        |                |
| Configuration keys          |        |                |
| Persisted state shape       |        |                |
| Message bus contracts       |        |                |
| Build / bundle size         |        |                |
| Performance budget          |        |                |
| Test surface                |        |                |
| Documentation surface       |        |                |

---

## 5. Dependency Policy (if a new dependency)

Answer **every** question from the Dependency Policy in [PROJECT_SPEC.md](../PROJECT_SPEC.md):

* Why is it needed?
* Is it maintained?
* Can VS Code already do this?
* Can it be implemented simply?
* What is the bundle size impact?
* What is the license?
* What is the security history?

A "no" or "unclear" answer to any question kills the proposal until resolved.

---

## 6. Migration Plan

Architectural changes are **never** big-bang.

1. **Compatibility step:** introduce the new architecture alongside the old.
2. **Migration step(s):** move call sites one at a time.
3. **Cleanup step:** remove the old architecture.
4. **Verification:** between every step, the project must build, tests must pass, and behavior must be preserved.

List the concrete steps:

1.
2.
3.

Identify the **rollback point** for each step.

---

## 7. Write the ADR

Create a new ADR file in docs/DECISIONS.md (or docs/decisions/ if the repo uses one-per-file ADRs) using [TEMPLATES/ADR.md](../TEMPLATES/ADR.md). The ADR must include:

* Date
* Decision
* Alternatives considered (with reasons rejected)
* Reasoning
* Consequences (positive and negative)
* Migration plan reference

The ADR is part of the **same commit** as the first architectural step.

---

## 8. Test Plan

* Unit tests for new modules
* Integration tests across the new boundary
* Performance benchmarks if the change touches the hot path (keystroke → preview)
* Manual verification across dark / light / high-contrast themes

---

## 9. Documentation Updates

* [ ] docs/ARCHITECTURE.md — rewrite affected sections
* [ ] docs/DECISIONS.md — new ADR (mandatory)
* [ ] docs/CHANGELOG.md — under **Changed** with a clear migration note for developers
* [ ] docs/PROJECT_STATUS.md
* [ ] docs/TODO.md — add follow-up cleanup tasks
* [ ] docs/AGENT_HANDOFF.md
* [ ] docs/README.md — if developer-facing setup changed
* [ ] docs/CODING_GUIDELINES.md — if patterns changed
* [ ] [.ai/CONTEXT.md](../CONTEXT.md) — if a Core Belief or Anti-Pattern was revised

---

## 10. Handoff Note

Architectural changes typically span multiple sessions. The handoff is **especially critical**.

Rewrite docs/AGENT_HANDOFF.md using [TEMPLATES/HANDOFF.md](../TEMPLATES/HANDOFF.md). Include:

* Which migration step is complete
* Which migration step is next
* Rollback instructions for the in-progress step
* Open ADR reference
* Outstanding test gaps
