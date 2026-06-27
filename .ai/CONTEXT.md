# CONTEXT — Product Philosophy

> *Why* MarkStudio exists, *who* it is for, and the principles that decide every design call.

This document is the **philosophical compass** for the project. When [PROJECT_SPEC.md](PROJECT_SPEC.md) tells you *what* to build, this file tells you *how to think* while building it.

---

## 1. The One-Sentence Pitch

> MarkStudio is the Markdown editor VS Code should have shipped with — fast, native, keyboard-first, and beautiful by default.

---

## 2. Who It Is For

* Developers who already live in VS Code and do not want to context-switch into Obsidian or Typora for notes and docs.
* Technical writers maintaining Markdown-heavy repositories (READMEs, ADRs, docs sites).
* Knowledge workers who want an Obsidian-like editing feel but inside a tool they already trust.
* Power users who care about keyboard workflows, performance, and theme consistency.

It is **not** for:

* Users who want a full PKM/graph-database experience out of the box (that may come in Phase 4+).
* Users who want a rich WYSIWYG-only editor with no source mode.
* Users who want a standalone app — MarkStudio only exists inside VS Code.

---

## 3. Core Beliefs

These beliefs justify every architectural rule in [PROJECT_SPEC.md](PROJECT_SPEC.md).

### 3.1 Native beats custom

If VS Code already does something well (theming, settings, keybindings, file watching, autosave, search), we **use the VS Code API** instead of reinventing it. The extension should feel like it was written by the VS Code team.

### 3.2 The editor is sacred

CodeMirror 6 is the heart of the product. We treat it as a long-lived, never-recreated singleton. We do not flush its state, we do not rebuild it on tab switches, and we do not wrap it in abstractions that hide its API.

### 3.3 The preview is incremental, not generated

Markdown preview is **patched**, not regenerated. Re-rendering the whole DOM on every keystroke is the single most common mistake in Markdown extensions. We refuse to make it.

### 3.4 Performance is a feature

Latency is the difference between "feels native" and "feels like an extension." Every change is evaluated against:

* Time-to-first-paint for a 1 MB Markdown file
* Keystroke-to-preview latency
* Memory footprint with 10+ open MarkStudio tabs
* Scroll smoothness

If a feature regresses any of these, it is not done.

### 3.5 Themes are not ours to design

We never pick colors. We consume `--vscode-*` CSS variables. The user's chosen theme — light, dark, high-contrast, or any third-party theme — must look correct without any work from us.

### 3.6 Keyboard first, mouse optional

Every action must be reachable from the keyboard. The toolbar is a convenience, not the primary surface. Default keybindings respect VS Code conventions; custom ones are opt-in via the command palette.

### 3.7 Documentation is code

A change is not done until the docs describe it. An AI agent reading the repo six months from now must be able to reconstruct *why* a decision was made, not just *what* the code does.

---

## 4. Design Principles

When two implementation options are both technically correct, prefer the one that:

1. **Uses more of VS Code's existing API** and less of our own code.
2. **Preserves more state** across tab switches, reloads, and theme changes.
3. **Patches the DOM** instead of replacing it.
4. **Reads from theme variables** instead of computed styles or hardcoded values.
5. **Is smaller** — fewer dependencies, fewer files, fewer abstractions.
6. **Is testable** in isolation.
7. **Degrades gracefully** when a feature (e.g., math, mermaid) is not yet implemented.

---

## 5. Anti-Patterns We Refuse

These are decided. Do not re-debate them. If you think you need one of these, write an ADR in docs/DECISIONS.md first and get the decision recorded.

* A UI framework (React, Vue, Svelte, Angular, Lit, etc.)
* A CSS framework (Tailwind, Bootstrap, Bulma, etc.)
* A custom title bar, custom tab bar, or any chrome that mimics VS Code itself
* Reassigning `webview.html` after the webview is initialized
* Recreating the webview on tab switch
* Hardcoded colors, fonts, or sizes
* A custom autosave implementation (use VS Code's)
* A custom file watcher when `workspace.createFileSystemWatcher` will do
* Wrapping CodeMirror in a heavy abstraction layer
* Re-rendering the full preview on every keystroke
* Synchronous, blocking work on the extension host main thread

---

## 6. Aesthetic Bar

MarkStudio should look like a first-party VS Code feature. That means:

* Typography matches the active VS Code editor font.
* Spacing matches the density of the surrounding VS Code UI.
* Icons come from VS Code Codicons — no custom icon sets.
* Animations are subtle, fast, and respect `prefers-reduced-motion`.
* The split divider, scrollbars, focus rings, and selection colors all come from theme variables.

If a screenshot of MarkStudio next to a screenshot of the built-in VS Code editor causes a user to ask "which one is which?", we have succeeded.

---

## 7. Roadmap Philosophy

The phased roadmap in [PROJECT_SPEC.md](PROJECT_SPEC.md) is intentional:

* **Phase 1–2** establish a rock-solid editing core. Nothing flashy.
* **Phase 3** adds the syntax extensions that make Markdown feel modern (math, mermaid, callouts).
* **Phase 4+** adds the knowledge-management features (backlinks, graph view) — and only after the core is unshakeable.

Do not pull features forward across phases. A weak Phase 1 poisons every later phase.

---

## 8. How to Use This Document

* When proposing a feature, justify it against Section 3 (Core Beliefs).
* When choosing between two implementations, apply Section 4 (Design Principles).
* When tempted by something in Section 5 (Anti-Patterns), stop and open an ADR instead.
* When designing UI, re-read Section 6 (Aesthetic Bar).

If a decision in this document is ever overturned, update this file in the **same commit** as the ADR that overturns it.
