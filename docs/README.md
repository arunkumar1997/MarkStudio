# MarkStudio Documentation

> The single source of truth for MarkStudio — a native, Obsidian-inspired Markdown editor for Visual Studio Code.

This `docs/` directory is the durable memory of the project. Any developer or AI agent should be able to read these files — with **no prior chat history** — and continue development confidently.

If you are arriving for the first time, read [.ai/START_HERE.md](../.ai/START_HERE.md) first, then return here.

---

## What is MarkStudio?

MarkStudio is a VS Code extension that delivers a fast, keyboard-first Markdown editing experience that feels like a **first-party VS Code feature**. It is built on the **Custom Editor API**, uses **CodeMirror 6** for editing and **markdown-it** for preview, and is written in **vanilla TypeScript, HTML, and CSS** with **VS Code theme variables** for all styling.

It is *not* an Obsidian clone and *not* a web app embedded in a webview. The complete product vision lives in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md).

---

## How the Documentation Is Organized

### Authoritative source (`.ai/`)

These files define *what* we build and *how we think*. They change rarely and deliberately.

| File | Purpose |
| ---- | ------- |
| [.ai/START_HERE.md](../.ai/START_HERE.md) | Entry point and mandatory reading order |
| [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) | Master vision and non-negotiable rules |
| [.ai/CONTEXT.md](../.ai/CONTEXT.md) | Product philosophy and design principles |
| [.ai/WORKFLOW.md](../.ai/WORKFLOW.md) | The research → design → implement → document loop |
| [.ai/TEMPLATES/](../.ai/TEMPLATES/) | Templates for status, handoff, features, ADRs |
| [.ai/PROMPTS/](../.ai/PROMPTS/) | Working frameworks per task type |

### Living project record (`docs/`)

These files are updated continuously as the project evolves.

| File | Purpose | Update cadence |
| ---- | ------- | -------------- |
| [PROJECT_STATUS.md](PROJECT_STATUS.md) | Where the project is right now | Every session |
| [AGENT_HANDOFF.md](AGENT_HANDOFF.md) | What the last agent did and what to do next | Every session |
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the system is structured | When structure changes |
| [DECISIONS.md](DECISIONS.md) | Architecture Decision Records (ADRs) | When a decision is made |
| [ROADMAP.md](ROADMAP.md) | Phased milestones | When scope shifts |
| [FEATURES.md](FEATURES.md) | Planned and future feature catalogue | When a feature changes |
| [TODO.md](TODO.md) | Prioritized backlog | Every session |
| [CHANGELOG.md](CHANGELOG.md) | User-facing change history | Every user-facing change |
| [CODING_GUIDELINES.md](CODING_GUIDELINES.md) | Code standards | When standards evolve |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute | Rarely |
| [TESTING.md](TESTING.md) | Test strategy and how to run tests | When test approach changes |
| [RELEASE.md](RELEASE.md) | Release and publishing process | When release process changes |

### Working subdirectories

| Directory | Purpose |
| --------- | ------- |
| [design/](design/) | Design notes and data-flow sketches produced before implementation |
| [implementation/](implementation/) | Durable per-feature records (built from [.ai/TEMPLATES/FEATURE.md](../.ai/TEMPLATES/FEATURE.md)) |
| [api/](api/) | Internal API surface: message-bus contracts, public types, commands |
| [research/](research/) | Investigations into VS Code, CodeMirror 6, markdown-it before committing to an approach |
| [screenshots/](screenshots/) | Visual references for features and documentation |

---

## Reading Order for a New Contributor

1. [.ai/START_HERE.md](../.ai/START_HERE.md)
2. [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md)
3. [.ai/CONTEXT.md](../.ai/CONTEXT.md)
4. [PROJECT_STATUS.md](PROJECT_STATUS.md)
5. [AGENT_HANDOFF.md](AGENT_HANDOFF.md)
6. [TODO.md](TODO.md)
7. [ARCHITECTURE.md](ARCHITECTURE.md)

---

## The Golden Rules

The full list lives in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md). The essentials:

- **Always**: Custom Editor API, CodeMirror 6, markdown-it, vanilla TS/HTML/CSS, theme variables, incremental preview, one persistent webview per open editor (a single shell hosting both panes, retained when hidden), documentation updated alongside code.
- **Never**: a UI/CSS framework, reassigning `webview.html` after init, recreating the webview on tab switch, hardcoded colors, a fake VS Code chrome, skipping documentation.

---

## Project Status at a Glance

MarkStudio is in the **Initialization phase**. No extension code exists yet; the documentation foundation is being established so that implementation can begin from a consistent, well-understood baseline. See [PROJECT_STATUS.md](PROJECT_STATUS.md) for the current snapshot and [TODO.md](TODO.md) for the Phase 1 backlog.
