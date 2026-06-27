# CONTRIBUTING

> How to contribute to MarkStudio — whether you are a human developer or an AI agent. The process is mandatory and exists so the project survives long-running, multi-contributor development without losing coherence.

---

## 1. Before You Touch Anything

Read, in order:

1. [.ai/START_HERE.md](../.ai/START_HERE.md)
2. [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — the non-negotiable rules
3. [.ai/CONTEXT.md](../.ai/CONTEXT.md) — the philosophy
4. [PROJECT_STATUS.md](PROJECT_STATUS.md) — where the project is now
5. [AGENT_HANDOFF.md](AGENT_HANDOFF.md) — what to do next
6. [TODO.md](TODO.md) — the backlog
7. [ARCHITECTURE.md](ARCHITECTURE.md) — how the system is structured

**Never rely on previous chat history.** The repository documentation is the only memory that persists.

---

## 2. Pick a Task

1. Start with the **Recommended Next Task** in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10.
2. If none, take the highest-priority unblocked item in [TODO.md](TODO.md).
3. Do **not** invent work that is not in the roadmap, TODO, or handoff.

---

## 3. Follow the Loop

Every change follows the loop in [.ai/WORKFLOW.md](../.ai/WORKFLOW.md):

```
Research → Design → Architecture Review → Implement → Test → Document → Handoff → Complete
```

* Use the matching prompt from [.ai/PROMPTS/](../.ai/PROMPTS/) (feature / bugfix / refactor / architecture / review).
* For non-trivial features, write a design note in [design/](design/) and a durable record in [implementation/](implementation/) using [.ai/TEMPLATES/FEATURE.md](../.ai/TEMPLATES/FEATURE.md).
* For any architectural decision, add an ADR to [DECISIONS.md](DECISIONS.md) using [.ai/TEMPLATES/ADR.md](../.ai/TEMPLATES/ADR.md) **before** implementing.

Skipping a stage is a process violation; if it happens, record it in [AGENT_HANDOFF.md](AGENT_HANDOFF.md).

---

## 4. Respect the Non-Negotiables

The full list is in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md). The essentials:

* **Always:** Custom Editor API · CodeMirror 6 · markdown-it · vanilla TS/HTML/CSS · `--vscode-*` theme variables · incremental preview · one persistent webview per editor (a single shell hosting both panes, retained) · documentation updated with the code.
* **Never:** a UI/CSS framework · reassigning `webview.html` after init · recreating the webview/editor/preview · hardcoded colors or fonts · a fake VS Code chrome · skipping documentation.

If your change needs to bend a rule, stop and open an ADR.

---

## 5. Code Standards

Follow [CODING_GUIDELINES.md](CODING_GUIDELINES.md): strict TypeScript, small single-responsibility files, composition over inheritance, explicit typing, no magic strings, no global mutable state, and the Dependency Policy for any new dependency.

---

## 6. Commits

Use the Conventional Commits prefixes from [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) §3:

```
feat:  fix:  perf:  docs:  refactor:  style:  test:  build:  chore:
```

Rules: one logical change per commit; code and its documentation update in the **same commit**; no unrelated refactors bundled in.

Examples:

```
feat: add split view with remembered ratio
fix: preserve scroll position on external file change
perf: patch preview DOM instead of full re-render
docs: record ADR-0007 for math rendering approach
```

---

## 7. Pull Requests

A PR is ready for review when:

* It maps to a task in [TODO.md](TODO.md) or [AGENT_HANDOFF.md](AGENT_HANDOFF.md).
* The build and tests pass (see [TESTING.md](TESTING.md)).
* All relevant `docs/` files are updated in the same PR (`CHANGELOG`, `PROJECT_STATUS`, `TODO`, `AGENT_HANDOFF`, plus `ARCHITECTURE`/`DECISIONS`/`FEATURES` if applicable).
* It introduces no new dependency without an ADR.
* It introduces no hardcoded colors/fonts and does not recreate the webview/editor/preview.

PR description should link the task ID, summarize the change, and note any assumptions or technical debt (mirroring the handoff).

---

## 8. Definition of Done

A contribution is complete only when it satisfies the Definition of Done in [.ai/START_HERE.md](../.ai/START_HERE.md) §6: code compiles under strict TypeScript, tests pass, architecture/decisions/changelog/status/TODO docs are updated, the handoff is rewritten for the next contributor, and no undocumented changes remain.

---

## 9. When You Are Unsure

* Check [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md), then [.ai/CONTEXT.md](../.ai/CONTEXT.md), then [DECISIONS.md](DECISIONS.md).
* If still unclear, write down your assumption in [AGENT_HANDOFF.md](AGENT_HANDOFF.md) and proceed with the most conservative option that does not violate a non-negotiable rule.
* Prefer consistency over cleverness.
