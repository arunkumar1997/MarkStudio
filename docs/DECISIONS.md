# DECISIONS — Architecture Decision Records

> The durable log of *why* MarkStudio is built the way it is. Each ADR is immutable once `Accepted`; to change a decision, add a new ADR that supersedes the old one and update the old ADR's status.
>
> Template: [.ai/TEMPLATES/ADR.md](../.ai/TEMPLATES/ADR.md). Numbering is sequential and never reused.

The foundational ADRs below (0001–0006) encode the non-negotiable rules from [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) and [.ai/CONTEXT.md](../.ai/CONTEXT.md) as *reasoned decisions*, so future agents inherit the rationale and not just the rule.

| ADR | Title | Status |
| --- | ----- | ------ |
| [0001](#adr-0001-use-the-custom-editor-api) | Use the Custom Editor API | Accepted |
| [0002](#adr-0002-one-persistent-webview-retained-when-hidden) | One persistent webview, retained when hidden | Accepted |
| [0003](#adr-0003-codemirror-6-for-editing-markdown-it-for-preview) | CodeMirror 6 for editing, markdown-it for preview | Accepted |
| [0004](#adr-0004-rely-on-vs-code-for-theming-autosave-and-file-watching) | Rely on VS Code for theming, autosave, and file watching | Accepted |
| [0005](#adr-0005-vanilla-typescript-html-css--no-frameworks) | Vanilla TypeScript/HTML/CSS — no frameworks | Accepted |
| [0006](#adr-0006-bundle-with-esbuild) | Bundle with esbuild | Accepted |
| [0007](#adr-0007-codemirror-6-package-set-for-the-source-editor) | CodeMirror 6 package set for the source editor | Accepted |
| [0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching) | markdown-it package and incremental block-level preview patching | Accepted |
| [0009](#adr-0009-reconcile-external-changes-through-the-managed-textdocument-with-a-cursor-preserving-diff) | Reconcile external changes through the managed `TextDocument` with a cursor-preserving diff | Accepted |
| [0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings) | Reactive configuration service with CM6 compartments for live settings | Accepted |
| [0011](#adr-0011-unit-test-harness-on-nodes-built-in-runner-with-an-esbuild-bundled-vscode-mock) | Unit-test harness on Node's built-in runner with an esbuild-bundled `vscode` mock | Accepted |
| [0012](#adr-0012-integration-test-harness-jsdom-on-nodetest-for-the-webview-dom-seams) | Integration-test harness: jsdom on `node:test` for the webview DOM seams | Accepted |
| [0013](#adr-0013-extension-host-lifecycle-tests-on-vscodetest-electron-with-a-minimal-in-host-runner) | Extension Host lifecycle tests on `@vscode/test-electron` with a minimal in-host runner | Accepted |

---

## ADR-0001: Use the Custom Editor API

### Status
`Accepted`

### Date
2026-06-26

### Context
MarkStudio must replace the editing surface for `.md` files with a custom split editor + live preview, while remaining a true VS Code editor (dirty indicator, save/revert, hot-exit, tab behavior, undo stack). The two candidate VS Code surfaces are the **Custom Editor API** (`CustomTextEditorProvider`) and a plain **WebviewPanel**.

### Decision
Build MarkStudio on the **Custom Editor API** using `CustomTextEditorProvider`, registered through the `customEditors` contribution point for the Markdown language/`.md` extension.

### Alternatives Considered
1. **Plain WebviewPanel editor** — Rejected: it is not a real editor, so dirty state, save/revert, hot-exit, and tab semantics must be reimplemented and will still feel non-native.
2. **A TextEditor decoration/overlay approach** — Rejected: cannot deliver a true split + preview surface or replace the editing experience.
3. **A standalone language-server-only enhancement** — Rejected: does not address the editing/preview experience at all.

### Reasoning
The Custom Editor API gives us VS Code's document lifecycle for free: dirty tracking, save/revert, hot-exit, and undo integration. This directly serves Core Belief "Native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.1) and the Non-Negotiable Rule to use the Custom Editor API.

### Consequences
**Positive:** Native document lifecycle; correct tab and dirty behavior; less custom state code.
**Negative / Trade-offs:** Custom editors have a stricter lifecycle and webview constraints to respect (no `webview.html` reassignment — see ADR-0002).
**Neutral:** Ties the project to the `customEditors` contribution model.

### Compliance Impact
No rule bent — this *is* a non-negotiable rule, now justified.

### References
* [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — Architecture, Non-Negotiable Rules
* VS Code Custom Editor API documentation

---

## ADR-0002: One persistent webview, retained when hidden

### Status
`Accepted`

### Date
2026-06-26

### Context
Each MarkStudio editor renders inside a webview. Webviews are expensive to construct and lose all DOM/JS state when destroyed. Users switch tabs constantly; CodeMirror and preview state must survive those switches.

### Decision
Create **exactly one** webview per custom-editor instance. Set `retainContextWhenHidden: true` and `enableScripts: true`. Assign `webview.html` **once** at initialization and **never reassign it**. All subsequent communication uses `postMessage()` through a typed MessageBus.

### Alternatives Considered
1. **Recreate the webview on tab focus** — Rejected: destroys editor/preview state and causes visible flicker and latency.
2. **Reassign `webview.html` to update content** — Rejected: tears down the entire DOM and CodeMirror instance; defeats incremental updates.
3. **Multiple webviews per editor (e.g., one per pane)** — Rejected: unnecessary complexity and duplicated state; one shell hosting two panes is simpler.

### Reasoning
State preservation and performance are top-priority goals ([ARCHITECTURE.md](ARCHITECTURE.md) §1; [.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.2, §3.4). A retained, never-reassigned webview is the only way to keep cursor, scroll, and layout intact across tab switches without expensive rebuilds.

### Consequences
**Positive:** Instant tab switches; preserved state; enables incremental editor/preview updates.
**Negative / Trade-offs:** Retained webviews consume memory while hidden; must be mindful with many open tabs.
**Neutral:** Forces a message-passing discipline for all updates (which we want anyway).

### Compliance Impact
No rule bent — encodes the "single persistent webview" and "never reassign `webview.html`" rules.

### References
* [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — Webview Rules, Performance Requirements
* [ARCHITECTURE.md](ARCHITECTURE.md) §2, §8

---

## ADR-0003: CodeMirror 6 for editing, markdown-it for preview

### Status
`Accepted`

### Date
2026-06-26

### Context
We need a best-in-class text editor for the source pane and a correct, fast Markdown renderer for the preview pane. Both must be embeddable in a webview, themeable via CSS variables, and extensible for later phases (math, mermaid, callouts, wiki links).

### Decision
Use **CodeMirror 6** for the editor and **markdown-it** for preview rendering.

### Alternatives Considered
1. **Monaco for editing** — Rejected: heavyweight, harder to theme to a Markdown-first experience, larger bundle, and overkill for Markdown source editing.
2. **CodeMirror 5** — Rejected: legacy architecture, weaker tree/extension model than CM6.
3. **`marked` / `remark` for preview** — Rejected for v1: markdown-it has a mature plugin ecosystem (footnotes, GFM, custom containers) that maps cleanly onto our phased syntax roadmap; `remark` is powerful but heavier to integrate for incremental DOM patching.

### Reasoning
CM6's transactional, extension-based design fits "the editor is sacred" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.2) and our need to attach features as extensions without recreating the editor. markdown-it's plugin model supports the Phase 3+ syntax features and enables incremental rendering. Both are explicit Non-Negotiable Rules.

### Consequences
**Positive:** Strong extensibility seams (`editor/extensions.ts`, markdown-it plugins); active ecosystems; themeable.
**Negative / Trade-offs:** CM6 has a learning curve; we must avoid wrapping it in heavy abstractions (per [.ai/CONTEXT.md](../.ai/CONTEXT.md) §5).
**Neutral:** Two libraries to track for updates.

### Compliance Impact
No rule bent — encodes the mandated editor and renderer choices.

### References
* [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — Core Technologies, Editor, Preview
* [ROADMAP.md](ROADMAP.md) — Phase 3 syntax features

---

## ADR-0004: Rely on VS Code for theming, autosave, and file watching

### Status
`Accepted`

### Date
2026-06-26

### Context
Theming, autosave, and external-change detection are solved problems inside VS Code. Reimplementing them risks inconsistency with user expectations and settings.

### Decision
* **Theming:** style everything with `--vscode-*` CSS variables; never hardcode colors, fonts, or sizes.
* **Autosave:** respect VS Code's autosave settings; implement no custom autosave.
* **File watching:** detect external changes via `workspace.createFileSystemWatcher`; no custom polling.

### Alternatives Considered
1. **Custom theme system / color picker** — Rejected: breaks theme consistency and the "themes are not ours to design" belief ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.5).
2. **Custom autosave timer** — Rejected: duplicates and may conflict with VS Code's autosave; surprises users.
3. **Manual `fs.watch` polling** — Rejected: fragile across platforms; the workspace watcher is the supported API.

### Reasoning
"Native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.1) and the Anti-Patterns list both direct us to consume VS Code APIs. This keeps MarkStudio consistent with the rest of the editor and reduces our code surface.

### Consequences
**Positive:** Correct light/dark/high-contrast support for free; consistent save behavior; reliable change detection.
**Negative / Trade-offs:** We inherit VS Code's API constraints (e.g., watcher granularity).
**Neutral:** Some styling must be expressed purely through CSS variables, occasionally requiring a small `themeBridge` for computed needs.

### Compliance Impact
No rule bent — encodes three non-negotiable rules.

### References
* [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — Theme, Autosave, File Changes
* [.ai/CONTEXT.md](../.ai/CONTEXT.md) §5 (Anti-Patterns)
* [ADR-0009](#adr-0009-reconcile-external-changes-through-the-managed-textdocument-with-a-cursor-preserving-diff) — refines the "file watching" clause for the text-backed custom editor case (T-110)

---

## ADR-0005: Vanilla TypeScript/HTML/CSS — no frameworks

### Status
`Accepted`

### Date
2026-06-26

### Context
The webview UI (toolbar, split view, panes) could be built with a UI framework or with vanilla DOM. Frameworks add bundle size, abstraction, and a layer between us and the DOM/CodeMirror.

### Decision
Build all UI with **vanilla TypeScript, HTML, and CSS**. Introduce **no** UI framework (React, Vue, Angular, Svelte, Lit) and **no** CSS framework (Tailwind, Bootstrap, Material UI). Use **VS Code Codicons** for icons.

### Alternatives Considered
1. **A lightweight framework (e.g., Lit/Preact)** — Rejected: still an abstraction over the DOM, adds bundle weight, and is unnecessary for a small, mostly-static shell.
2. **A CSS framework** — Rejected: conflicts with theme-variable styling and adds non-native visuals.

### Reasoning
The shell is small and mostly static; CodeMirror and markdown-it own the dynamic surfaces. "Stay small" and "patches over replacement" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §4) favor vanilla DOM with direct, minimal updates. Frameworks would also encourage full re-render patterns we explicitly forbid.

### Consequences
**Positive:** Minimal bundle; no abstraction between us and CodeMirror/DOM; full control over incremental updates.
**Negative / Trade-offs:** We write some DOM plumbing by hand; we must be disciplined about structure ([CODING_GUIDELINES.md](CODING_GUIDELINES.md)).
**Neutral:** Component composition is by small modules/functions, not framework components.

### Compliance Impact
No rule bent — encodes the Forbidden Technologies list.

### References
* [.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — UI, Forbidden Technologies
* [.github/copilot-instructions.md](../.github/copilot-instructions.md) — Forbidden Technologies

---

## ADR-0006: Bundle with esbuild

### Status
`Accepted` *(confirmed during T-101 scaffolding, 2026-06-26)*

### Date
2026-06-26

### Context
A VS Code extension with a separately bundled webview script needs a fast, simple bundler for two targets: the Node extension host and the browser webview. This decision was required by the first scaffolding task (T-101) and was recorded as `Proposed` until that task confirmed it.

### Decision
Use **esbuild** to bundle both the extension host entry (`src/extension.ts`, platform `node`) and the webview entry (`src/webview/main.ts`, platform `browser`), with a watch mode for development.

### Alternatives Considered
1. **webpack** — Heavier configuration and slower builds; common in older extension samples.
2. **Rollup** — Excellent for libraries; more plugin wiring for dual-target app bundling.
3. **tsc only (no bundler)** — Insufficient: the webview needs a single bundled script for the CSP/nonce model, and tree-shaking CM6/markdown-it matters for bundle size.

### Reasoning
esbuild is extremely fast, has minimal configuration, and is the de-facto choice in current VS Code extension samples. It supports the dual node/browser targets we need and keeps the toolchain small ("Stay small", [ARCHITECTURE.md](ARCHITECTURE.md) §1).

### Consequences
**Positive:** Fast builds and watch; tiny config; good tree-shaking for CM6/markdown-it.
**Negative / Trade-offs:** Fewer advanced transforms than webpack (not needed here).
**Neutral:** Requires a thin build script rather than a large config file.

### Compliance Impact
No rule bent. This is a tooling choice, not an architectural rule.

### Follow-Ups
* ~~Confirm or replace during T-101~~ — **Done.** T-101 implemented `esbuild.js` with dual node/browser targets and a `--watch` mode; `npm run build` produces `dist/extension.js` and `dist/webview.js`. Status flipped to `Accepted`.

### References
* [TODO.md](TODO.md) — T-101 scaffolding
* [AGENT_HANDOFF.md](AGENT_HANDOFF.md) — Open Questions

---

## ADR-0007: CodeMirror 6 package set for the source editor

### Status
`Accepted`

### Date
2026-06-26

### Context
ADR-0003 selected CodeMirror 6 as the source editor. Implementing **T-104** (the source editor itself) requires picking the concrete set of `@codemirror/*` packages and their wiring. CM6 is intentionally distributed as small, composable modules; bundle size and "no UI framework" constraints ([.ai/PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md), ADR-0005) make the package selection a real choice rather than a default. The **Dependency Policy** in [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §10 requires the answers below before adding any runtime dependency.

### Decision
The MarkStudio source editor consumes exactly these CodeMirror 6 runtime packages, pinned with caret ranges in [`package.json`](../package.json):

* `@codemirror/state` — `EditorState`, `Annotation` (used for the remote/local distinction).
* `@codemirror/view` — `EditorView` and the surface extensions (`lineNumbers`, `highlightActiveLine`, `drawSelection`, `dropCursor`, `keymap`, `rectangularSelection`, `crosshairCursor`).
* `@codemirror/commands` — `history`, `defaultKeymap`, `historyKeymap`, `indentWithTab`.
* `@codemirror/language` — `HighlightStyle`, `syntaxHighlighting`, `bracketMatching`, `indentOnInput`.
* `@codemirror/lang-markdown` — Markdown grammar for the source pane.
* `@codemirror/search` — `searchKeymap`, `highlightSelectionMatches`.
* `@lezer/highlight` — the `tags` enum used by `HighlightStyle.define` (transitive of `@codemirror/language` but consumed directly in our code, so listed explicitly).

All seven are by the CodeMirror team and version-locked together by their dependency ranges. No third-party CM6 plugin is introduced.

### Alternatives Considered
1. **A "batteries-included" wrapper such as `codemirror` (v6 meta-package)** — Rejected: pulls in extras (e.g., `@codemirror/autocomplete`) we do not need in T-104, and obscures which surface is actually in use. The Dependency Policy favours the smallest set that meets the requirement.
2. **`@codemirror/lint`, `@codemirror/autocomplete`, `@codemirror/lang-html`** — Rejected for now: not needed by T-104 and explicitly out of scope. They can be added with their own ADR when a feature requires them.
3. **Custom Markdown highlighting via a built-from-scratch grammar** — Rejected: `lang-markdown` already produces a tree we can highlight against; reimplementing this would duplicate work and ship a worse experience.
4. **`@codemirror/theme-one-dark` (or similar prebuilt theme)** — Rejected: it hardcodes colors and would compete with VS Code's theme (ADR-0004). We use a small in-house `EditorView.theme(...)` keyed entirely to `--vscode-*` variables.

### Reasoning
**Dependency Policy answers** (CODING_GUIDELINES.md §10):

1. **Why needed?** CodeMirror 6 is the mandated source editor (ADR-0003). These packages are the minimum to deliver Markdown syntax + history + search + theme integration required by T-104.
2. **Actively maintained?** Yes — all packages are maintained by Marijn Haverbeke under the `codemirror/` org with regular releases.
3. **Could VS Code / CodeMirror / markdown-it already do this?** No — VS Code's text editor is not embeddable in a webview; CM6 *is* the editor; markdown-it is for preview rendering only.
4. **Could we implement this ourselves?** Reimplementing transactional document state, an undo stack, find-as-you-type, and a Markdown parser is explicitly the work ADR-0003 chose **not** to do.
5. **Bundle size impact?** The production-minified webview bundle is **~536 KB** with all seven packages and the Markdown grammar (vs. the empty-shell bundle of ~5 KB before T-104). Acceptable for a full-featured editor; revisited if Phase 1 budgets require it.

Theming is implemented as an `EditorView.theme(...)` whose every color, font, and cursor token resolves to a `--vscode-*` variable, so light/dark/high-contrast correctness ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.5) holds without a custom theme bridge and without recreating the editor on theme changes ([PROJECT_SPEC.md](../.ai/PROJECT_SPEC.md) — Theme; ADR-0004).

### Consequences
**Positive:** Real Markdown editing surface; history / search / multi-cursor / line-wrap for free; theme-correct in every VS Code theme; extensible via additional CM6 extensions in later phases (Phase 3 modern Markdown features attach here per [ARCHITECTURE.md](ARCHITECTURE.md) §10).
**Negative / Trade-offs:** ~530 KB on the webview side (vs. ~5 KB for the textarea); a learning curve for contributors unfamiliar with CM6's transactional model. Mitigated by `createEditor.ts` exposing a small, intention-revealing surface (`setContentFromHost`, `focus`, `destroy`) so the rest of the codebase does not need to know CM6 internals.
**Neutral:** Seven CM6 packages to track for updates; they are versioned together in practice.

### Compliance Impact
No non-negotiable rule is bent. ADR-0003 mandates CodeMirror 6; this ADR picks the concrete packages. Theming uses only `--vscode-*` variables (ADR-0004, PROJECT_SPEC.md). Editor state is preserved across tab switches by retaining a single `EditorView` for the webview's lifetime (ADR-0002).

### Migration Plan
Not a migration — first introduction of CM6 to the codebase. The previous `<textarea>` stand-in in `src/webview/main.ts` was removed in the same change. The `edit` message extended its payload with a `changes: EditChange[]` field (the CM6 diff) plus `text` (for the host's echo guard); the host now routes edits through the new `MarkStudioDocument.applyChanges` while `replaceAll` remains available for future reconciliation paths (T-110).

### Follow-Ups
* T-105 — markdown-it live preview attaches alongside this editor (the editor surface is now stable enough for the preview to render against).
* T-109 — persist CM6 cursor and scroll position via `vscode.setState()`.
* T-110 — external file-change reconciliation should call `setContentFromHost` on `setContent`, which already preserves selection naturally.
* Revisit the highlight scheme when a proper theme-token mapping exists (currently uses typography + a few stable VS Code link/preformat colors).

### References
* [ADR-0003](#adr-0003-codemirror-6-for-editing-markdown-it-for-preview)
* [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §10 (Dependency Policy)
* [ARCHITECTURE.md](ARCHITECTURE.md) §4.2, §10
* [TODO.md](TODO.md) — T-104
* CodeMirror 6 reference manual

---

## ADR-0008: markdown-it package and incremental block-level preview patching

### Status
`Accepted`

### Date
2026-06-26

### Context
ADR-0003 selected markdown-it as the preview renderer. Implementing **T-105** (the live preview itself) requires picking the concrete markdown-it package version, settling on a parsing/rendering strategy that satisfies the non-negotiable rule **never recreate the preview DOM** ([ARCHITECTURE.md](ARCHITECTURE.md) §4.2 / §8, [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §8), and answering the **Dependency Policy** questions from [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §10 before adding a runtime dependency.

The Markdown preview surface is the most edit-sensitive view in the editor: it must update on every keystroke without re-running the layout for the whole document. Two structural shapes were on the table — a full re-render with `innerHTML` replacement, and a tree diff against the previous DOM.

### Decision
The MarkStudio preview consumes exactly:

* `markdown-it` — `^14.1.0` (installed: `14.2.0`), the only runtime markdown-it package. Configured with `html: false`, `linkify: true`, `typographer: false`, `breaks: false`, `xhtmlOut: false`. No third-party markdown-it plugin is introduced in T-105.
* `@types/markdown-it` — a **devDependency** for compile-time types only (markdown-it 14 ships without its own `.d.ts`).

Rendering is **block-level incremental**. On every (debounced, 40 ms) update:

1. `md.parse(text, {})` produces a flat token stream.
2. The token stream is **grouped by top-level block** (heading, paragraph, list, blockquote, code block, …) so each group is a self-contained slice the renderer can serialise on its own.
3. Each group is rendered to an HTML string and diffed against the cached `{ html, node }[]` from the previous render using a **longest common prefix + longest common suffix** algorithm.
4. Only the blocks in the changed middle range are removed and re-inserted into the persistent preview root. Unchanged blocks keep their existing `Element` reference and their browser-allocated layout boxes.

The preview root (`<article class="markstudio-preview-content">`) is created **once** and never replaced; the renderer only mutates its children. There is no `innerHTML` replacement at the root.

### Alternatives Considered
1. **Full re-render via `previewRoot.innerHTML = md.render(text)` on each keystroke** — Rejected: directly violates the "never recreate the preview DOM" rule, throws away scroll/selection inside the preview, and causes visible flicker on long documents. The whole point of T-105 was to avoid this shape.
2. **A general-purpose DOM diff (e.g., morphdom, snabbdom, virtual-dom)** — Rejected: another runtime dependency for a problem the structure of Markdown already solves at the block level. Block-level granularity covers the realistic edit pattern (one keystroke affects one — occasionally two — top-level blocks) without a generic diff engine.
3. **Per-token (inline-level) patching with character offsets back into the source** — Rejected for T-105 as premature optimisation: block-level granularity already meets the performance budget on Phase 1 documents, and the engineering complexity (mapping source offsets ⇄ rendered ranges with markdown-it tokens) is much higher than the win. Revisit if a profile shows specific block sizes blocking the budget.
4. **`remark` / `marked`** — Rejected previously by ADR-0003. Reaffirmed: markdown-it's flat, level-tagged token stream is *exactly* the shape the block-grouping algorithm above needs; `remark`'s mdast would require an extra walk.
5. **`@types/markdown-it` as a runtime dependency** — Rejected: types are compile-time only and do not need to ship.

### Reasoning
**Dependency Policy answers** ([CODING_GUIDELINES.md](CODING_GUIDELINES.md) §10):

1. **Why needed?** markdown-it is the mandated preview renderer (ADR-0003). T-105 is its first concrete consumer.
2. **Actively maintained?** Yes — markdown-it 14.x is the current major; the project ships regular releases under the `markdown-it/` org.
3. **Could VS Code / CodeMirror / markdown-it already do this?** VS Code's built-in Markdown preview is a separate webview, not embeddable in our custom editor. CodeMirror is for the source pane. markdown-it itself *is* the renderer — that is the question this ADR answers.
4. **Could we implement this ourselves?** Reimplementing a CommonMark/GFM parser is explicitly out of scope (ADR-0003).
5. **Bundle-size impact?** The production-minified webview bundle is **~687 KB** (up from ~536 KB at T-104 → ~151 KB for `markdown-it` + its transitive dependencies `entities`, `linkify-it`, `mdurl`, `punycode.js`, `uc.micro`, `argparse`). Acceptable for what it delivers (full CommonMark + linkify + extensible plugin slot for Phase 3); revisited if Phase 1 budgets are missed.

**Why block-level patching is the right granularity.** Most user edits affect one top-level block — the paragraph or heading they are typing in. Block-level diff keeps every other block's DOM node, layout box, scroll position, and accessibility tree intact across keystrokes. That is the practical meaning of "patch the DOM, never replace" ([CODING_GUIDELINES.md](CODING_GUIDELINES.md) §8). The same seam will support Phase 3 plugins (math, mermaid, callouts) without re-architecting because plugins register through markdown-it's own plugin API and produce tokens that flow through the same grouping/rendering pipeline.

**Why `html: false`.** Raw HTML in user Markdown is a script-injection risk in a webview with `enableScripts: true` (the webview's CSP forbids inline scripts, but `<iframe src=...>` and event handlers in raw HTML are still surface area we do not need in T-105). Disabling it removes that surface entirely. A Phase 3 ADR can revisit with an explicit security review if user demand justifies it.

### Consequences
**Positive:** Live preview that satisfies the non-negotiable patching rule; unchanged blocks keep their DOM identity across keystrokes; clean attachment point for Phase 3 markdown-it plugins; safer default (no raw HTML).
**Negative / Trade-offs:** ~151 KB added to the webview bundle (markdown-it + its transitive utilities); a small custom diff function in `PreviewRenderer.ts` we own and must keep correct; block-level granularity is coarser than per-line, so a paragraph 200 lines long re-renders the whole paragraph when any character inside it changes (acceptable; profile before optimising).
**Neutral:** markdown-it 14 ships without types; we add `@types/markdown-it` as a devDependency.

### Compliance Impact
No non-negotiable rule is bent. ADR-0003 mandates markdown-it; this ADR picks the version, the configuration, and the rendering strategy. The rule "never recreate the preview DOM" is enforced by construction — the preview root element is created once and only its children are mutated. Theming is done in `src/webview/main.ts` via CSS keyed to `--vscode-*` variables (ADR-0004) so the preview matches every VS Code theme without a webview reload.

### Migration Plan
Not a migration. T-105 is the first introduction of markdown-it to the codebase and adds `src/webview/preview/PreviewRenderer.ts` alongside the existing CM6 editor pane. The webview now mounts two long-lived panes inside `#markstudio-root` (editor + preview); a proper resizable App Shell wrapping them lands in T-106.

No message-protocol change. The preview consumes the same `text` that already flows over `init`, `setContent`, and the CM6 `onLocalChange` seam introduced in T-104.

### Follow-Ups
* T-106 — App Shell with split view / editor-only / preview-only modes wrapping the two panes introduced here.
* T-2.1 — Scroll synchronisation between the editor and the preview.
* Revisit `html: false` only after a Phase 3 security review.
* Revisit per-token / per-line granularity only if profiling a real document shows block-level patching missing the Phase 1 budget.
* Add a Phase 3 ADR for any markdown-it plugins (footnotes, GFM tables, math, mermaid, …) introduced later.

### References
* [ADR-0003](#adr-0003-codemirror-6-for-editing-markdown-it-for-preview)
* [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §8 (Performance), §10 (Dependency Policy)
* [ARCHITECTURE.md](ARCHITECTURE.md) §4.2, §5.2, §8, §10
* [TODO.md](TODO.md) — T-105
* markdown-it reference manual

---

## ADR-0009: Reconcile external changes through the managed `TextDocument` with a cursor-preserving diff

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-110** is "external file-change reconciliation": when a `.md` file changes on disk (a `git pull`, a save from another editor, a formatter rewriting the file), the open MarkStudio editor must update without losing the user's cursor more than necessary.

ARCHITECTURE.md §5.4 and the planned `services/FileWatcherService.ts` anticipated wiring `workspace.createFileSystemWatcher` per document, and ADR-0004 encodes "detect external changes via `workspace.createFileSystemWatcher`; no custom polling." That guidance was written generically, before the editor settled on `CustomTextEditorProvider` (ADR-0001).

The key fact that changes the calculus: a `CustomTextEditorProvider` operates on a **VS Code-managed `TextDocument`**, not an opaque custom document. VS Code already owns the document ⇄ disk relationship — when a clean document's file changes on disk, VS Code reverts the in-memory model and fires `workspace.onDidChangeTextDocument`; when the document is dirty, VS Code shows its native "file changed on disk" conflict UX. The provider already subscribes to `onDidChangeTextDocument` and pushes the new text to the webview as `setContent`. So external changes were *already* being detected and reconciled — the only real defect was that `setContentFromHost` applied the new text as a **full-document replace** (`{ from: 0, to: docLength }`), which collapses CodeMirror's selection mapping and jumps the cursor to the document start.

### Decision
1. **Do not add a separate `FileSystemWatcher` for the text-backed custom editor.** External-change detection is delegated to VS Code's managed `TextDocument` + `onDidChangeTextDocument`, which is the native reconciliation surface for `CustomTextEditorProvider` (ADR-0001) and the most "native beats custom" option available. Dirty-document conflicts are left to VS Code's built-in UX.
2. **Reconcile authoritative host content as a minimal diff, not a full replace.** `createEditor.setContentFromHost` now computes the single changed span between the current and incoming text by trimming the common prefix and common suffix (`computeMinimalChange`) and dispatches only that change (still tagged with the `RemoteSync` annotation so it is not echoed back as an `edit`). CodeMirror maps the existing selection across that change, so the cursor stays put whenever the external edit does not touch the cursor's region.

### Alternatives Considered
1. **Add `services/FileWatcherService.ts` with `createFileSystemWatcher` as planned** — Rejected for the text-backed editor: it would fire on the same raw FS event that VS Code already reconciles into the `TextDocument`, causing a redundant second `setContent` for clean documents, and would risk clobbering unsaved edits if it reconciled a dirty document instead of deferring to VS Code's conflict UX. A raw watcher is the right tool for a non-text `CustomEditorProvider`, where VS Code does **not** manage a `TextDocument` for you — not here.
2. **Host-side diff sent as `changes: EditChange[]`** — Rejected for now: computing the diff in the webview (where the current document already lives in CM6) avoids a protocol change and an extra host-side full-text scan. The wire message stays the existing `setContent { text }`. Revisit only if a host-authoritative diff is ever needed.
3. **Keep the full-document replace** — Rejected: it is the exact behaviour T-110 exists to fix (the cursor jumps to offset 0 on every external rewrite).

### Reasoning
"Native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.1): for a `CustomTextEditorProvider`, `onDidChangeTextDocument` *is* VS Code's external-change reconciliation surface, so consuming it honors ADR-0004's intent (no custom polling, use the supported API) better than bolting a second watcher onto a model VS Code already keeps in sync. The minimal-diff in `setContentFromHost` is a few lines of prefix/suffix trimming with no new dependency, and it satisfies the T-110 "done when" (external edits update the editor without losing the cursor unnecessarily) by leaning on CodeMirror's existing selection mapping rather than reimplementing cursor preservation.

### Consequences
**Positive:** External edits (revert, `git pull`, other-editor save, external formatter) update the editor as a single targeted change; the cursor and selection are preserved whenever the edit is elsewhere in the document. No new runtime dependency, no protocol change, no redundant FS event handling, dirty-conflict UX stays native.
**Negative / Trade-offs:** Prefix/suffix trimming yields one contiguous change span, so an edit that touches both the top and bottom of the file (rare for external rewrites) is reconciled as one span covering the middle — still correct, just not maximally minimal. The cursor is not preserved when the external edit lands exactly inside the cursor's region (unavoidable — that text no longer exists).
**Neutral:** `services/FileWatcherService.ts` is not created; ARCHITECTURE.md §5.4 and the responsibilities table are updated to reflect the managed-`TextDocument` path. If a future non-text custom document is ever added, a watcher can be introduced then under its own ADR.

### Compliance Impact
Refines ADR-0004's "file watching" clause for the text-backed custom editor rather than bending it: the rule's purpose (no fragile custom polling; rely on VS Code's supported change-detection) is upheld by using the managed `TextDocument`. ADR-0004 stays `Accepted` with a forward reference to this ADR. No other non-negotiable rule is touched: the webview is not recreated, CM6 is not rebuilt, and the reconciliation flows through the existing single `setContent` seam (ADR-0002).

### Migration Plan
Not a migration. The only code change is `createEditor.setContentFromHost`, which now calls the new module-private `computeMinimalChange(current, next)` instead of replacing the whole document. The `onDidChangeTextDocument` handler and its echo guard in `MarkStudioEditorProvider` are unchanged. No message-protocol change.

### Follow-Ups
* T-2.1 — editor ⇄ preview scroll synchronisation.
* If QA finds the single-span reconciliation jumps the cursor for a common external-rewrite pattern, consider a host-side multi-range diff sent as `changes: EditChange[]` (would need a protocol addition + boundary guard).

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0004](#adr-0004-rely-on-vs-code-for-theming-autosave-and-file-watching)
* [ARCHITECTURE.md](ARCHITECTURE.md) §5.4
* [CODING_GUIDELINES.md](CODING_GUIDELINES.md) §5
* [TODO.md](TODO.md) — T-110
* VS Code Custom Editor API documentation (`CustomTextEditorProvider`, `onDidChangeTextDocument`)

---

## ADR-0010: Reactive configuration service with CM6 compartments for live settings

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-111** is "Configuration service": MarkStudio needs to read `markstudio.*` settings and have the webview honour them, reactively, without a reload. The first setting is `markstudio.editor.lineNumbers`, which toggles the CodeMirror 6 line-number gutter.

Two questions had to be settled: (1) how the host reads and watches settings, and (2) how the webview applies a setting change to a long-lived `EditorView` that — per ADR-0002 — must never be rebuilt.

The host side is straightforward: VS Code's Configuration API (`workspace.getConfiguration` + `onDidChangeConfiguration`) is the supported, native surface, consistent with ADR-0004 ("rely on VS Code for … configuration"). The webview side is the real decision: CodeMirror 6 state is immutable and its extension set is fixed at `EditorState.create` time, so naively changing an extension means rebuilding the editor — exactly what ADR-0002 forbids. CM6's answer is the **`Compartment`**: a placeholder in the initial extension set whose contents can be swapped later via `view.dispatch({ effects: compartment.reconfigure(...) })`, with no new `EditorView`.

### Decision
1. **Host-side `ConfigurationService`** (`src/services/ConfigurationService.ts`) is a thin, stateless reader. `read(resource?)` returns a plain-JSON `MarkStudioConfig` from `workspace.getConfiguration("markstudio", resource)`; `onDidChange(listener)` wraps `onDidChangeConfiguration` filtered by `affectsConfiguration("markstudio")`. It caches **no** snapshot of its own — callers always re-read the live, merged value, which sidesteps cache-invalidation bugs and honours resource-scoped overrides when the provider passes the document URI.
2. **`MarkStudioConfig` rides the message protocol.** `init` now carries a required `config` field so the first paint already reflects the user's settings, and a new `configChanged { config }` host → webview message pushes live updates. Both are validated by the boundary guard `isMarkStudioConfig` (ADR-0002's "untrusted across the bus" rule).
3. **The webview applies settings through CM6 compartments, never a rebuild.** `extensions.ts` wraps the line-number gutter in an exported `lineNumbersCompartment`; `createEditor.setConfig(config)` dispatches `lineNumbersCompartment.reconfigure(lineNumbersExtension(config.lineNumbers))`. The single long-lived `EditorView` (ADR-0002) is preserved; only the compartment's contents change.

### Alternatives Considered
1. **Cache a config snapshot in the service and diff on change** — Rejected: a stateless re-read is simpler, cannot drift, and the read is cheap. Diffing would only matter if a setting were expensive to apply; none is today.
2. **Rebuild the `EditorView` on every setting change** — Rejected outright: it violates ADR-0002 (never recreate CodeMirror) and would throw away cursor, scroll, history, and selection. Compartments exist precisely to avoid this.
3. **Read settings only in the webview** — Impossible and wrong: the webview has no access to the VS Code Configuration API, and the host is the correct owner of VS Code-side state (ARCHITECTURE.md §7). Settings must be read host-side and sent over the bus.
4. **A single global service that broadcasts to all webviews** — Deferred: each resolved editor already owns its bus and subscribes per document URI, which is what makes resource-scoped settings work. A shared broadcaster would have to re-resolve per-URI anyway, adding indirection for no gain at this scale.

### Reasoning
"Native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.1): the Configuration API is VS Code's settings surface, so we consume it rather than inventing a settings store. "The editor is sacred" (§3.2): the `Compartment` is CM6's first-party mechanism for live reconfiguration without a rebuild, so it satisfies the live-update requirement while honouring ADR-0002. Keeping the service stateless and re-reading per resource is the smallest correct design (Design Principle §4.5) and the one most likely to behave correctly under user/workspace/folder setting layering.

### Consequences
**Positive:** `markstudio.editor.lineNumbers` toggles the gutter instantly with the editor fully intact (cursor, scroll, history preserved). The `ConfigurationService` + `MarkStudioConfig` + `lineNumbersCompartment` form a clear, extensible seam: each future `markstudio.*` setting adds a field to `MarkStudioConfig`, a property to the `configuration` contribution, and (if it maps to a CM6 extension) one more compartment. No new dependency; production-minified webview **~699.6 KB** (≈ unchanged), host **~7.0 KB** (+~0.4 KB).
**Negative / Trade-offs:** Every `markstudio.*` change notifies every open MarkStudio editor, each of which re-reads and re-posts; idempotent and cheap, but O(open editors). The `init` message gained a required field, so the boundary guard now rejects an `init` without a valid `config` — intentional, since the host always sends one.
**Neutral:** `ConfigurationService` is host-only and holds no state, so it needs no disposal; the per-editor `onDidChange` subscription is disposed with the webview panel.

### Compliance Impact
Upholds ADR-0002 (the `EditorView` is reconfigured, never rebuilt), ADR-0004 (settings read via the VS Code Configuration API, no custom store), and ADR-0005 (no framework — a plain service + CM6 compartment). The `markstudio.editor.lineNumbers` contribution is the first entry under `contributes.configuration` in `package.json`. No non-negotiable rule is bent.

### Migration Plan
Not a migration. New file `src/services/ConfigurationService.ts`; `init` gains a `config` field and a new `configChanged` message is added (with its guard); `extensions.ts` / `createEditor.ts` gain the line-numbers compartment + `setConfig`; `package.json` gains the `configuration` contribution. No existing behaviour changes when the setting is left at its `true` default.

### Follow-Ups
* T-112 — test harness; cover `ConfigurationService.read` defaults and the `isMarkStudioConfig` guard.
* Future `markstudio.*` settings (font, preview options, word-wrap toggle) extend `MarkStudioConfig` and add their own compartments where they map to CM6 extensions.

### References
* [ADR-0002](#adr-0002-one-persistent-webview-retained-when-hidden)
* [ADR-0004](#adr-0004-rely-on-vs-code-for-theming-autosave-and-file-watching)
* [ARCHITECTURE.md](ARCHITECTURE.md) §6, §7
* [api/message-protocol.md](api/message-protocol.md)
* [TODO.md](TODO.md) — T-111
* CodeMirror 6 `Compartment` / `StateEffect` documentation
* VS Code Configuration API (`workspace.getConfiguration`, `onDidChangeConfiguration`)

---

## ADR-0011: Unit-test harness on Node's built-in runner with an esbuild-bundled `vscode` mock

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-112** stands up the first automated tests. [TESTING.md](TESTING.md) calls for a fast unit layer (pure logic, no VS Code host, no DOM) as the default, with a heavier integration layer to follow. Two obstacles shape the harness: the source is TypeScript (Node cannot execute `.ts` directly under the project's `engines` floor), and several units (`MarkStudioDocument`, `ConfigurationService`) `import * as vscode from "vscode"` — a module the Extension Host provides at runtime, with no npm package to resolve under a plain `node` process.

### Decision
1. **Test runner: Node's built-in `node:test` + `node:assert/strict`.** No framework dependency (Mocha/Jest/Vitest) is added — consistent with ADR-0005's minimalism and the project's lean dependency list.
2. **Compile + alias with esbuild (already a dev dependency).** `esbuild.test.js` discovers every `test/**/*.test.ts`, bundles them into a single CommonJS file (`dist-test/tests.cjs`), and **aliases the `vscode` import to `test/_mocks/vscode.ts`** — a small, deterministic stand-in exposing only the API surface the units touch (`Range`, `WorkspaceEdit`, `workspace.applyEdit`/`getConfiguration`/`onDidChangeConfiguration`) plus a `__`-prefixed control surface. Because the alias target and the path the tests import resolve to the same file, source and tests share one module instance, so recorded state lines up.
3. **Type-check tests separately.** `tsconfig.test.json` extends the strict base and includes `test/` so `npm run typecheck:test` keeps tests honest (esbuild only strips types, it does not check them).
4. **Scope this layer to pure + mockable logic.** The first tests cover the MessageBus boundary guards, `viewState`, `MarkStudioDocument.applyChanges`, and `ConfigurationService`. The CM6 `RemoteSync` echo path and the full Custom Editor lifecycle need a DOM / the Extension Host and are deferred to an integration layer (T-113).

### Alternatives Considered
1. **`@vscode/test-electron` for everything** — Rejected for the *unit* layer: it boots a full Extension Host (slow, heavy) which contradicts "unit tests run in milliseconds". It remains the right tool for the deferred integration layer (T-113).
2. **`tsx` / `ts-node` loader to run `.ts` directly** — Rejected: adds a dependency, and aliasing `vscode` would lean on `tsconfig` `paths`, which would also rewrite the production build's type resolution. esbuild already owns bundling and aliases cleanly without touching the app build.
3. **Mocha + Jest/Vitest** — Rejected: a new framework dependency for what `node:test` already does natively.
4. **`node:test` `mock.module()` instead of an esbuild alias** — Rejected: still experimental and would not remove the `.ts`-execution problem; the esbuild step solves both transpilation and aliasing in one pass.

### Reasoning
"Native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md) §3.1) and ADR-0005's no-framework minimalism point straight at `node:test`. Reusing esbuild (ADR-0006) for the test build means **zero new dependencies** while solving both transpilation and the `vscode` resolution gap. Keeping the unit layer host-free preserves the millisecond feedback loop TESTING.md asks for; the mock is intentionally tiny so it documents exactly which host API each unit depends on.

### Consequences
**Positive:** `npm test` type-checks, bundles, and runs the suite in well under a second; no new runtime or dev dependency; the mock makes each unit's host-API dependency explicit. `npm run test:unit` runs the fast path without the type-check.
**Negative / Trade-offs:** The mock must be kept in step with any new `vscode` API a unit starts using. Bundling means a stack trace points into `dist-test/tests.cjs` (mitigated by inline source maps). Integration coverage (CM6 round-trip, lifecycle) is not yet present — tracked as T-113.
**Neutral:** A new build artifact directory `dist-test/` (git-ignored) and a second `tsconfig.test.json`.

### Compliance Impact
Upholds ADR-0005 (no new framework) and ADR-0006 (esbuild is the one bundler). No non-negotiable rule is bent.

### Migration Plan
Not a migration. New files: `esbuild.test.js`, `tsconfig.test.json`, `test/_mocks/vscode.ts`, and the first `test/**/*.test.ts`. New `package.json` scripts `test`, `test:unit`, `typecheck:test`. `dist-test/` added to `.gitignore`.

### Follow-Ups
* **T-113 — integration tests** for the CM6 `RemoteSync` echo path and the Custom Editor lifecycle, on `@vscode/test-electron` (or a DOM harness for the webview-only seams).
* Wire `npm test` into CI (T-120).

### References
* [ADR-0005](#adr-0005-vanilla-typescript-html-css--no-frameworks)
* [ADR-0006](#adr-0006-bundle-with-esbuild)
* [TESTING.md](TESTING.md)
* [TODO.md](TODO.md) — T-112, T-113
* Node.js `node:test` / `node:assert` documentation

---

## ADR-0012: Integration-test harness: jsdom on `node:test` for the webview DOM seams

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-113** adds the integration layer ADR-0011 deferred. The untested seams split in two: the **webview DOM seams** — the CodeMirror 6 editor (`createEditor`) and the markdown-it preview (`createPreviewRenderer`), both of which need a real DOM — and the **Extension Host lifecycle** (custom-editor resolve / `init` / `ready` handshake, edit round-trip updating dirty state), which needs a running VS Code. [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §11 left open whether to pull everything through `@vscode/test-electron` or stand up a lighter DOM harness for the webview-only seams. The highest-value, currently-untested guarantees are webview-side: the CM6 `RemoteSync` echo path (host content must not round-trip as an `edit`) and the preview's incremental DOM patching (only changed blocks are replaced).

### Decision
1. **Test the webview DOM seams with jsdom on the existing `node:test` runner.** A new `esbuild.integration.js` mirrors the unit build (ADR-0011) — discover `test/integration/**/*.test.ts`, bundle to one CommonJS file (`dist-test/integration.cjs`), alias `vscode` → the mock — but imports `test/integration/_setup/dom.ts` **first**, which installs jsdom globals (`window`, `document`, `requestAnimationFrame`, MutationObserver, a no-op `ResizeObserver`, …) before any source module — and therefore CodeMirror — is evaluated. `npm run test:integration` builds and runs it; `npm test` now runs type-check + unit + integration.
2. **One new dev dependency: `jsdom` (+ `@types/jsdom`).** No new test framework, no Mocha/glob — the runner stays `node:test`, consistent with ADR-0005 and ADR-0011.
3. **Defer the real Extension Host lifecycle to a follow-up (`@vscode/test-electron`, T-113b).** jsdom cannot exercise the genuine custom-editor resolve/save/revert lifecycle; that smaller, heavier slice is split off so it does not block — or bloat — the high-value webview coverage.

### Alternatives Considered
1. **`@vscode/test-electron` for everything now** — Rejected as the *primary* harness: it downloads a full VS Code, launches a GUI session, and pulls in Mocha + glob; it is slow, awkward to run headless, and CodeMirror still needs a DOM *inside* that host. Kept as the right tool for the lifecycle slice (T-113b).
2. **A separate DOM framework (jest-environment-jsdom, Vitest jsdom)** — Rejected: a new test framework duplicates what `node:test` already runs; ADR-0011's minimalism still holds.
3. **Hand-rolled DOM stubs instead of jsdom** — Rejected: CodeMirror touches enough of the DOM (ranges, mutation observers, computed style) that a bespoke stub would be larger and more brittle than the well-maintained jsdom.
4. **Fold the integration tests into the unit bundle** — Rejected: jsdom setup and CM6 evaluation would slow the millisecond unit path and pull DOM globals into pure-logic tests. A separate bundle/run keeps the unit layer fast and DOM-free.

### Reasoning
The seams that were genuinely unreachable from the unit layer are DOM-bound, not host-bound, so a DOM harness buys the most coverage per unit of complexity. Reusing esbuild (ADR-0006) and `node:test` (ADR-0011) keeps the harness a near-copy of the proven unit build, and a single dependency (`jsdom`) preserves the lean dependency list. Splitting the Extension Host lifecycle into its own follow-up matches the project's incremental, document-as-you-go workflow and keeps each harness focused.

### Consequences
**Positive:** `npm run test:integration` covers the CM6 echo guard, minimal-diff cursor preservation, and the preview's incremental node-identity patching — all previously untested — in a fast, headless run. The build mirrors the unit harness, so there is little new to learn.
**Negative / Trade-offs:** jsdom does no real layout, so pixel-measurement behaviour (scroll-sync geometry, CM6 viewport measurement) is **not** asserted here — it remains manual-matrix / future-`test-electron` territory. One new dev dependency. The integration bundle is large (~4.5 MB, CodeMirror + jsdom) but is a git-ignored artifact.
**Neutral:** A new build script (`esbuild.integration.js`), a `test/integration/` tree with a `_setup/dom.ts`, and the unit build now skips `test/integration/`.

### Compliance Impact
Upholds ADR-0005 (no new framework — `jsdom` is a DOM, not a test framework) and ADR-0006 (esbuild remains the one bundler). No non-negotiable rule is bent.

### Migration Plan
Not a migration. New files: `esbuild.integration.js`, `test/integration/_setup/dom.ts`, `test/integration/createEditor.test.ts`, `test/integration/previewRenderer.test.ts`. New `package.json` script `test:integration`; `test` extended to run it. New dev dependencies `jsdom` + `@types/jsdom`. `dist-test/` already git-ignored.

### Follow-Ups
* **T-113b — Extension Host lifecycle tests** on `@vscode/test-electron`: resolve builds the webview once, the `init`/`ready` handshake, an `edit` round-trip updating dirty state, and save/revert reconciliation.
* Wire `npm test` (now incl. integration) into CI (T-120).

### References
* [ADR-0011](#adr-0011-unit-test-harness-on-nodes-built-in-runner-with-an-esbuild-bundled-vscode-mock)
* [ADR-0005](#adr-0005-vanilla-typescript-html-css--no-frameworks)
* [ADR-0006](#adr-0006-bundle-with-esbuild)
* [TESTING.md](TESTING.md)
* [TODO.md](TODO.md) — T-113, T-113b
* jsdom documentation

---

## ADR-0013: Extension Host lifecycle tests on `@vscode/test-electron` with a minimal in-host runner

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-113b** lands the slice ADR-0012 deferred: the genuine Custom Editor lifecycle that neither the unit layer (T-112, mocked `vscode`) nor the jsdom integration layer (T-113, no running VS Code) can reach. Resolving the custom editor, the native document lifecycle (dirty / save / revert) `MarkStudioEditorProvider` leans on (ADR-0001), and the host's reconciliation behaviour are only observable inside a real Extension Host. [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §11 left open whether to pair `@vscode/test-electron` with Mocha (its usual companion) or a thinner in-host runner.

### Decision
1. **Boot a real VS Code with `@vscode/test-electron`.** A launcher (`test/exthost/runTests.ts`) runs in a plain Node process and calls `runTests` with this repository as the `extensionDevelopmentPath` and the bundled in-host suite as the `extensionTestsPath`, opening a fresh temp workspace + user-data dir (`--disable-extensions`, `--disable-workspace-trust`) so the run is hermetic.
2. **Use a minimal in-host runner, not Mocha.** `test/exthost/harness.ts` is a tiny registry + sequential runner over `node:assert`; `test/exthost/index.ts` exports the `run(): Promise<void>` `@vscode/test-electron` invokes inside the host and rejects if any test fails. No Mocha, no glob — consistent with ADR-0005 / ADR-0011 minimalism.
3. **Two esbuild bundles with different externals (`esbuild.exthost.js`).** The launcher bundle keeps `@vscode/test-electron` external (it downloads/spawns VS Code via dynamic requires); the in-host suite bundle keeps `vscode` external (the host injects it) and is **never** aliased to the mock, unlike the unit / integration builds.
4. **Keep `test:exthost` out of the default `test` script.** It is a separate `npm run test:exthost` (build → bundle → launch) because it downloads a full VS Code and is far heavier than the millisecond unit/integration runs; CI (T-120) can opt into it explicitly.
5. **Assert only host-observable behaviour.** A custom editor's webview runs in an isolated iframe with no public introspection API, so the suite verifies the document-facing contract (activation, resolve-without-error, edit → dirty → save → clean, revert → restored) rather than reaching into the webview DOM — that remains the jsdom layer's job (T-113).

### Alternatives Considered
1. **Mocha inside the host (the `@vscode/test-electron` default)** — Rejected: pulls in Mocha + glob for a handful of sequential lifecycle tests; the minimal registry/runner is a few dozen lines and adds no dependency.
2. **Fold the lifecycle tests into the jsdom integration layer** — Rejected (and already rejected in ADR-0012): jsdom is not a VS Code; the custom-editor resolve/save/revert lifecycle simply does not exist there.
3. **Drive the webview iframe from the test (assert the `init`/`ready` handshake by reading webview state)** — Rejected: there is no public API to introspect a custom editor's webview from extension/test code; attempting it would require test-only hooks in app code, which we will not add.
4. **Add `test:exthost` to the default `test` script** — Rejected: a full VS Code download on every `npm test` would wreck the fast-feedback loop; the heavy layer stays opt-in.

### Reasoning
The only untested surface left after T-112/T-113 is the real custom-editor lifecycle, and `@vscode/test-electron` is the standard, supported way to exercise it. A minimal in-host runner keeps the dependency list lean (the one new dev dependency is `@vscode/test-electron` itself) and mirrors the shape of the existing harnesses (esbuild discover/bundle → run). Asserting host-observable behaviour keeps the tests honest about what a custom editor actually exposes and avoids brittle, unsupported webview introspection.

### Consequences
**Positive:** `npm run test:exthost` boots a real Extension Host and verifies activation, custom-editor resolution, and the native dirty/save/revert lifecycle — the last major untested seam. Makes a meaningful CI run (T-120) possible.
**Negative / Trade-offs:** One new dev dependency (`@vscode/test-electron`) and a ~280 MB VS Code download on first run (cached thereafter). The webview iframe internals (the `init`/`ready` handshake, focus, scroll geometry) are still not asserted programmatically — they remain manual-matrix territory. The layer is slow, so it is deliberately excluded from the default `test`.
**Neutral:** A new build script (`esbuild.exthost.js`) producing two bundles, a `test/exthost/` tree (`runTests.ts`, `index.ts`, `harness.ts`, `suite/`), and the unit build now skips `test/exthost/` as well as `test/integration/`.

### Compliance Impact
Upholds ADR-0005 (no test framework added — `@vscode/test-electron` is a test *host launcher*, and the in-host runner is hand-rolled) and ADR-0006 (esbuild remains the one bundler). Reinforces ADR-0001 by pinning the native document lifecycle under test. No non-negotiable rule is bent.

### Migration Plan
Not a migration. New files: `esbuild.exthost.js`, `test/exthost/runTests.ts`, `test/exthost/index.ts`, `test/exthost/harness.ts`, `test/exthost/suite/lifecycle.test.ts`. New `package.json` script `test:exthost`; new dev dependency `@vscode/test-electron`. The unit build (`esbuild.test.js`) now skips `test/exthost/`. `dist-test/` is already git-ignored; the cached VS Code download lives under `.vscode-test/` (should be git-ignored).

### Follow-Ups
* Wire `test:exthost` into CI (T-120) on a runner that can download/headless-launch VS Code (e.g. `xvfb` on Linux).
* As webview-driving test affordances become available (or via opt-in test hooks), extend coverage to the `init`/`ready` handshake and external-change reconciliation end-to-end.
* Surface inbound `error` / `applyEdit` / `StateStore.update` failures as `vscode.window.showErrorMessage`; a regression test pairs naturally with this layer.

### References
* [ADR-0012](#adr-0012-integration-test-harness-jsdom-on-nodetest-for-the-webview-dom-seams)
* [ADR-0011](#adr-0011-unit-test-harness-on-nodes-built-in-runner-with-an-esbuild-bundled-vscode-mock)
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0005](#adr-0005-vanilla-typescript-html-css--no-frameworks)
* [TESTING.md](TESTING.md)
* [TODO.md](TODO.md) — T-113b, T-120
* `@vscode/test-electron` documentation

