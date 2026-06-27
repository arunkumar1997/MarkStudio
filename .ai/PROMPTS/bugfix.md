# PROMPT — Bug Fix

> Use this prompt as your working framework when fixing a **bug** in MarkStudio.

Bugs are small. The discipline around them is not.

---

## 0. Pre-Flight

Read first:

1. [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md) — relevant sections
2. [.ai/WORKFLOW.md](../WORKFLOW.md)
3. docs/PROJECT_STATUS.md
4. docs/AGENT_HANDOFF.md
5. docs/ARCHITECTURE.md
6. docs/DECISIONS.md (relevant ADRs)

---

## 1. Bug Report

* **ID / Source:** *(issue number, handoff note, internal observation)*
* **Title:**
* **Severity:** *(blocker / major / minor / cosmetic)*
* **Reproduction steps:**
  1.
  2.
  3.
* **Expected behavior:**
* **Actual behavior:**
* **Affected versions / commits:**
* **Affected platforms / themes:**

---

## 2. Root Cause Analysis

Do **not** patch the symptom before finding the cause. Document:

* **Symptom:**
* **Hypothesis:**
* **Investigation steps taken:**
* **Confirmed root cause:**
* **Why was this not caught earlier?** *(missing test, untested path, architectural gap)*

If the root cause reveals an architectural issue, escalate via [PROMPTS/architecture.md](architecture.md) and an ADR.

---

## 3. Fix Plan

* **File(s) to change:**
* **Minimal change description:**
* **Why this fix does not introduce regressions:**
* **Side effects considered:**

The fix must be the **smallest change** that resolves the root cause. No drive-by refactors.

---

## 4. Compliance Check

* [ ] Fix does not introduce hardcoded colors / fonts
* [ ] Fix does not recreate webview / CodeMirror
* [ ] Fix does not break Custom Editor lifecycle
* [ ] Fix does not regress preview incremental rendering
* [ ] Fix does not break state persistence
* [ ] No new dependency (or ADR added if needed)

---

## 5. Regression Test

A bug fix is **not done** without a test that fails before the fix and passes after.

* **Test file:**
* **Test name:**
* **What it asserts:**
* [ ] Test fails on the broken code
* [ ] Test passes after the fix

If a regression test is genuinely impractical, document why in docs/AGENT_HANDOFF.md under **Technical Debt** and create a TODO.

---

## 6. Manual Verification

* [ ] Reproduction steps from Section 1 no longer trigger the bug
* [ ] Verified in dark theme
* [ ] Verified in light theme
* [ ] Verified in high-contrast theme
* [ ] No new console errors / warnings in the webview
* [ ] No new errors in the extension host log

---

## 7. Documentation Updates

* [ ] docs/CHANGELOG.md — under **Fixed**
* [ ] docs/PROJECT_STATUS.md — remove from **Known Issues** if listed
* [ ] docs/TODO.md — remove or update related items
* [ ] docs/AGENT_HANDOFF.md
* [ ] docs/DECISIONS.md — only if the fix required a decision

---

## 8. Handoff Note

Rewrite docs/AGENT_HANDOFF.md using [TEMPLATES/HANDOFF.md](../TEMPLATES/HANDOFF.md). Include:

* Bug summary and root cause
* Files changed
* Regression test added
* Any follow-up technical debt
* Recommended next task
