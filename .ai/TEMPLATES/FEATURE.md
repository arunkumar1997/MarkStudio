# FEATURE — <Feature Name>

> Copy this template into `docs/implementation/<feature-slug>.md` when implementing a non-trivial feature. The file becomes the durable record of *what was built and why*, complementing the ADR (which records *the decision*) and the changelog (which records *the change*).
>
> For small features, a single section in docs/FEATURES.md is enough. Use this template when the feature has its own design surface (data flow, message types, persisted state, performance budget).

---

## 1. Metadata

* **Name:**
* **Slug:** *(kebab-case, matches filename)*
* **Phase:** *(from [.ai/PROJECT_SPEC.md](../PROJECT_SPEC.md) Long-Term Roadmap)*
* **Status:** `Designing` | `Implementing` | `Shipped` | `Deprecated`
* **Owner (current):**
* **Started:** YYYY-MM-DD
* **Shipped:** YYYY-MM-DD
* **Related ADRs:** ADR-NNNN, …
* **Related TODO items:**

---

## 2. Summary

* **One-sentence description:**
* **User value:**
* **Out of scope:**

---

## 3. UX Specification

* **Entry points:** *(command palette, toolbar, context menu, keybinding, configuration)*
* **Default behavior:**
* **Configurable behavior:** *(list configuration keys with defaults)*
* **Keyboard interactions:**
* **Visual changes:** *(reference only — actual styling uses `--vscode-*` variables)*
* **Accessibility notes:**

Include screenshots in `docs/screenshots/<feature-slug>/` and link them here.

---

## 4. Architecture

### 4.1 Components Touched

| Component | Role in this feature |
| --------- | -------------------- |
|           |                      |

### 4.2 Data Flow

```
ExtensionHost ──postMessage(type, payload)──▶ Webview
Webview       ──postMessage(type, payload)──▶ ExtensionHost
```

Describe the sequence end to end.

### 4.3 Message Types

| Direction | Type | Payload | Purpose |
| --------- | ---- | ------- | ------- |
|           |      |         |         |

### 4.4 Persisted State

| Store | Key | Shape | Purpose |
| ----- | --- | ----- | ------- |
| `vscode.setState()` |     |       |         |
| Workspace memento   |     |       |         |
| Global memento      |     |       |         |
| CustomDocument      |     |       |         |

### 4.5 Dependencies

* New runtime dependencies: *(must have an ADR — see [PROJECT_SPEC.md](../PROJECT_SPEC.md) Dependency Policy)*
* New dev dependencies:
* CodeMirror 6 extensions used:
* markdown-it plugins used:
* VS Code APIs used:

---

## 5. Performance Budget

* Keystroke-to-preview latency target:
* Max DOM nodes touched per update:
* Memory delta for an open MarkStudio tab:
* Bundle size delta:

Record measured numbers when shipped:

* Measured keystroke-to-preview latency:
* Measured bundle size delta:

---

## 6. Compliance Check

Confirm the feature does not violate any non-negotiable rule from [PROJECT_SPEC.md](../PROJECT_SPEC.md):

* [ ] Uses Custom Editor API
* [ ] Uses CodeMirror 6
* [ ] Uses markdown-it
* [ ] No UI framework introduced
* [ ] No CSS framework introduced
* [ ] No hardcoded colors / fonts
* [ ] Webview not recreated
* [ ] CodeMirror not recreated
* [ ] Preview patches DOM (no full re-render)

Any "no" requires an ADR.

---

## 7. Test Strategy

* **Unit tests:** *(list files / cases)*
* **Integration tests:** *(Custom Editor lifecycle, message bus, persistence)*
* **Manual verification matrix:**
  * [ ] Dark theme
  * [ ] Light theme
  * [ ] High-contrast theme
  * [ ] Keyboard-only operation
  * [ ] Webview persists across tab switch
  * [ ] CodeMirror state persists across tab switch
  * [ ] Cursor + scroll preserved across tab switch
  * [ ] Behavior on a large file (≥ 1 MB)
  * [ ] Behavior with the file modified externally
  * [ ] Behavior with VS Code autosave on
  * [ ] No new console errors in webview
  * [ ] No new errors in extension host

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
|      |            |        |            |

---

## 9. Rollout

* **Behind a configuration flag?** Yes / No (key + default)
* **Migration of existing user state?** Yes / No (describe)
* **Backwards compatibility concerns:**

---

## 10. Definition of Done

The feature is done only when:

* [ ] Code implemented and compiles with strict TypeScript
* [ ] All tests pass
* [ ] Manual verification matrix in Section 7 complete
* [ ] Performance numbers measured and recorded in Section 5
* [ ] docs/FEATURES.md updated with a user-facing description
* [ ] docs/CHANGELOG.md updated
* [ ] docs/ARCHITECTURE.md updated if structure changed
* [ ] docs/DECISIONS.md has any required ADRs
* [ ] docs/PROJECT_STATUS.md updated
* [ ] docs/TODO.md updated
* [ ] docs/AGENT_HANDOFF.md rewritten
* [ ] This document marked **Shipped** with the ship date in Section 1

---

## 11. Follow-Ups

Anything intentionally deferred.

*
*

Each follow-up has a corresponding entry in docs/TODO.md.
