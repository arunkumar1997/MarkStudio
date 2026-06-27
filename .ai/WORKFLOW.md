# WORKFLOW — Development Process

> The exact loop every contributor (human or AI) follows for every change in MarkStudio.

This process is mandatory. It is the only way the project can survive long-running, multi-agent development without losing coherence.

---

## 1. The Loop

```
        ┌────────────┐
        │  Research  │
        └─────┬──────┘
              ▼
        ┌────────────┐
        │   Design   │
        └─────┬──────┘
              ▼
   ┌──────────────────────┐
   │ Architecture Review  │
   └──────────┬───────────┘
              ▼
        ┌────────────┐
        │ Implement  │
        └─────┬──────┘
              ▼
        ┌────────────┐
        │    Test    │
        └─────┬──────┘
              ▼
        ┌────────────┐
        │  Document  │
        └─────┬──────┘
              ▼
        ┌────────────┐
        │  Handoff   │
        └─────┬──────┘
              ▼
        ┌────────────┐
        │  Complete  │
        └────────────┘
```

Skipping any stage is a process violation. Document the violation in docs/AGENT_HANDOFF.md if it ever happens.

---

## 2. Stage Details

### 2.1 Research

**Goal:** know what already exists before you write anything.

* Read [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md), [.ai/CONTEXT.md](CONTEXT.md), docs/ARCHITECTURE.md, docs/DECISIONS.md.
* Search the codebase for related code.
* Identify any existing patterns you must follow.
* Identify constraints from VS Code's Custom Editor API, CodeMirror 6, or markdown-it.

**Output:** a short list of findings, written into your working notes or the relevant prompt scratchpad.

### 2.2 Design

**Goal:** decide *how* before doing *what*.

* Sketch the data flow (extension host ↔ webview messages).
* List the files you will create or modify.
* List the public API surface (functions, types, commands) the change adds.
* Identify state that must be persisted via `vscode.setState()`.

**Output:** a short design note inside the matching prompt template from [.ai/PROMPTS/](PROMPTS/).

### 2.3 Architecture Review

**Goal:** make sure the design does not break the non-negotiable rules.

Check against:

* [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md) — Non-Negotiable Rules section
* [.ai/CONTEXT.md](CONTEXT.md) — Anti-Patterns We Refuse
* docs/ARCHITECTURE.md — current module boundaries
* docs/DECISIONS.md — prior ADRs

If your design conflicts with any of the above, you have two choices:

1. Redesign so it complies.
2. Write a new ADR (using [TEMPLATES/ADR.md](TEMPLATES/ADR.md)) proposing the change, and pause until it is accepted.

Never silently violate a rule.

### 2.4 Implement

**Goal:** write the smallest possible change that satisfies the design.

* Follow docs/CODING_GUIDELINES.md (strict TypeScript, small files, SRP).
* Do not add features beyond the design.
* Do not refactor unrelated code "while you're in there."
* Do not introduce dependencies without applying the **Dependency Policy** from [PROJECT_SPEC.md](PROJECT_SPEC.md) and recording the decision in docs/DECISIONS.md.

### 2.5 Test

**Goal:** prove it works and prove it does not regress.

* Add or update unit tests for new logic.
* Add an integration test when touching the Custom Editor lifecycle, message bus, or webview state.
* Manually verify against the **Performance Requirements** in [PROJECT_SPEC.md](PROJECT_SPEC.md):
  * Webview is not recreated on tab switch.
  * CodeMirror state is preserved.
  * Preview patches the DOM (use DevTools to confirm).
  * Cursor and scroll positions survive a tab switch.
* Verify in light theme, dark theme, and high contrast.

### 2.6 Document

**Goal:** leave the repo in a state where someone with no chat history can continue.

For every change, update *as needed*:

| File                       | When to update                                            |
| -------------------------- | --------------------------------------------------------- |
| docs/ARCHITECTURE.md       | Module boundaries, message bus, or data flow changed      |
| docs/DECISIONS.md          | A decision was made (use [TEMPLATES/ADR.md](TEMPLATES/ADR.md)) |
| docs/FEATURES.md           | A feature was added, removed, or its behavior changed     |
| docs/CHANGELOG.md          | Always, for every user-facing change                      |
| docs/PROJECT_STATUS.md     | Always (use [TEMPLATES/STATUS.md](TEMPLATES/STATUS.md))   |
| docs/TODO.md               | Always — remove done items, add follow-ups                |
| docs/AGENT_HANDOFF.md      | Always (use [TEMPLATES/HANDOFF.md](TEMPLATES/HANDOFF.md)) |
| docs/implementation/*.md   | When implementing a feature spec'd in design/             |
| docs/README.md             | When public-facing usage changed                          |

### 2.7 Handoff

**Goal:** the next agent can pick up in under five minutes.

Rewrite docs/AGENT_HANDOFF.md from scratch using [TEMPLATES/HANDOFF.md](TEMPLATES/HANDOFF.md). It must cover:

* What was completed in this session
* What is in progress and its current state
* What remains
* All files changed
* All assumptions made
* All technical debt introduced
* The single recommended next task

### 2.8 Complete

A change is **complete** only when **every** Definition of Done item from [START_HERE.md](START_HERE.md) Section 6 is satisfied.

---

## 3. Commit Discipline

Use the convention from [PROJECT_SPEC.md](PROJECT_SPEC.md):

```
feat:      new user-facing capability
fix:       bug fix
perf:      performance improvement, no behavior change
docs:      documentation only
refactor:  code change with no behavior change
style:     formatting only
test:      tests only
build:     build system, dependencies, tooling
chore:     anything else
```

Rules:

* One logical change per commit.
* Code change and its documentation update belong in the **same commit**.
* Never commit "fix typo" amendments to docs that you wrote in the previous commit — squash them.

---

## 4. When Things Go Wrong

| Situation                                           | Action                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| Spec is ambiguous                                   | Write your interpretation in docs/AGENT_HANDOFF.md and proceed conservatively |
| Spec contradicts itself                             | Stop. Open an ADR proposing the resolution                             |
| You broke a non-negotiable rule mid-implementation  | Revert. Redesign. Do not "fix it later"                                |
| A test is failing and you do not know why           | Document the failure in docs/AGENT_HANDOFF.md under **Blockers**; do not delete or skip the test |
| You introduced a dependency without an ADR          | Add the ADR retroactively in the same PR or revert the dependency      |
| You ran out of context mid-task                     | Write a complete handoff *now*; the next agent will continue           |

---

## 5. AI-Specific Guidance

* Never assume the previous agent's chat history is available — read the repo.
* Never invent file paths, APIs, or behaviors. If unsure, search or read first.
* Never silently change architecture. Write an ADR.
* Always update docs in the same change as the code.
* Always end a session with a handoff, even if the task is incomplete — especially if incomplete.

---

## 6. Quick Checklist Before Saying "Done"

* [ ] Code compiles with strict TypeScript
* [ ] All tests pass
* [ ] No new dependency without an ADR
* [ ] No hardcoded colors or fonts
* [ ] Webview is not recreated
* [ ] CodeMirror state preserved across tab switches
* [ ] Preview patches DOM, does not regenerate
* [ ] Verified in dark, light, and high-contrast themes
* [ ] docs/CHANGELOG.md updated
* [ ] docs/PROJECT_STATUS.md updated
* [ ] docs/TODO.md updated
* [ ] docs/AGENT_HANDOFF.md rewritten
* [ ] ADR added if a decision was made
