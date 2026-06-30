# ROADMAP

> The phased plan for MarkStudio. Phases are intentionally sequenced: a rock-solid editing core first, modern syntax next, knowledge-management features last. **Do not pull features forward across phases** — a weak early phase poisons every later one ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §7).
>
> The canonical phase list is in [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md). This document adds milestones, exit criteria, and status. Feature detail lives in [FEATURES.md](FEATURES.md); the active backlog lives in [TODO.md](TODO.md).

---

## Status Legend

`Done` · `In progress` · `Next` · `Planned`

---

## Phase 0 — Initialization · *Done*

Establish the project's foundation before any feature work.

**Milestones**
* M0.1 — `.ai/` guidance authored *(Done — pre-existing)*
* M0.2 — `docs/` single source of truth established and consistency-reviewed *(Done)*
* M0.3 — Extension scaffolding: manifest, TypeScript, bundler, Custom Editor registration *(Done — T-101, T-102, T-103)*

**Exit criteria**
* Documentation is complete and internally consistent. *(Met)*
* `npm install` and `npm run build` succeed. *(Met — T-101)*
* Opening a `.md` file can offer MarkStudio as an editor. *(Met — registered via `customEditors`, available through "Reopen Editor With…")*

---

## Phase 1 — Editing Core · *In progress*

A native Markdown editor with split view and live preview. Nothing flashy — just unshakeable.

**Milestones**
* M1.1 — Custom editor opens `.md` in a persistent webview (one per editor instance, retained when hidden) *(Done — T-101…T-104)*
* M1.2 — CodeMirror 6 source editor with Markdown syntax highlighting, lists, headings, blockquotes, code blocks, tables, checkboxes *(Done — T-104)*
* M1.3 — markdown-it live preview with **incremental** DOM patching *(Done — T-105)*
* M1.4 — Split / Editor-only / Preview-only layout modes with remembered split ratio *(Done — T-106)*
* M1.5 — Document lifecycle: dirty state, save/revert, undo/redo, hot-exit *(Done for edit path — T-102, T-104; hot-exit verification outstanding)*
* M1.6 — State persistence: cursor, scroll, split ratio, preview visibility
* M1.7 — Core commands: Open MarkStudio, Toggle Preview, Toggle Split, Focus Editor, Focus Preview

**Exit criteria**
* Webview is never recreated on tab switch; CodeMirror state preserved.
* Preview patches the DOM (verified in DevTools); no full re-render on keystroke.
* Verified in dark, light, and high-contrast themes.
* Smooth on a ≥ 1 MB Markdown file.

---

## Phase 2 — Editing Quality · *Done*

Make the core comfortable for daily, long-form writing.

**Milestones**
* M2.1 — Scroll synchronization between editor and preview *(Done — T-2.1, delivered early during Phase 1)*
* M2.2 — Document outline (headings) with navigation *(Done — T-2.2, ADR-0014)*
* M2.3 — In-editor search and replace *(Done — T-2.3)*
* M2.4 — Word count and reading-time indicator *(Done — T-2.4)*
* M2.5 — Word wrap toggle and multiple cursors *(Done — T-2.5)*

**Exit criteria**
* Scroll sync feels natural in both directions without jitter. *(Met — T-2.1)*
* Outline updates incrementally as headings change. *(Met — T-2.2; rebuilt on edits, debounced)*

---

## Phase 3 — Modern Markdown · *Done*

The syntax extensions that make Markdown feel modern. Each attaches as a CodeMirror 6 extension and/or markdown-it plugin and **degrades gracefully** when disabled.

**Milestones**
* M3.1 — Math rendering (inline and block) *(Done — T-3.1, ADR-0015)*
* M3.2 — Mermaid diagrams *(Done — T-3.2, ADR-0016)*
* M3.3 — Callouts / admonitions *(Done — T-3.3, ADR-0017)*
* M3.4 — Wiki-style links (`[[...]]`) *(Done — T-3.4, ADR-0018)*
* M3.5 — Footnotes and GFM completeness (tables, task lists, strikethrough) *(Done — T-3.5, ADR-0019)*

**Exit criteria**
* Every feature is individually toggleable via configuration. *(Met — each Phase 3 feature has its own `markstudio.preview.*` setting)*
* Disabling a feature never breaks rendering or the editor. *(Met — every feature degrades to literal/plain rendering when off; verified by the integration suite)*

---

## Phase 4 — Knowledge Management · *In progress*

Begin the PKM layer — only after the core is unshakeable.

**Milestones**
* M4.1 — Backlinks panel *(Done — T-4.1; native `MarkStudio Backlinks` tree view over a host-side, async, watcher-backed link index; lands the wiki-link resolver deferred from Phase 3, ADR-0020)*
  * T-4.1b — In-preview wiki-link navigation *(Done; clicking `[[note]]` in the preview opens the target via the shared M4.1 resolver, ADR-0021)*
* M4.2 — Hover preview for links *(Done — M4.2; hovering `[[note]]` / `[[note#heading]]` in the preview shows a floating card previewing the target — the host ships a capped Markdown excerpt, the webview renders it with the existing renderer, reusing the shared M4.1 resolver + heading scanner, ADR-0022)*
* M4.3 — Embedded notes / transclusion
* M4.4 — Graph view

**Exit criteria**
* Link indexing scales to a large workspace without blocking the UI. *(On track — the initial scan is async/batched and kicked off but not awaited; watcher updates are debounced and incremental, ADR-0020)*

---

## Phase 5 — Authoring Workflows · *Planned*

Productivity features for habitual writers.

**Milestones**
* M5.1 — Templates
* M5.2 — Snippets
* M5.3 — Daily notes
* M5.4 — Workspace-level note features

---

## Phase 6 — Platform · *Planned*

Open MarkStudio for extension by others, once everything beneath is stable.

**Milestones**
* M6.1 — Plugin API
* M6.2 — Theme API (within VS Code theming constraints)
* M6.3 — Custom Markdown extension points
* M6.4 — Third-party integrations

---

## Cross-Phase Commitments

These hold in **every** phase and are verified continuously:

* Native VS Code feel; no fake chrome.
* Single persistent webview; CodeMirror and preview never recreated.
* Incremental preview patching only.
* Theme-variable styling; light/dark/high-contrast correctness.
* Keyboard-first; every action reachable without the mouse.
* Documentation updated in the same change as the code.

---

## How Milestones Become Work

1. A milestone is broken into prioritized tasks in [TODO.md](TODO.md).
2. Non-trivial features get a design note in [design/](design/) and a durable record in [implementation/](implementation/) (from [.ai/TEMPLATES/FEATURE.md](../.ai/TEMPLATES/FEATURE.md)).
3. Architectural choices are recorded as ADRs in [DECISIONS.md](DECISIONS.md).
4. User-facing changes are logged in [CHANGELOG.md](CHANGELOG.md).
