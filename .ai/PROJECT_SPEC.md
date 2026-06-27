# MarkStudio - VS Code Markdown Editor Extension

> A native, Obsidian-inspired Markdown editor for Visual Studio Code.

---

# Project Objective

Build **MarkStudio**, a production-quality Visual Studio Code extension that provides an Obsidian-like Markdown editing experience while feeling completely native to VS Code.

MarkStudio is **not** intended to clone Obsidian. Instead, it should become the best Markdown editing experience inside VS Code by embracing VS Code's native APIs, theming, UX patterns, and extension architecture.

The project must be engineered for **long-running AI-assisted development**, where multiple AI agents and developers can contribute over time without requiring previous conversation history.

The repository documentation is the **single source of truth**.

---

# Product Vision

MarkStudio should feel like a built-in VS Code editor.

Users should forget they are using an extension.

The editor should prioritize:

* Native VS Code appearance
* Excellent Markdown editing
* Fast live preview
* Keyboard-first workflow
* High performance
* Minimal UI
* Extensibility
* Large file support

Take inspiration from:

* Obsidian
* VS Code
* GitHub Markdown
* Typora

without copying their UI.

---

# Core Technologies

## Language

* TypeScript

## Editor

* CodeMirror 6

## Markdown Renderer

* markdown-it

## UI

* Vanilla HTML
* Vanilla CSS
* Vanilla TypeScript

## Icons

* VS Code Codicons

## Styling

Use VS Code Theme Variables.

Example:

```css
--vscode-editor-background
--vscode-editor-foreground
--vscode-editor-font-family
--vscode-editor-font-size
```

---

# Architecture

Use the **Custom Editor API**.

Do **not** build a normal WebviewPanel editor.

Architecture should include:

* CustomEditorProvider
* CustomDocument
* Message Bus
* File Watcher
* Undo/Redo
* Dirty State
* Save/Revert
* State Persistence

---

# Webview Rules

Create only one persistent webview.

Always enable:

```ts
retainContextWhenHidden: true
enableScripts: true
```

Never recreate the webview while switching tabs.

Never replace:

```ts
webview.html
```

after initialization.

Use:

```ts
postMessage()
```

for all communication.

---

# UI Layout

```
+------------------------------------------------------+
| Toolbar                                              |
+--------------------------+---------------------------+
|                          |                           |
| Markdown Editor          | Live Preview             |
|                          |                           |
|                          |                           |
+--------------------------+---------------------------+
```

Support:

* Split View
* Editor Only
* Preview Only

Remember split size.

---

# Editor

Use CodeMirror 6.

Support:

* Syntax Highlighting
* Tables
* Checkboxes
* Lists
* Headings
* Blockquotes
* Code Blocks
* Search
* Replace
* Undo/Redo
* Multiple Cursors

Future:

* Wiki Links
* Mermaid
* Math
* Callouts
* Backlinks

---

# Preview

Use markdown-it.

Requirements:

* Incremental rendering
* Do not rerender the entire preview
* Patch only modified DOM
* Scroll synchronization

Support:

* GitHub Flavored Markdown
* Images
* Tables
* Syntax Highlighting
* Footnotes

---

# Theme

Never hardcode colors.

Always use VS Code theme variables.

Automatically support:

* Dark Theme
* Light Theme
* High Contrast

---

# Toolbar

Use VS Code Codicons.

Include:

* Toggle Preview
* Split View
* Source Only
* Preview Only
* Word Wrap
* Search
* Outline

---

# Performance Requirements

* Never recreate CodeMirror
* Never recreate Preview DOM
* Never recreate Webview
* Support large Markdown files
* Minimize DOM updates
* Debounce expensive rendering
* Preserve editor state

---

# State Persistence

Persist:

* Cursor Position
* Scroll Position
* Split Ratio
* Preview Visibility
* Folded Sections

Use:

```ts
vscode.setState()
vscode.getState()
```

---

# Accessibility

Support:

* Keyboard Navigation
* Focus Indicators
* Screen Readers
* High Contrast Mode

---

# File Changes

If the file changes externally:

* Detect changes
* Update editor
* Preserve cursor whenever possible

---

# Autosave

Respect VS Code autosave settings.

Do not implement custom autosave.

---

# Commands

Implement:

* Open MarkStudio
* Toggle Preview
* Toggle Split View
* Focus Editor
* Focus Preview

Future:

* Export HTML
* Export PDF

---

# Coding Guidelines

* Strict TypeScript
* Modular architecture
* Small files
* Single Responsibility Principle
* Composition over inheritance
* Strong typing
* Public API documentation

---

# Dependency Policy

Before adding any dependency, answer:

* Why is it needed?
* Is it maintained?
* Can VS Code already do this?
* Can it be implemented simply?
* What is the bundle size impact?

Document every dependency decision.

---

# Project Structure

```
MarkStudio/
│
├── .ai/                          # Authoritative source: vision, philosophy, workflow
│   ├── START_HERE.md
│   ├── PROJECT_SPEC.md
│   ├── CONTEXT.md
│   ├── WORKFLOW.md
│   ├── TEMPLATES/
│   └── PROMPTS/
│
├── .github/
│   ├── copilot-instructions.md
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── docs/
│   ├── README.md
│   ├── PROJECT_STATUS.md
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── FEATURES.md
│   ├── TODO.md
│   ├── CHANGELOG.md
│   ├── AGENT_HANDOFF.md
│   ├── BRANDING.md
│   ├── CODING_GUIDELINES.md
│   ├── CONTRIBUTING.md
│   ├── TESTING.md
│   ├── RELEASE.md
│   │
│   ├── design/
│   ├── api/
│   ├── implementation/
│   ├── research/
│   └── screenshots/
│
├── src/
├── media/
├── test/
└── package.json
```

---

# Documentation First

Before implementing any feature:

1. Read documentation.
2. Update design if necessary.
3. Implement.
4. Test.
5. Update documentation.
6. Update handoff.

Documentation is part of the implementation.

---

# Required Documentation

Maintain:

* README.md
* PROJECT_STATUS.md
* ROADMAP.md
* ARCHITECTURE.md
* DECISIONS.md
* FEATURES.md
* TODO.md
* CHANGELOG.md
* AGENT_HANDOFF.md
* BRANDING.md

---

# PROJECT_STATUS.md

Must contain:

* Current milestone
* Overall completion
* Current work
* Completed features
* Blockers
* Known issues
* Next recommended task

---

# AGENT_HANDOFF.md

Every coding session must update:

* What was completed
* Current work
* Remaining work
* Files changed
* Assumptions
* Technical debt
* Recommended next task

A new AI agent should be able to continue immediately after reading this file.

---

# DECISIONS.md

Every architectural decision must include:

* Date
* Decision
* Alternatives
* Reasoning
* Consequences

---

# TODO.md

Organize by priority:

* High
* Medium
* Low
* Nice to Have

Each task should include:

* Description
* Files involved
* Dependencies
* Complexity

---

# Development Workflow

Every feature should follow:

```
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
Update Handoff
    ↓
Complete
```

Never skip documentation.

---

# AI Development Rules

Always begin by reading:

* PROJECT_STATUS.md
* AGENT_HANDOFF.md
* TODO.md
* ARCHITECTURE.md

Never rely on previous chat history.

If documentation is outdated, update it before writing code.

Document assumptions.

Document unfinished work.

Document architectural changes.

---

# Git Commit Convention

Use:

```
feat:
fix:
perf:
docs:
refactor:
style:
test:
build:
chore:
```

Examples:

```
feat: implement split markdown editor

fix: preserve scroll position on file reload

perf: optimize preview rendering

docs: update architecture after adding message bus
```

---

# Definition of Done

A task is complete only when:

* Code implemented
* Project builds
* Tests pass
* Documentation updated
* CHANGELOG updated
* PROJECT_STATUS updated
* TODO updated
* AGENT_HANDOFF updated
* No undocumented changes remain

---

# Long-Term Roadmap

## Phase 1

* Native Markdown Editor
* Split View
* Live Preview

## Phase 2

* Scroll Synchronization
* Outline
* Search
* Word Count

## Phase 3

* Mermaid
* Callouts
* Math
* Wiki Links
* Footnotes

## Phase 4

* Backlinks
* Hover Preview
* Embedded Notes
* Graph View

## Phase 5

* Templates
* Snippets
* Daily Notes
* Workspace Features

## Phase 6

* Plugin API
* Theme API
* Custom Markdown Extensions
* Third-party Integrations

---

# Non-Negotiable Rules

## Always

* Use Custom Editor API
* Use CodeMirror 6
* Use markdown-it
* Use Vanilla TypeScript
* Use Vanilla HTML/CSS
* Use VS Code Theme Variables
* Use incremental rendering
* Preserve Webview State
* Prioritize performance
* Keep documentation updated

## Never

* Use React
* Use Vue
* Use Angular
* Use Svelte
* Use Tailwind
* Use Material UI
* Use Bootstrap
* Reassign `webview.html`
* Reload the webview unnecessarily
* Hardcode theme colors
* Build a fake VS Code interface

---

# Success Criteria

At any point in the project, another AI agent or developer should be able to:

1. Clone the repository.
2. Read the documentation under `/docs`.
3. Understand the architecture.
4. Continue development confidently.
5. Make architectural decisions consistently.
6. Contribute without requiring previous chat history.

If this is possible, the project documentation is considered successful.
