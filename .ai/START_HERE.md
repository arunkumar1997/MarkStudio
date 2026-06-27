# START HERE

> Entry point for every AI agent and developer joining the MarkStudio project.

If you are an AI agent or a new contributor, read this file **first**, end to end, before touching any code.

---

## 1. What is MarkStudio?

MarkStudio is a Visual Studio Code extension that provides a **native, Obsidian-inspired Markdown editing experience** inside VS Code.

It is **not** an Obsidian clone. It is the best Markdown editor that can exist *inside* VS Code, built on top of:

* The **Custom Editor API**
* **CodeMirror 6** for editing
* **markdown-it** for preview rendering
* **Vanilla TypeScript, HTML, CSS** (no UI frameworks)
* **VS Code theme variables** (never hardcoded colors)

The complete product vision lives in [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md). That document is the **single source of truth** for *what* we are building and *why*.

---

## 2. Mandatory Reading Order

Before you write a single line of code, read these files in order:

1. [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md) — Master vision and non-negotiable rules
2. [.ai/CONTEXT.md](CONTEXT.md) — Product philosophy and design principles
3. [.ai/WORKFLOW.md](WORKFLOW.md) — How we work: research → design → implement → document
4. docs/PROJECT_STATUS.md — Where the project is *right now*
5. docs/AGENT_HANDOFF.md — What the previous agent did and what to do next
6. docs/TODO.md — Prioritized backlog
7. docs/ARCHITECTURE.md — How the system is structured

If any of these files do not yet exist, your **first job** is to create them from the templates in [.ai/TEMPLATES/](TEMPLATES/) before implementing features.

---

## 3. The Core Rules (Non-Negotiable)

You **must** follow these. They come directly from [PROJECT_SPEC.md](PROJECT_SPEC.md):

### Always

* Use the **Custom Editor API** (never a plain WebviewPanel editor)
* Use **CodeMirror 6** for editing
* Use **markdown-it** for preview
* Use **vanilla** TypeScript, HTML, and CSS
* Use **VS Code theme variables** for all styling
* Use **incremental rendering** for preview updates
* Preserve webview state — only one persistent webview
* Keep documentation updated in the same change as the code

### Never

* Use React, Vue, Angular, Svelte, or any UI framework
* Use Tailwind, Material UI, Bootstrap, or any CSS framework
* Reassign `webview.html` after initialization
* Recreate the webview when switching tabs
* Hardcode theme colors
* Build a fake VS Code interface
* Skip documentation

---

## 4. How to Pick Your Task

1. Open docs/AGENT_HANDOFF.md — start with the **Recommended Next Task**.
2. If no handoff exists, open docs/TODO.md and pick the highest-priority unblocked task.
3. If neither exists, your task is to **bootstrap the documentation** using [.ai/TEMPLATES/](TEMPLATES/).

Never invent work that is not in the roadmap, TODO, or handoff.

---

## 5. How to Execute a Task

Use the right prompt from [.ai/PROMPTS/](PROMPTS/) as your working framework:

| Task type            | Prompt                                                       |
| -------------------- | ------------------------------------------------------------ |
| New feature          | [PROMPTS/feature.md](PROMPTS/feature.md)                     |
| Bug fix              | [PROMPTS/bugfix.md](PROMPTS/bugfix.md)                       |
| Refactor             | [PROMPTS/refactor.md](PROMPTS/refactor.md)                   |
| Architectural change | [PROMPTS/architecture.md](PROMPTS/architecture.md)           |
| Code review          | [PROMPTS/review.md](PROMPTS/review.md)                       |

The general loop is defined in [.ai/WORKFLOW.md](WORKFLOW.md):

```
Research → Design → Architecture Review → Implement → Test → Document → Update Handoff → Complete
```

Never skip documentation. It is part of the implementation.

---

## 6. Definition of Done

A task is complete only when **all** of the following are true:

* Code is implemented and compiles
* Tests pass
* docs/ARCHITECTURE.md is updated if architecture changed
* docs/DECISIONS.md has a new ADR if a decision was made (use [TEMPLATES/ADR.md](TEMPLATES/ADR.md))
* docs/CHANGELOG.md is updated
* docs/PROJECT_STATUS.md is updated
* docs/TODO.md is updated (done items removed, new items added)
* docs/AGENT_HANDOFF.md is rewritten for the next agent (use [TEMPLATES/HANDOFF.md](TEMPLATES/HANDOFF.md))
* No undocumented changes remain

---

## 7. When You Are Unsure

* Check [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md) first.
* Then check [.ai/CONTEXT.md](CONTEXT.md) for philosophy.
* Then check docs/DECISIONS.md for prior ADRs.
* If the answer is still unclear, **write down your assumption** in docs/AGENT_HANDOFF.md and proceed with the most conservative option that does not violate the non-negotiable rules.

Never rely on previous chat history. The repository documentation is the only memory that persists.

---

## 8. Quick Links

* Vision: [.ai/PROJECT_SPEC.md](PROJECT_SPEC.md)
* Philosophy: [.ai/CONTEXT.md](CONTEXT.md)
* Workflow: [.ai/WORKFLOW.md](WORKFLOW.md)
* Prompts: [.ai/PROMPTS/](PROMPTS/)
* Templates: [.ai/TEMPLATES/](TEMPLATES/)
