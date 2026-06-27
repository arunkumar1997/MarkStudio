# PROMPT — Feature

> Use this prompt as your working framework when implementing a **new feature** in MarkStudio.

Copy this file's structure into your working notes (or a scratch doc) for the task. Fill it in stage by stage. Do not skip stages.

---

## 0. Pre-Flight

Read first (in this order):

1. [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md)
2. [.ai/CONTEXT.md](../CONTEXT.md)
3. [.ai/WORKFLOW.md](../WORKFLOW.md)
4. docs/PROJECT_STATUS.md
5. docs/AGENT_HANDOFF.md
6. docs/ARCHITECTURE.md
7. docs/FEATURES.md
8. docs/TODO.md
9. docs/DECISIONS.md (skim for relevant ADRs)

If any required doc is missing, create it from [.ai/TEMPLATES/](../TEMPLATES/) **before** writing code.

---

## 1. Feature Definition

* **Name:**
* **Phase (from roadmap):**
* **Source:** (TODO item, handoff recommendation, spec section)
* **One-sentence description:**
* **User value:** *Why does the user care?*
* **Out of scope:** *What this feature explicitly does NOT do.*

---

## 2. Compliance Check

Confirm the feature does not violate any non-negotiable rule. For each, answer **Yes / N/A / Risk**:

* [ ] Uses Custom Editor API (no new WebviewPanel)
* [ ] Uses CodeMirror 6 (no alternate editor)
* [ ] Uses markdown-it (no alternate renderer)
* [ ] No UI framework introduced
* [ ] No CSS framework introduced
* [ ] No hardcoded colors / fonts / sizes
* [ ] Webview not recreated
* [ ] CodeMirror not recreated
* [ ] Preview patches DOM (no full re-render)
* [ ] No custom autosave / custom file watcher when VS Code API exists

If any item is **Risk**, stop and write an ADR using [TEMPLATES/ADR.md](../TEMPLATES/ADR.md) before proceeding.

---

## 3. Research Notes

* **Existing code touched:** *(files, modules, exported symbols)*
* **Existing patterns to follow:** *(message bus, state persistence, theme tokens, etc.)*
* **VS Code APIs needed:**
* **CodeMirror 6 extensions needed:**
* **markdown-it plugins needed:**
* **Open questions:**

---

## 4. Design

### 4.1 Data Flow

Describe the flow extension-host ↔ webview, including message types:

```
ExtensionHost ──postMessage(type, payload)──▶ Webview
Webview       ──postMessage(type, payload)──▶ ExtensionHost
```

### 4.2 New / Modified Files

| File | Purpose | New or Modified |
| ---- | ------- | --------------- |
|      |         |                 |

### 4.3 Public API Surface

* New commands:
* New configuration keys:
* New message types:
* New exported types:

### 4.4 State to Persist

* Via `vscode.setState()`:
* Via VS Code Memento (workspace/global state):
* Via CustomDocument:

### 4.5 Performance Budget

* Keystroke-to-preview latency target:
* Max DOM nodes touched per update:
* Memory delta for an open MarkStudio tab:

---

## 5. Implementation Plan

Ordered list of small, reviewable steps. Each step should be independently committable.

1.
2.
3.

---

## 6. Test Plan

* **Unit tests:** *(what logic, in which file)*
* **Integration tests:** *(Custom Editor lifecycle, message bus, state persistence)*
* **Manual verification:**
  * [ ] Webview not recreated on tab switch
  * [ ] CodeMirror state preserved
  * [ ] Preview patches DOM (verify in DevTools)
  * [ ] Cursor + scroll preserved across tab switch
  * [ ] Works in dark theme
  * [ ] Works in light theme
  * [ ] Works in high-contrast theme
  * [ ] Keyboard-only operation works
  * [ ] No regressions in existing features

---

## 7. Documentation Updates

* [ ] docs/FEATURES.md — describe the feature
* [ ] docs/ARCHITECTURE.md — if module boundaries changed
* [ ] docs/DECISIONS.md — new ADR if a decision was made
* [ ] docs/CHANGELOG.md
* [ ] docs/PROJECT_STATUS.md
* [ ] docs/TODO.md
* [ ] docs/AGENT_HANDOFF.md
* [ ] docs/README.md — if user-facing usage changed
* [ ] docs/implementation/<feature-name>.md — if the feature needs a spec record

Use [TEMPLATES/FEATURE.md](../TEMPLATES/FEATURE.md) for the implementation doc.

---

## 8. Definition of Done

The feature is done only when **every** item in [START_HERE.md](../START_HERE.md#6-definition-of-done) Section 6 is satisfied.

---

## 9. Handoff Note

When finishing the session, rewrite docs/AGENT_HANDOFF.md from [TEMPLATES/HANDOFF.md](../TEMPLATES/HANDOFF.md). Include:

* Feature status (done / partial / blocked)
* Files changed
* Decisions made
* Assumptions
* Technical debt introduced
* Recommended next task
