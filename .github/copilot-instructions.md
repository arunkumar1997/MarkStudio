# GitHub Copilot Instructions - MarkStudio

## Project

MarkStudio is a native Markdown editor for Visual Studio Code.

The goal is to provide an Obsidian-inspired editing experience while looking and behaving like a first-party VS Code editor.

Do not build a web application inside VS Code.

Always prefer native VS Code APIs and UX patterns.

---

# Before Starting Any Task

Always read the following files before implementing any feature:

1. .ai/START_HERE.md
2. .ai/PROJECT_SPEC.md
3. .ai/CONTEXT.md
4. .ai/WORKFLOW.md
5. docs/PROJECT_STATUS.md
6. docs/AGENT_HANDOFF.md
7. docs/ARCHITECTURE.md
8. docs/TODO.md

Never assume previous chat history exists.

Documentation is the project's source of truth.

---

# Technology Stack

Language

- TypeScript

UI

- Vanilla HTML
- Vanilla CSS
- Vanilla TypeScript

Editor

- CodeMirror 6

Markdown

- markdown-it

Icons

- VS Code Codicons

---

# Required VS Code APIs

Prefer these APIs whenever possible:

- Custom Editor API
- Webview
- Commands
- Workspace API
- FileSystem API
- Theme API
- Context Keys
- Memento API
- Configuration API

---

# Architecture Rules

Always:

- Use the Custom Editor API.
- Keep a single persistent webview.
- Use `retainContextWhenHidden`.
- Communicate using `postMessage()`.
- Preserve editor state.
- Keep components modular.
- Use strong typing.
- Follow the Single Responsibility Principle.

Never:

- Replace `webview.html` after initialization.
- Reload the webview unnecessarily.
- Recreate CodeMirror unless required.

---

# UI Rules

The UI should look like VS Code.

Use:

- VS Code Theme Variables
- VS Code fonts
- VS Code spacing
- VS Code Codicons

Do not imitate Obsidian's visual design.

Do not introduce custom design systems.

---

# Forbidden Technologies

Never introduce:

- React
- Vue
- Angular
- Svelte
- Tailwind CSS
- Material UI
- Bootstrap
- jQuery

Do not use a frontend framework unless explicitly approved.

---

# Code Style

Prefer:

- Small files
- Small functions
- Composition over inheritance
- Explicit typing
- Clear naming
- Modular architecture

Avoid:

- God classes
- Large utility files
- Global state
- Magic strings
- Deeply nested logic

---

# Performance

Performance is a feature.

Always prefer:

- Incremental updates
- Lazy loading
- Efficient DOM updates
- Minimal allocations

Avoid:

- Full rerenders
- Expensive DOM recreation
- Unnecessary event listeners

---

# Documentation

Whenever significant work is completed, update:

- docs/PROJECT_STATUS.md
- docs/AGENT_HANDOFF.md
- docs/TODO.md

If architecture changes:

- docs/DECISIONS.md
- docs/ARCHITECTURE.md

Never leave undocumented architectural changes.

---

# Development Workflow

Follow this sequence:

Research

↓

Design

↓

Architecture Review

↓

Implementation

↓

Testing

↓

Documentation

↓

Handoff

↓

Complete

Do not skip documentation.

---

# Project Philosophy

MarkStudio should always feel like a built-in VS Code feature.

When there is a choice between adding more UI and integrating better with VS Code, prefer VS Code integration.

Less UI is better.

Consistency is better than uniqueness.

Performance is a feature.

Native integration is more important than visual effects.

---

# If Unsure

When uncertain:

- Read the documentation.
- Preserve existing architecture.
- Ask for clarification rather than making major assumptions.
- Prefer consistency over cleverness.

Always optimize for maintainability and long-term evolution of the project.