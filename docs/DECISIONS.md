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
| [0014](#adr-0014-document-outline-as-a-host-side-treedataprovider) | Document outline as a host-side `TreeDataProvider` | Accepted |
| [0015](#adr-0015-katex-for-math-rendering-in-the-preview) | KaTeX for math rendering in the preview | Accepted |
| [0016](#adr-0016-lazy-loaded-mermaid-for-diagram-rendering-in-the-preview) | Lazy-loaded Mermaid for diagram rendering in the preview | Accepted |
| [0017](#adr-0017-callouts-as-a-dependency-free-markdown-it-core-rule) | Callouts as a dependency-free markdown-it core rule | Accepted |
| [0018](#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule) | Wiki links as a dependency-free markdown-it inline rule | Accepted |
| [0019](#adr-0019-footnotes--gfm-completeness-plugin-for-footnotes-built-ins--an-in-tree-rule-for-the-rest) | Footnotes & GFM completeness: plugin for footnotes, built-ins + an in-tree rule for the rest | Accepted |
| [0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher) | Host-side link index with a case-insensitive basename resolver behind a `FileSystemWatcher` | Accepted |
| [0021](#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message) | In-preview wiki-link navigation via a shared host-side resolver and an `openWikiLink` message | Accepted (amended 2026-06-30, extended 2026-06-30) |
| [0022](#adr-0022-hover-preview-for-wiki-links-host-ships-markdown-text-webview-renders-it) | Hover preview for wiki-links: host ships Markdown text, webview renders it | Accepted |
| [0023](#adr-0023-graph-view-host-side-pure-model--lazy-webview-canvas-zero-new-runtime-deps) | Graph view: host-side pure model + lazy webview canvas, zero new runtime deps | Accepted |
| [0024](#adr-0024-markdown-link-backlinks-and-heading-level-promotion-via-additive-widening-of-the-link-index) | Markdown-link backlinks and heading-level promotion via additive widening of the link index | Accepted |
| [0025](#adr-0025-templates-engine-in-tree-front-matter--variable-expansion-native-quickpick-zero-new-deps) | Templates engine: in-tree front-matter + variable expansion, native QuickPick, zero new deps | Accepted |

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

---

## ADR-0014: Document outline as a host-side `TreeDataProvider`

### Status
`Accepted`

### Date
2026-06-27

### Context
Phase 2 milestone M2.2 (T-2.2) calls for a navigable heading outline that updates as headings change. VS Code already ships an **Outline** view and breadcrumbs, but both are driven by `vscode.window.activeTextEditor`, which is `undefined` while a custom editor is focused. MarkStudio's document is a real `TextDocument`, yet a plain `DocumentSymbolProvider` never surfaces for it because the Outline view has no "active text editor" to attach to. The outline therefore needs a surface MarkStudio owns. [TODO.md](TODO.md) framed the open choice as: a host-side `TreeDataProvider` in a view container, or an in-webview outline pane.

### Decision
1. **Provide the outline as a host-side `vscode.TreeDataProvider`** backed by a dedicated tree view (`markstudio.outline`, contributed to the Explorer container, visible only when `activeCustomEditorId == 'markstudio.editor'`). It follows the active MarkStudio editor through `MarkStudioEditorProvider.onDidChangeActiveDocument` (the same event the word-count indicator uses, T-2.4) and rebuilds on edits via a debounced `onDidChangeTextDocument`.
2. **Parse headings host-side** with a pure, dependency-free scanner (`src/outline/headings.ts`: `parseHeadings` + `buildHeadingTree`) over the `TextDocument` the provider already owns — not via the webview's markdown-it tokeniser. The scanner handles ATX and setext headings and skips fenced code blocks and leading YAML front matter.
3. **Navigate via one host → webview message.** Clicking a heading runs the internal `markstudio.outline.reveal` command, which calls `MarkStudioEditorController.revealLine(line)` → posts `revealLine { line }`. The webview promotes `preview-only` to `split` if needed, then `createEditor.revealLine` clamps the 0-based line to the document, places the cursor at its start (`EditorSelection.cursor`), and scrolls it into view (`EditorView.scrollIntoView`).

### Alternatives Considered
1. **A `DocumentSymbolProvider`** — Rejected: does not surface for custom editors (the core problem); it would require a focused text editor that does not exist for MarkStudio.
2. **An in-webview outline pane** — Rejected: duplicates UI VS Code already provides natively, adds a third pane and its layout/state to the App Shell, and conflicts with "less UI is better" and "native beats custom" ([.ai/CONTEXT.md](../.ai/CONTEXT.md)). A native tree view gives free theming, keyboard navigation, and collapse/expand.
3. **Deriving headings from the webview's markdown-it tokeniser (T-105)** — Rejected: the tokeniser lives in the webview, so it would require a round-trip and couple the outline to the preview. A small host-side scanner is decoupled, needs no message to build, and is trivially unit-testable.

### Reasoning
A native `TreeView` reads as a first-party VS Code surface and inherits its theming, accessibility, and navigation for free — directly serving "feel native" ([ARCHITECTURE.md](ARCHITECTURE.md) §1) and "prefer VS Code integration; less UI is better." Parsing host-side keeps the pure logic isolated and well-tested (16 unit tests) and avoids a webview dependency. Navigation reuses the established controller + typed-message seam (T-106/T-108), so no new architectural surface is introduced beyond one message.

### Consequences
**Positive:** A navigable outline that follows the active MarkStudio editor and updates as headings change, with native chrome and no custom webview UI. The heading scanner is pure and fully unit-tested. Navigation reuses the existing message bus.
**Negative / Trade-offs:** The outline shows the raw source text of a heading (inline Markdown such as `**bold**` is not stripped). The view follows only the **active** MarkStudio editor (consistent with the rest of the extension). The host-side scanner is a second, smaller Markdown parser alongside markdown-it — intentional, to keep the outline decoupled.
**Neutral:** A new `src/outline/` module (`headings.ts`, `OutlineTreeProvider.ts`, `registerOutline.ts`), one new view contribution, one internal command, and one new host → webview message. Host bundle grows to ~11.8 KB (production-minified); the webview gains only the `revealLine` handler (~701.8 KB, ≈ unchanged).

### Compliance Impact
No rule bent. Upholds ADR-0001 (the outline reads the managed `TextDocument`), ADR-0002 (navigation is a `postMessage`, the webview is never rebuilt), ADR-0004 (native theming via the tree view), and ADR-0005 (no framework — vanilla host code and a pure scanner).

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings)
* [design/outline.md](design/outline.md)
* [api/message-protocol.md](api/message-protocol.md)
* [ROADMAP.md](ROADMAP.md) — Phase 2 M2.2
* [TODO.md](TODO.md) — T-2.2


---

## ADR-0015: KaTeX for math rendering in the preview

### Status
`Accepted`

### Date
2026-06-27

### Context
Phase 3 milestone M3.1 (T-3.1) calls for inline (`$�$`) and block (`$$�$$`) math rendering in the preview. It must attach to the existing markdown-it pipeline, be **individually toggleable** via configuration, and **degrade gracefully** when disabled (the delimiters must never break rendering). [AGENT_HANDOFF.md](AGENT_HANDOFF.md) �11 framed the open choice as KaTeX vs. MathJax vs. a lighter option, to be weighed on bundle size, licensing, and fidelity.

### Decision
1. **Render math with KaTeX** via the `@vscode/markdown-it-katex` plugin � the same plugin VS Code's built-in Markdown math uses. KaTeX (`katex`) renders TeX to HTML + CSS synchronously. Both are MIT-licensed.
2. **Gate the plugin behind a new setting** `markstudio.preview.math` (boolean, default `true`, `resource` scope), threaded through the existing `MarkStudioConfig` + `configChanged` seam (T-111). `PreviewRenderer` gains a `setConfig(config)` that **rebuilds** the markdown-it instance (with or without the plugin) when the `math` flag flips and re-renders the last text � markdown-it plugins cannot be cleanly detached, so a rebuild on the rare settings event is the clean path; the hot typing path keeps a single instance (ADR-0008).
3. **Ship KaTeX assets locally.** `esbuild.js` copies `katex.min.css` and its `fonts/` directory into `dist/katex/`; `webviewHtml.ts` loads the stylesheet via `asWebviewUri`. The fonts resolve next to the CSS and are served under the existing `font-src ${webview.cspSource}` CSP rule (same pattern as Codicons, ADR/T-107).

### Alternatives Considered
1. **MathJax** � Rejected: heavier and asynchronous, with a larger bundle; the marginal fidelity gain does not justify the size and async complexity in a preview pane.
2. **A hand-rolled TeX parser** � Rejected outright: re-implementing TeX layout is out of scope and would never match KaTeX.
3. **Lazy-loading KaTeX only when `math` is on** � Deferred: dynamic script injection complicates the CSP/nonce model. The toggle controls *rendering*, not bundling; the library is always bundled.

### Reasoning
KaTeX is fast, synchronous (fits the existing block-diff render loop), small relative to MathJax, and the VS Code plugin gives robust `$`/`$$` delimiter parsing for free. Configuring the plugin with `throwOnError: false` means a malformed expression renders in KaTeX's error color instead of throwing, so a typo can never break the whole preview. Reusing the `MarkStudioConfig` + `configChanged` seam means the toggle needs no new message type.

### Consequences
**Positive:** Native-looking inline and block math, individually toggleable, that degrades to literal text when off. No new message type. Fonts are local (no remote fetch).
**Negative / Trade-offs:** KaTeX is always bundled even when math is disabled � the production-minified webview grows from ~701.8 KB to **~971.9 KB** (+~270 KB). The `fonts/` directory (60 font files) ships in `dist/katex/`. Toggling the setting rebuilds the markdown-it instance and forces one full re-render (acceptable: a settings event, not a keystroke).
**Neutral:** Two new runtime dependencies (`katex`, `@vscode/markdown-it-katex`) and one dev dependency (`@types/katex`); a new `markstudio.preview.math` setting; the `math` field on `MarkStudioConfig`.

### Compliance Impact
No rule bent. Upholds ADR-0002 (the preview is patched, never rebuilt, on the hot path; the webview is never reloaded), ADR-0003/0008 (markdown-it plugin seam for preview rendering), ADR-0004 (KaTeX CSS theming + local fonts under the existing CSP), and ADR-0005 (no UI framework � a markdown-it plugin, not a component library). The dependency additions are justified here per the dependency-policy spirit of the foundational ADRs.

### References
* [ADR-0003](#adr-0003-codemirror-6-for-editing-markdown-it-for-preview)
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings)
* [design/math.md](design/math.md)
* [ROADMAP.md](ROADMAP.md) � Phase 3 M3.1


---

## ADR-0016: Lazy-loaded Mermaid for diagram rendering in the preview

### Status
`Accepted`

### Date
2026-06-27

### Context
Phase 3 milestone M3.2 (T-3.2) calls for rendering fenced ```mermaid blocks as diagrams in the preview. Like math (ADR-0015), it must attach to the existing markdown-it pipeline, be **individually toggleable** via configuration, and **degrade gracefully** when disabled. Unlike KaTeX, Mermaid is **large** (~3.3 MB minified) and renders **asynchronously** (its `render` returns a Promise). [AGENT_HANDOFF.md](AGENT_HANDOFF.md) §10–11 flagged the open question: bundle Mermaid unconditionally (as KaTeX is) or lazy-load it, and to capture the choice in an ADR.

### Decision
1. **Render diagrams with Mermaid**, lazy-loaded **on first use**. Mermaid ships as a **separate esbuild bundle** (`dist/mermaid.js`, built from `src/webview/preview/mermaidEntry.ts`) that is **not** part of the main webview bundle. The first time the preview renders a ```mermaid block, `src/webview/preview/mermaid.ts` injects a `<script>` — carrying the page nonce — that publishes the Mermaid API on a global; every later diagram reuses it.
2. **Override the fence renderer** so a ```mermaid block emits a placeholder `<div class="markstudio-mermaid">` holding the escaped source instead of a `<pre><code>`. After the existing block-diff `patch`, an async pass (`renderMermaidBlocks`) replaces each unrendered container's contents with the rendered SVG. Because the placeholder HTML encodes the source, an edit to a diagram changes the cached block HTML and `patch` swaps in a fresh, unrendered container; an unchanged diagram keeps its node (and its already-rendered SVG), so typing elsewhere never redraws it.
3. **Gate the feature behind a new setting** `markstudio.preview.mermaid` (boolean, default `true`, `resource` scope), threaded through the existing `MarkStudioConfig` + `configChanged` seam (T-111). `PreviewRenderer.setConfig` rebuilds the markdown-it instance when the `mermaid` (or `math`) flag flips — the same rare-settings-event path as ADR-0015. When off, the fence falls through to markdown-it's default renderer (a plain code block), so nothing breaks.

### Alternatives Considered
1. **Bundle Mermaid unconditionally** (as KaTeX is, ADR-0015) — Rejected: Mermaid is ~3.3 MB minified, more than 3× the entire current webview bundle. Always paying that download for the majority of documents that contain no diagrams is unacceptable; the off-path-feature cost should be deferred.
2. **esbuild code splitting** (dynamic `import()` chunks) — Rejected: code splitting requires `format: "esm"`, which would convert the webview to a module and complicate the nonce/CSP load path. A separate IIFE bundle injected with the page nonce is simpler and needs no CSP change (a nonce-bearing `<script>` is allowed regardless of its `src`).
3. **Render diagrams synchronously inside the block diff** — Not possible: Mermaid's `render` is asynchronous. The fire-and-forget post-`patch` pass keeps the hot render path synchronous.

### Reasoning
Lazy loading keeps the base webview bundle essentially unchanged (**~971.9 KB → ~974.3 KB**, +~2.4 KB for the loader) while Mermaid lives in its own **~3.3 MB** bundle fetched only when a diagram is first seen. A nonce-bearing injected `<script>` satisfies the strict `script-src 'nonce-…'` CSP without exposing the nonce or relaxing the policy; Mermaid runs with `securityLevel: "strict"` (DOMPurify, no raw HTML). A diagram parse error is shown only in that diagram's box, and a library-load failure leaves the raw source visible — so rendering never breaks.

### Consequences
**Positive:** Native-looking diagrams, individually toggleable, that degrade to a code block when off and never bloat the base download. No new message type. No CSP change.
**Negative / Trade-offs:** Mermaid rendering is asynchronous, so a diagram appears a frame after its surrounding text (acceptable for a preview). The Mermaid theme is detected once at load from the VS Code body classes; a live theme switch does not re-theme already-rendered diagrams until the next edit (tracked as minor debt). Mermaid's actual in-webview rendering cannot be asserted under the jsdom test harness, so it stays in the manual EDH matrix — the integration tests cover the markdown-it seam (placeholder emission, code-block fallback, live toggle).
**Neutral:** One new runtime dependency (`mermaid`); a new `markstudio.preview.mermaid` setting; the `mermaid` field on `MarkStudioConfig`; a third esbuild build target.

### Compliance Impact
No rule bent. Upholds ADR-0002 (the preview is patched, never rebuilt, on the hot path; the webview is never reloaded), ADR-0003/0008 (markdown-it seam for preview rendering), ADR-0004 (strict CSP preserved; the injected script reuses the existing nonce), and ADR-0005 (no UI framework — a markdown-it fence override plus a vanilla loader). The dependency addition is justified here per the dependency-policy spirit of the foundational ADRs.

### References
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings)
* [ADR-0015](#adr-0015-katex-for-math-rendering-in-the-preview)
* [design/mermaid.md](design/mermaid.md)
* [ROADMAP.md](ROADMAP.md) — Phase 3 M3.2
* [TODO.md](TODO.md) — T-3.2

---

## ADR-0017: Callouts as a dependency-free markdown-it core rule

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-3.3** (Phase 3 M3.3) adds GitHub-style callout / admonition blocks — a blockquote whose first line is a `[!TYPE]` marker (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!CAUTION]`). They must attach to the existing markdown-it preview, be individually toggleable via `markstudio.preview.callouts`, degrade to an ordinary blockquote when off, and theme entirely via `--vscode-*` variables. Unlike math (ADR-0015) and Mermaid (ADR-0016), callouts are pure markup — no rendering engine is required.

### Decision
1. **No new dependency.** The transform is implemented inline as a small markdown-it **core rule** (`src/webview/preview/callouts.ts`, `applyCallouts(md)`), registered only when the setting is on.
2. **Post-process the token stream.** After the built-in blockquote parser runs, the rule finds a `blockquote_open` whose first paragraph's first line matches `^\s*\[!(TYPE)\]\s*(title?)$` for a known type. It rewrites the `blockquote_open`/`blockquote_close` tags to `div`, stamps `class="markstudio-callout markstudio-callout-<type>"`, injects an `html_block` title token (Codicon icon + escaped label/custom title), and strips the marker line from the body (re-parsing the remaining inline content, or dropping the marker-only paragraph).
3. **Toggle reuses the config seam (T-111).** `MarkStudioConfig` gains a `callouts` field (validated by `isMarkStudioConfig`); `ConfigurationService.read` resolves `preview.callouts` (default `true`); `package.json` contributes the `resource`-scoped setting. `PreviewRenderer.createMarkdownIt(math, mermaid, callouts)` applies the rule when on, and `setConfig` rebuilds the instance when `callouts` flips (alongside `math`/`mermaid`). No new message type.
4. **Theme via `--vscode-*` only.** Each type sets one `--markstudio-callout-accent` variable from a VS Code theme variable (charts/editor colours, with fallbacks); the border, icon, and title derive from it. Icons reuse the Codicons font already loaded in the webview (T-107).

### Alternatives Considered
1. **An npm callout plugin** (e.g. `markdown-it-github-alerts`) — Rejected: a dependency for ~80 lines of well-scoped logic, against the dependency-policy ADRs.
2. **Override only the `blockquote_open` renderer** — Rejected: the renderer cannot see/strip the inline marker or inject the title node cleanly.
3. **A block-level rule replacing the blockquote parser** — Rejected: far more invasive than post-processing the already-parsed tokens, and risks regressing ordinary blockquotes.

### Reasoning
"Native beats custom" and the lean dependency list (ADR-0005) point straight at an inline rule. Post-processing the token stream mirrors the fence-override pattern T-3.2 already established, keeps ordinary blockquotes untouched, and is fully exercisable through the existing jsdom integration harness. The `html_block` title injection emits trusted, escaped markup without enabling raw HTML (`html: false`) anywhere else.

### Consequences
**Positive:** Native-looking callouts, individually toggleable, that degrade to a blockquote when off — with **no new dependency** and **no bundle bloat** (production-minified webview **~974.3 KB → ~977.7 KB**, +~3.4 KB for the rule + CSS). No new message type, no CSP change.
**Negative / Trade-offs:** The marker syntax/type list is hard-coded in the rule (extending it is a code change). The visual theming cannot be asserted under jsdom, so it stays in the manual EDH matrix — the integration tests cover the markdown-it seam (styled markup when on, plain-blockquote fallback when off, ordinary blockquote untouched, live toggle).
**Neutral:** A new `markstudio.preview.callouts` setting; the `callouts` field on `MarkStudioConfig`; a new `src/webview/preview/callouts.ts` module.

### Compliance Impact
No rule bent. Upholds ADR-0002 (preview patched, never rebuilt, on the hot path), ADR-0003/0008 (markdown-it seam for preview rendering), ADR-0004 (strict CSP, `--vscode-*` theming), and ADR-0005 (no UI framework, no new dependency).

### References
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings)
* [ADR-0015](#adr-0015-katex-for-math-rendering-in-the-preview)
* [ADR-0016](#adr-0016-lazy-loaded-mermaid-for-diagram-rendering-in-the-preview)
* [design/callouts.md](design/callouts.md)
* [ROADMAP.md](ROADMAP.md) — Phase 3 M3.3
* [TODO.md](TODO.md) — T-3.3

---

## ADR-0018: Wiki links as a dependency-free markdown-it inline rule

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-3.4** (Phase 3 M3.4) adds wiki-style links — an inline `[[target]]` reference, optionally with an alias (`[[target|alias]]`) and/or a heading anchor (`[[target#heading]]`). They must attach to the existing markdown-it preview, be individually toggleable via `markstudio.preview.wikiLinks`, degrade to literal `[[…]]` text when off, and theme entirely via `--vscode-*` variables. Like callouts (ADR-0017), wiki links are pure markup — no rendering engine is required. Resolution to actual files is deferred to **Phase 4**; v1 styles the link and carries its target/heading as `data-*` attributes.

### Decision
1. **No new dependency.** The transform is implemented inline as a small markdown-it **inline rule** (`src/webview/preview/wikiLinks.ts`, `applyWikiLinks(md)`), registered only when the setting is on.
2. **Register before the built-in `link` rule.** `md.inline.ruler.before("link", "markstudio_wikilink", …)` claims a `[[` opener before markdown-it's ordinary `[link](url)` parser sees it. The rule scans to the closing `]]`, rejects anything containing a newline or a nested `[`/`]` (so ordinary link syntax is never swallowed), parses the target / alias / heading, and pushes a `wikilink_open` (`a`) token carrying `class="markstudio-wikilink"`, `data-wikilink-target`, an optional `data-wikilink-heading`, and a `title` tooltip, a `text` token for the display label, and a `wikilink_close`. A single `[` falls straight through to the built-in rule.
3. **Toggle reuses the config seam (T-111).** `MarkStudioConfig` gains a `wikiLinks` field (validated by `isMarkStudioConfig`); `ConfigurationService.read` resolves `preview.wikiLinks` (default `true`); `package.json` contributes the `resource`-scoped setting. `PreviewRenderer.createMarkdownIt(math, mermaid, callouts, wikiLinks)` applies the rule when on, and `setConfig` rebuilds the instance when any preview flag flips. No new message type.
4. **Resolution deferred to Phase 4.** The anchor has no `href` and does not navigate yet; it is styled (link colour + dashed underline) and carries its target/heading for a later click handler.

### Alternatives Considered
1. **An npm wiki-link plugin** (e.g. `markdown-it-wikilinks`) — Rejected: a dependency for ~60 lines of well-scoped logic, against the dependency-policy ADRs, and most plugins hard-code a URL resolver we do not want until Phase 4.
2. **A core rule post-processing the token stream** (as callouts do) — Rejected: wiki links are *inline*, so an inline rule is the idiomatic, lower-risk seam and never re-tokenises paragraphs.
3. **Override the default `link` renderer** — Rejected: the link rule never produces a token for `[[…]]`, so there is nothing to override; the opener must be claimed during inline parsing.

### Reasoning
"Native beats custom" and the lean dependency list (ADR-0005) point straight at an inline rule. Registering before the `link` rule is the idiomatic markdown-it seam for new inline syntax, leaves ordinary links untouched, and is fully exercisable through the existing jsdom integration harness. Carrying the target as `data-*` keeps v1 dependency-free and forward-compatible with the Phase 4 resolver.

### Consequences
**Positive:** Native-looking wiki links, individually toggleable, that degrade to literal text when off — with **no new dependency** and **no meaningful bundle growth** (+~a few KB for the rule + CSS). No new message type, no CSP change.
**Negative / Trade-offs:** The links do not yet navigate (Phase 4). The syntax (target / `#heading` / `|alias`) is fixed in the rule (extending it is a code change). The visual theming cannot be asserted under jsdom, so it stays in the manual EDH matrix — the integration tests cover the markdown-it seam (styled anchor with target when on, alias display, captured heading, literal-text fallback when off, ordinary `[link](url)` untouched, live toggle).
**Neutral:** A new `markstudio.preview.wikiLinks` setting; the `wikiLinks` field on `MarkStudioConfig`; a new `src/webview/preview/wikiLinks.ts` module.

### Compliance Impact
No rule bent. Upholds ADR-0002 (preview patched, never rebuilt, on the hot path), ADR-0003/0008 (markdown-it seam for preview rendering), ADR-0004 (strict CSP, `--vscode-*` theming), and ADR-0005 (no UI framework, no new dependency).

### References
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0010](#adr-0010-reactive-configuration-service-with-cm6-compartments-for-live-settings)
* [ADR-0017](#adr-0017-callouts-as-a-dependency-free-markdown-it-core-rule)
* [design/wiki-links.md](design/wiki-links.md)
* [ROADMAP.md](ROADMAP.md) — Phase 3 M3.4
* [TODO.md](TODO.md) — T-3.4

---

## ADR-0019: Footnotes & GFM completeness: plugin for footnotes, built-ins + an in-tree rule for the rest

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-3.5** (Phase 3 M3.5) closes Phase 3 by adding four Markdown features to the preview: **footnotes** (`[^1]` references + `[^1]:` definitions), **GFM task lists** (`- [ ]` / `- [x]`), **GFM tables**, and **strikethrough** (`~~text~~`). Each must attach to the existing markdown-it preview, be **individually** toggleable via a `markstudio.preview.*` setting (default `true`, `resource` scope), degrade gracefully when off, and theme entirely via `--vscode-*` variables. The Producer decided against a single combined `gfm` toggle so each feature stays independently controllable. The open design question was, per feature: pull an npm plugin, or implement in-tree?

### Decision
A **per-feature** sourcing decision, not one blanket policy:

1. **Tables & strikethrough — use markdown-it's built-ins; toggle the rulers.** markdown-it's *default* preset already ships GFM tables (`table` block rule) and strikethrough (`strikethrough` inline rule), so they render today with **no dependency**. The toggle simply calls `md.disable("table")` / `md.disable("strikethrough")` when the user turns the feature off, degrading to plain paragraphs / literal `~~` text. Adding a plugin for syntax markdown-it already parses would be pure waste.
2. **Task lists — a dependency-free in-tree core rule** (`src/webview/preview/taskLists.ts`, `applyTaskLists(md)`), mirroring callouts (ADR-0017) and wiki links (ADR-0018). Registered `after("inline")`, it finds a list item whose first paragraph opens with `[ ]` / `[x]` / `[X]`, prepends a **disabled** `html_inline` checkbox, strips the marker, and stamps `markstudio-task-list` / `markstudio-task-list-item` classes so the bullet can be removed in CSS. The logic is ~30 lines (the well-known `markdown-it-task-lists` plugin is the same algorithm) and stays fully under our control — and crucially, checkboxes are rendered **read-only** this sprint (no source write-back), which a stock plugin's label-wrapper / write-back affordances would only get in the way of.
3. **Footnotes — the one new runtime dependency, `markdown-it-footnote`.** Footnotes are genuinely non-trivial: a two-pass parse (collect refs inline, then append a numbered, back-linked definitions section as a `footnote_tail` core rule), correct numbering, and `id`/`href` anchoring. Re-implementing that in-tree would be a meaningful surface to own and get wrong. `markdown-it-footnote` is the canonical, ~11 KB, zero-transitive-dependency plugin maintained by the markdown-it org itself; it is applied with `md.use(markdownItFootnote)` only when the setting is on. Its default class names (`footnote-ref`, `footnote-backref`, `footnotes`, `footnotes-sep`, `footnotes-list`, `footnote-item`) are themed via `--vscode-*` in `main.ts`.
4. **All four reuse the config seam (T-111).** `MarkStudioConfig` gains `footnotes` / `taskLists` / `tables` / `strikethrough` (validated by `isMarkStudioConfig`); `ConfigurationService.read` resolves each `preview.*` key (default `true`); `package.json` contributes the four `resource`-scoped settings. `PreviewRenderer.createMarkdownIt(...)` applies/enables each when on, and `setConfig` rebuilds the single markdown-it instance when **any** preview flag flips (ADR-0008) — one instance stays on the hot typing path. No new message type.

### Alternatives Considered
1. **A single combined `markstudio.preview.gfm` toggle** — Rejected by the Producer: the four features have different value and risk profiles (tables/strikethrough are universally wanted; footnotes/task lists less so), so independent control is worth four small settings.
2. **An npm plugin for tables / strikethrough** (e.g. forcing `markdown-it-gfm`-style packages) — Rejected: markdown-it already parses both; a dependency would add bytes for zero capability.
3. **An npm plugin for task lists** (`markdown-it-task-lists`) — Rejected (narrowly): the algorithm is ~30 lines, we want read-only checkboxes with no write-back affordances this sprint, and keeping it in-tree matches the callouts/wiki-links precedent. Revisit if interactive toggling (Phase 4) makes a maintained plugin clearly cheaper.
4. **An in-tree footnote rule** — Rejected: footnotes' two-pass numbering/back-linking is exactly the kind of non-trivial, easy-to-get-wrong parsing where a canonical, tiny, same-org plugin beats owning the code.

### Reasoning
The dependency policy (ADR-0005) is "lean, not zero": add a dependency when it buys real, non-trivial capability, and write in-tree when the logic is small and we want control. Applied per feature that yields exactly one new runtime dependency (`markdown-it-footnote`) for the one genuinely hard feature, and no new dependency for the other three. Every feature rides the same `createMarkdownIt` + `setConfig` rebuild seam, so the hot path keeps a single markdown-it instance and the block-diff patcher is untouched.

### Consequences
**Positive:** Footnotes, task lists, tables, and strikethrough render natively, each individually toggleable and degrading gracefully when off — for **one** small new runtime dependency. Production-minified webview **2,025.3 KB → 2,041.4 KB (+16.1 KB)** for the footnote plugin + task-list rule + CSS (KaTeX still dominates the 2 MB). No new message type, no CSP change, no webview structural change.
**Negative / Trade-offs:** `markdown-it-footnote` ships no types, so `@types/markdown-it-footnote` is added as a devDependency. Task-list checkboxes are read-only this sprint (no source write-back) — interactive toggling is a Phase 4-style follow-up. Visual theming cannot be asserted under jsdom, so it stays in the manual EDH matrix; the integration tests cover the markdown-it seam (rendered when on, degraded when off, live toggle) for each feature.
**Neutral:** Four new `markstudio.preview.*` settings and `MarkStudioConfig` fields; a new `src/webview/preview/taskLists.ts` module; one new runtime dependency + its types.

### Compliance Impact
No rule bent. Upholds ADR-0002 (preview patched, never rebuilt, on the hot path), ADR-0003/0008 (markdown-it seam + single instance for preview rendering), ADR-0004 (strict CSP, `--vscode-*` theming), and ADR-0005 (no UI framework; one justified dependency, none where the built-ins suffice).

### References
* [ADR-0005](#adr-0005-vanilla-typescript-html-css--no-frameworks)
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0017](#adr-0017-callouts-as-a-dependency-free-markdown-it-core-rule)
* [ADR-0018](#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule)
* [design/gfm.md](design/gfm.md)
* [ROADMAP.md](ROADMAP.md) — Phase 3 M3.5
* [TODO.md](TODO.md) — T-3.5

---

## ADR-0020: Host-side link index with a case-insensitive basename resolver behind a `FileSystemWatcher`

### Status
`Accepted`

### Date
2026-06-27

### Context
**T-4.1** (Phase 4 milestone M4.1) is the **Backlinks panel**: for the active MarkStudio note, show every other workspace note that links to it via a wiki-link (`[[note]]`), and open the source at the linking line on click. This is the first Phase 4 (Knowledge Management) feature, and it also lands the **wiki-link resolver** ADR-0018 explicitly deferred from Phase 3 — the shared PKM primitive that maps a `[[target]]` to a workspace file.

Three project-specific questions had to be settled: (1) the **surface** — a native VS Code view or in-webview UI; (2) the **resolution rule** — how `[[target]]` maps to a file; and (3) **change detection** — how the index stays live, given that ADR-0009 deliberately did *not* add a `FileSystemWatcher` for the editor.

A backlinks view is a workspace-wide, "what links here" surface. Like the document outline (ADR-0014), VS Code ships no native equivalent that works for a custom editor: there is no symbol/reference provider that surfaces for a focused custom editor, and the data is cross-file rather than per-document. The index must also see **every** `.md` file in the workspace — including notes no editor has open — so it cannot be derived from open `TextDocument`s alone.

### Decision
1. **A host-side `vscode.TreeDataProvider`, mirroring the Outline (ADR-0014).** `BacklinksTreeProvider` backs a dedicated `markstudio.backlinks` tree view (Explorer container, visible only when `activeCustomEditorId == 'markstudio.editor'`), follows the active editor through `MarkStudioEditorProvider.onDidChangeActiveDocument`, and lists one node per source note + linking line. No webview/protocol change — entirely host-side, like the Outline. Clicking a node runs the internal `markstudio.backlinks.open` command, which opens the source in a plain text editor (`showTextDocument` honours `selection`; the custom editor is `priority: "option"`, so it does not hijack the navigation) and reveals the linking line. **(Superseded 2026-06-30 by [ADR-0021's amendment](#amendment-2026-06-30-targets-open-in-markstudio-with-a-webview-reveal-handshake): the source now opens in the MarkStudio custom editor via `vscode.openWith`, and the linking line is revealed through the `revealLine` message / pending-reveal handshake.)**
2. **Two pure modules + one I/O service** (`src/links/`, mirroring `src/outline/`). `parseWikiTargets.ts` extracts `[{ target, heading, line }]` from note text using the **same** T-3.4 syntax rules as the preview's inline rule (ADR-0018): a link closes on its own line and may not contain a nested `[`/`]`, and fenced code blocks, YAML front matter, and inline code spans are skipped so documentation *of* the syntax does not pollute the index. `linkIndex.ts` (`buildLinkIndex`) is the pure reverse-index + **resolver**. Both import nothing from `vscode`/the DOM, so they are unit-testable without booting VS Code. `LinkIndexService.ts` owns the I/O the pure modules avoid.
3. **Case-insensitive basename resolution; path-qualified targets resolve relative first** (Producer decision). `[[Guide]]` matches `Guide.md` anywhere in the workspace; a path-qualified `[[docs/Guide]]` resolves relative to the source note's directory first and falls back to basename only when no such file exists; an ambiguous basename links **all** matching notes (no error); a note never backlinks itself. A `#heading` is captured but resolved to the file this sprint (file-level grouping). The snippet shown in the tree is the trimmed source line containing the link.
4. **A workspace `FileSystemWatcher` on `**/*.md` is warranted here, in deliberate contrast to ADR-0009.** The initial index is an **async**, batched scan (`workspace.findFiles` with default excludes + bounded-concurrency `fs.readFile`s) kicked off but **not awaited** on the activation path, so activation and the UI are never blocked (ROADMAP Phase 4 exit criterion). The watcher keeps the index live on create/change/delete; updates are **debounced** (250 ms) and **incremental** — only the touched file is re-parsed before the cheap reverse-index rebuild — and the service fires `onDidChangeIndex`, which refreshes the view.

### Alternatives Considered
1. **An in-webview backlinks pane** — Rejected for the same reasons as the outline (ADR-0014): it duplicates UI a native tree view gives for free (theming, keyboard nav, the Explorer look), adds a pane + state to the App Shell, and conflicts with "less UI is better / native beats custom." A native `TreeView` reads as first-party.
2. **No watcher — reconcile from open documents only (the ADR-0009 stance)** — Rejected: ADR-0009's reasoning is specific to the **text-backed editor**, where VS Code already manages the open `TextDocument` and fires `onDidChangeTextDocument`, so a watcher would be a redundant, double-firing second source for files VS Code already syncs. The backlinks index is the opposite case: it must index files **no editor has open**, for which `onDidChangeTextDocument` never fires. The workspace `FileSystemWatcher` is the supported, native API for exactly this breadth (and the one ADR-0004 names) — so this is not bending ADR-0009 but applying ADR-0004's "use `createFileSystemWatcher`" clause to the workspace-indexing case ADR-0009 was never about.
3. **A synchronous workspace walk at activation** — Rejected outright: it would block activation and violate the Phase 4 exit criterion ("link indexing scales to a large workspace without blocking the UI"). The scan is async and batched, and the view shows an "Indexing…" message until the first scan completes.
4. **Full re-scan on every file change** — Rejected: re-reading the whole workspace on each keystroke-save does not scale. The service caches parsed notes per path and re-parses only the changed file, then rebuilds the (cheap) reverse index from cache; bursts are coalesced by the debounce.
5. **Markdown-link (`[text](note.md)`) backlinks in v1** — Rejected by the Producer for this sprint: wiki-links only, to keep the resolver focused; Markdown-link indexing is a tracked follow-up.
6. **Resolve `#heading` to a heading-level backlink** — Deferred: the heading is captured in the index but grouped at the file level this sprint; heading-level backlinks are a later M4.x refinement.

### Reasoning
Mirroring the Outline (ADR-0014) reuses a proven, native, host-side pattern and keeps the webview/protocol untouched. Keeping `parseWikiTargets` and `linkIndex` pure isolates the two genuinely testable pieces (syntax extraction + resolution) behind a unit-testable boundary, exactly as `headings.ts` is for the outline — the resolver's rules (basename, relative-first, ambiguity, no self-link) are pinned by unit tests without a VS Code host. The basename rule matches how note-taking tools (and the deferred ADR-0018 intent) resolve `[[wiki]]` references — by name, not path — while relative-first resolution disambiguates the path-qualified case. The `FileSystemWatcher` is the right tool *here* precisely because the data is workspace-wide rather than tied to a single managed document, which is the distinction ADR-0009 turned on.

### Consequences
**Positive:** A native, first-party-feeling backlinks panel that follows the active note and stays live as files change, with no webview recreation and no protocol change. The wiki-link resolver deferred from Phase 3 now exists as a pure, tested module reusable by later PKM features (hover preview M4.2, graph view M4.4). Initial indexing is async and non-blocking. Host bundle grows from **~25.4 KB to ~40.4 KB** (+~15.0 KB for the `src/links/` module); the webview is untouched.
**Negative / Trade-offs:** The index holds parsed links for every workspace `.md` file in memory (small — targets + line numbers + a snippet string per link), so a very large vault uses proportional memory. Path identity is the workspace-relative POSIX path, so two folders with an identically-named file in a multi-root workspace could collide on resolution (acceptable for v1; single-root is the common case). Markdown-link backlinks and heading-level grouping are out of scope. The view follows only the **active** MarkStudio editor (consistent with the rest of the extension).
**Neutral:** A new `src/links/` module (`parseWikiTargets.ts`, `linkIndex.ts`, `LinkIndexService.ts`, `BacklinksTreeProvider.ts`, `registerBacklinks.ts`), one new view contribution (`markstudio.backlinks`), and one internal command (`markstudio.backlinks.open`, not contributed to the palette). No new dependency, no new setting (the panel mirrors the Outline's active-doc scoping).

### Compliance Impact
No rule bent. Upholds ADR-0001 (reads workspace files / the managed document via supported APIs), ADR-0002 (the webview is never recreated; navigation opens a native text editor, no `postMessage`), ADR-0004 (change detection via `createFileSystemWatcher` — the very API ADR-0004 names — and native tree-view theming), ADR-0005 (no framework; vanilla host code + two pure modules), and ADR-0014's host-side-tree-view precedent. It **applies** ADR-0009's reasoning rather than contradicting it: a watcher is correct for workspace-wide indexing, wrong for the single text-backed document.

### Migration Plan
Not a migration. New files under `src/links/`; `src/extension.ts` calls `registerBacklinks(provider)` alongside `registerOutline(provider)`; `package.json` contributes the `markstudio.backlinks` view. No existing behaviour changes; no message-protocol change.

### Follow-Ups
* Markdown-link (`[text](note.md)`) backlinks — a second extractor feeding the same index.
* In-preview wiki-link navigation — resolve + open `[[target]]` clicked **inside** the preview (reuses this resolver).
* Heading-level backlinks — group/resolve `#heading` rather than only capturing it.
* Multi-root path-collision disambiguation if it proves to matter in practice.

### References
* [ADR-0004](#adr-0004-rely-on-vs-code-for-theming-autosave-and-file-watching)
* [ADR-0009](#adr-0009-reconcile-external-changes-through-the-managed-textdocument-with-a-cursor-preserving-diff)
* [ADR-0014](#adr-0014-document-outline-as-a-host-side-treedataprovider)
* [ADR-0018](#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule)
* [design/backlinks.md](design/backlinks.md)
* [ROADMAP.md](ROADMAP.md) — Phase 4 M4.1
* [TODO.md](TODO.md) — T-4.1

---

## ADR-0021: In-preview wiki-link navigation via a shared host-side resolver and an `openWikiLink` message

### Status
`Accepted` — **amended 2026-06-30** (see [Amendment](#amendment-2026-06-30-targets-open-in-markstudio-with-a-webview-reveal-handshake)) — **extended 2026-06-30** (see [Extension](#extension-2026-06-30-standard-markdown-links-open-in-markstudio-via-openmarkdownlink)). The original decision opened `.md` targets in VS Code's built-in text editor; the amendment opens them in the MarkStudio custom editor instead; the extension brings the same fix to standard markdown links (`[label](./Other.md)`) so any clickable `.md` reference in the preview routes through one shared open-in-MarkStudio path.

### Date
2026-06-28 (amended 2026-06-30, extended 2026-06-30)

### Extension (2026-06-30): standard markdown links open in MarkStudio via `openMarkdownLink`

**Defect (continuation of PR #4).** The amendment above fixed wiki-link (`[[note]]`) and Backlinks navigation, but standard markdown links in the preview — `[Architecture Overview](./ARCHITECTURE.md)`, `[other](subdir/other.md)`, `[doc](/docs/x.md)`, with or without a `#heading` fragment — were still **not** intercepted. Clicking one fell through to the webview's default anchor behaviour, navigating the iframe to a useless `vscode-webview://…` URL. From the user's point of view this looked broken in exactly the same way the original ADR-0021 defect did, and contradicted the project philosophy a second time: MarkStudio *is* the Markdown experience, so a click on any `.md` reference must stay in it.

**Revised decision (extension).** The webview mounts a **second** delegated `click` listener on the same persistent preview pane (`registerMarkdownLinkClicks` in `src/webview/preview/markdownLinkClick.ts`, mounted right after `registerWikiLinkClicks`). It claims a click on an `<a href>` only when the href passes a small, pure classifier (exported as `isExternalHref` / `parseLocalMarkdownHref` and unit-tested): the href must be non-empty, have no URL scheme (rejecting `http:`/`https:`/`mailto:`/`vscode:`/`command:`/`file:` …), not be a same-document `#fragment`, not carry `data-wikilink-target` (which the wiki-link handler owns), and resolve to a `.md` / `.markdown` extension after stripping any `?query` and `#fragment`. Modifier-held clicks (`ctrlKey`/`metaKey`/`shiftKey`/`altKey`) and clicks whose `defaultPrevented` is already set are left alone — the user (or an earlier handler) is asking for the default. Claimed clicks `preventDefault()` and post a new **`openMarkdownLink { href, target, heading }`** webview → host message (the second webview-originated navigation message). `href` is the raw attribute value (used only for the user-facing fallback message), `target` is the URL-decoded path part before `#`, and `heading` is the URL-decoded fragment or `null`.

**Host resolution (extension).** A new `MarkStudioEditorProvider.openMarkdownLink(fromUri, href, target, heading)` runs **plain URI math** — *not* the workspace link index, which only knows about wiki-link basenames:

* A `/`-prefixed `target` is workspace-absolute: it resolves against the source note's workspace folder (`vscode.workspace.getWorkspaceFolder(fromUri)`), falling back to the first workspace folder for an out-of-workspace source. Multi-root vaults therefore route the link to *the source's own root*, which is the only consistent interpretation when the same `/docs/x.md` could plausibly live in more than one folder.
* Any other `target` is relative to the source's containing directory (`vscode.Uri.joinPath(fromUri, "..", target)`); `joinPath` normalises `..` segments.
* A defence-in-depth scheme check rejects an external `href` or `target` even if a malformed message somehow reached the host.
* Existence is the caller's `openTextDocument` — a broken link surfaces the same transient `MarkStudio: no note found at "<href>"` / `could not open note at "<href>"` status-bar fallback the wiki-link path uses, never a throw. Heading reveal reuses the existing `findHeadingLine` (miss → top of file); the open itself routes through the existing `openInMarkStudio`, so the **pending-reveal handshake is identical** to the wiki-link / backlinks paths.

**Preserved.** No new dependency, setting, or command. The only protocol addition is the boundary-guarded `openMarkdownLink` message; no existing message changes shape. The wiki-link and Backlinks code paths are untouched. External URLs, image / PDF / TypeScript links, modifier-held clicks, and same-document `#fragment` links continue to use the webview's default behaviour — the handler is strictly opt-in, not a catch-all.

**Compliance.** Upholds ADR-0002 (one delegated listener on the persistent preview pane; `postMessage`, never a reload), ADR-0001/0004 (resolution and editor navigation stay on the host through supported APIs), ADR-0005 (vanilla TypeScript, one new pure helper file), and ADR-0018/0020 (wiki-link rendering and resolution are unaffected). Strengthens consistency with ADR-0001's "MarkStudio is the editor for Markdown" by closing the last preview-anchor route that still dropped the user out of MarkStudio.

**Tests.** Three Extension Host tests in `test/exthost/suite/navigation.test.ts` cover the host handler end-to-end (relative `.md` href, workspace-absolute `/path` href, external `https:` no-op — all assert the resulting tab is a `TabInputCustom` with `viewType === "markstudio.editor"`); a 13-test jsdom integration suite (`test/integration/markdownLinkClick.test.ts`) covers the click delegate's claim / leave-alone classification; the pure `isExternalHref` / `parseLocalMarkdownHref` helpers have 14 unit tests in `test/webview/markdownLinkClick.test.ts`; and the new `openMarkdownLink` boundary guard is unit-tested in `test/messaging/messages.test.ts` alongside the existing message guards. To make the host handler reachable from a host test, `activate()` now returns a small `MarkStudioExtensionApi { provider }` — not a contributed extension API, used only by the navigation tests.

### Amendment (2026-06-30): targets open in MarkStudio with a webview reveal handshake

**Defect.** Clicking a wiki-link (`[[note]]` / `[[note#heading]]`) in the preview — and clicking a row in the Backlinks panel (ADR-0020) — opened the target `.md` in VS Code's **built-in text editor** (raw Markdown), not in MarkStudio. Both call sites used `vscode.window.showTextDocument(...)`, which does not route to the custom editor because it is registered at `priority: "option"` (decision item 4 below, and ADR-0020 item 1, deliberately relied on this to reveal a line). The result contradicted the project philosophy — MarkStudio *is* the Markdown experience, so navigating between notes should stay in it.

**Revised decision.** Both call sites now open the target through `vscode.commands.executeCommand("vscode.openWith", targetUri, MarkStudioEditorProvider.viewType)` — mirroring the existing `markstudio.openMarkStudio` command — so `.md` targets open in MarkStudio. Because a MarkStudio editor is a **webview**, the target line can no longer ride `showTextDocument`'s `selection`; it is delivered through the existing host → webview **`revealLine`** message (the same one the outline tree uses, ADR-0014), via a small **pending-reveal handshake**:

* `MarkStudioEditorProvider` tracks every resolved editor in a `controllersByUri` map (`uri.toString()` → controller; one per document, since `supportsMultipleEditorsPerDocument: false`) alongside its existing single-`activeController` focus tracking.
* A pure `PendingReveals` registry (`src/editor/pendingReveals.ts`) parks the requested 0-based line keyed by URI. The provider exposes `openInMarkStudio(targetUri, line)`:
  * **Target already open** → `openWith` focuses its existing tab (no duplicate) and the line is revealed immediately on the live controller.
  * **Target not yet open** → the line is recorded in `pendingReveals` *before* `openWith` (which drives `resolveCustomTextEditor`), and applied once that new webview reports **`ready`**. A dispose before `ready` clears the pending entry so it cannot leak onto a later editor.
* The wiki-link path computes the heading line from the freshly opened document's text (`findHeadingLine`, falling back to the top); the Backlinks path reveals the linking line it already knows. Both clamp to the document's line count.

**Preserved.** The defect-#2 graceful degradation is intact: an unresolved target or a failed open shows the existing transient status-bar message and never throws; both call sites stay fire-and-forget (`void`). Resolution still goes through the shared `LinkIndexService` (open-first on ambiguity), so hover, click, and backlinks continue to agree. No new dependency, setting, command, or message — `revealLine` already existed.

**Compliance.** Still upholds ADR-0002 (the target webview is never recreated; reveal is a `postMessage`) and ADR-0001/0004. It strengthens consistency with ADR-0001's "MarkStudio is the editor for Markdown": navigation no longer drops the user into the raw text editor. ADR-0020's "open in a plain text editor" detail (its Decision item 1 and Compliance note) is superseded by this amendment for the same reason.

**Tests.** Two Extension Host tests (`test/exthost/suite/navigation.test.ts`) assert the Backlinks open command lands a `TabInputCustom` with `viewType === "markstudio.editor"` (fresh open and already-open cases); the pure `PendingReveals` registry is unit-tested (`test/editor/pendingReveals.test.ts`).

### Context
**T-4.1b** (Phase 4) makes the wiki-links the preview already renders (T-3.4) **clickable**: clicking `[[note]]` in the preview pane opens the target note in an editor — the in-document counterpart to the M4.1 Backlinks panel's "what links here." The resolver that maps a `[[target]]` to a workspace file already exists from M4.1 (ADR-0020), but it lived **inside** the Backlinks feature (`LinkIndexService`/`linkIndex`), reachable only by the tree provider. Three questions had to be settled: (1) **where resolution runs** — in the webview or the host; (2) **how the click reaches it** — given ADR-0002 forbids recreating the webview and ADR-0001/0009 keep document I/O on the host; and (3) **whether to add a second resolver or share the M4.1 one**.

A wiki-link target resolves against the **workspace** (every `.md` file, including notes no editor has open) and opens a **note as an editor** — both are host responsibilities under ADR-0001/0004. The webview has neither the file index nor the `vscode` API to open an editor, so it cannot resolve or navigate on its own. What it *does* own is the click: the rendered anchor lives in the persistent preview DOM.

### Decision
1. **The webview detects the click and delegates; the host resolves and navigates.** A single delegated listener (`registerWikiLinkClicks`) on the persistent preview pane (`shell.previewPane`, never replaced per ADR-0002) uses `Element.closest('a.markstudio-wikilink')`, reads the anchor's `data-wikilink-target` / `data-wikilink-heading`, calls `preventDefault()`, and posts a new **`openWikiLink { target, heading }`** webview → host message (the first webview-originated navigation message). One listener for the whole pane survives every incremental preview patch.
2. **One resolver, shared.** Rather than add a second resolver in the webview or duplicate ADR-0020's logic, the existing index is exposed through a new `LinkIndex.resolveForward(fromPath, target)` (a thin public wrapper over the private `resolveTarget` the backlink build already used) and a `LinkIndexService.resolveTarget(fromUri, target): vscode.Uri[]` URI wrapper. The Backlinks panel and click-navigation now resolve through the **same** code path — the unification ADR-0020's follow-up called for. Forward resolution deliberately **keeps** a self-match (clicking `[[A]]` inside note A opens A), whereas the backlink build still drops self-links; the one shared resolver returns all matches and each caller applies its own self-policy.
3. **A single `LinkIndexService` is hoisted to `extension.ts`** and injected into both `registerBacklinks(provider, service)` and the editor provider, so the panel and click-navigation share one workspace scan and one live index rather than each owning a service.
4. **Host navigation policy (Producer decisions), reusing ADR-0020's rules:** resolve `target` relative to the **active** document; case-insensitive basename with path-qualified relative-first; **ambiguous basename → open the first match** (no quick-pick this sprint); **existing notes only** (no click-to-create); unresolved → a transient `window.setStatusBarMessage(…, 4000)` rather than a modal. When a `#heading` is present, a pure `findHeadingLine(text, heading)` (added to the outline scanner, `src/outline/headings.ts`) finds the line by case-insensitive trimmed exact match and the host reveals it; misses fall back to the top of the file. Same-document heading-only links (`[[#heading]]`, empty `target`) are inert this sprint.
5. **No new setting.** The feature is gated by the existing `markstudio.preview.wikiLinks` toggle that already controls whether wiki-links render at all — a non-rendered link cannot be clicked.

### Alternatives Considered
1. **Resolve in the webview and post a ready-made path to open** — Rejected: the webview has no workspace file index and no `vscode` API; it would need a second copy of the index shipped across the protocol and kept in sync. Resolution belongs on the host (ADR-0001/0004).
2. **Reuse an existing message (e.g. overload `revealLine`)** — Rejected: `revealLine` is a host → webview, same-document scroll; cross-document open is a distinct, webview-originated intent and deserves its own typed, guarded message (CODING_GUIDELINES §9).
3. **A second, webview-local resolver** — Rejected: it would duplicate ADR-0020's basename/relative-first/ambiguity rules and inevitably drift. Sharing one resolver is the whole point of having kept `linkIndex` pure.
4. **A quick-pick on ambiguous basenames** — Deferred: open-first is the lower-friction default and matches the panel's "link all matches" tolerance; a disambiguation picker is a tracked follow-up.
5. **Click-to-create for unresolved targets** — Deferred: note creation is its own feature (templates, location, front-matter) and out of scope for a navigation sprint; a status-bar message is the v1 affordance.
6. **Slug-based heading matching** — Deferred: `findHeadingLine` does an exact trimmed match on raw heading source, so it won't match headings containing inline Markdown (`## **Bold**`). Acceptable v1; a shared slugify is the follow-up.

### Reasoning
The split — webview delegates the click, host resolves and opens — keeps every responsibility where the architecture already puts it: the persistent preview owns its DOM and a single delegated listener (no per-patch rebinding), while resolution and editor navigation stay on the host through supported APIs. Adding one typed, guarded `openWikiLink` message rather than overloading an existing one keeps the protocol honest. Exposing `resolveForward` instead of forking the resolver makes the Backlinks panel and click-navigation provably consistent and is the unification ADR-0020 anticipated. Hoisting one `LinkIndexService` avoids a second workspace scan. Reusing ADR-0020's resolution policy verbatim means clicking a link and reading its backlink resolve identically.

### Consequences
**Positive:** Wiki-links are now navigable in the preview, closing the loop with the Backlinks panel through **one** shared resolver and **one** workspace index. The new message is small and guarded; the persistent preview and CodeMirror are untouched (no recreation). Heading navigation works for plain headings. Host bundle grows from **~40.4 KB to ~44.0 KB**; the webview seam is unchanged.
**Negative / Trade-offs:** Ambiguous basenames open the first match silently; unresolved targets only surface in the status bar; same-document `[[#heading]]` links and inline-Markdown headings don't navigate yet. All are deferred, not blocking.
**Neutral:** New `OpenWikiLinkMessage` in the protocol; new `src/webview/preview/wikiLinkClick.ts`; `registerBacklinks` signature changes to take an injected service; `findHeadingLine` added to `src/outline/headings.ts`. No new dependency, no new setting, no new command.

### Compliance Impact
No rule bent. Upholds ADR-0001 (the host opens notes via `showTextDocument`), ADR-0002 (the webview is never recreated; one delegated listener on the persistent pane; navigation is a `postMessage`, not a reload), ADR-0004 (reuses the M4.1 index/watcher; native editor navigation), ADR-0005 (vanilla host + webview code, one new pure helper), and ADR-0018/0020 (same wiki-link syntax and resolver). It realises ADR-0020's "in-preview wiki-link navigation reuses this resolver" follow-up.

### Migration Plan
Not a migration. `extension.ts` now creates the single `LinkIndexService`, calls `start()`, and injects it into `register()` and `registerBacklinks()`; the webview mounts `registerWikiLinkClicks(previewPane, bus)` after scroll-sync. No existing behaviour changes beyond wiki-links becoming clickable; no setting or command added.

### Follow-Ups
* Quick-pick disambiguation for ambiguous basenames.
* Click-to-create for unresolved targets.
* Slug-based heading matching (shared with the outline) so inline-Markdown headings navigate.
* Same-document `[[#heading]]` navigation (scroll within the active note).

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0002](#adr-0002-one-persistent-webview-retained-when-hidden)
* [ADR-0018](#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule)
* [ADR-0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)
* [design/wiki-navigation.md](design/wiki-navigation.md)
* [api/message-protocol.md](api/message-protocol.md) — `openWikiLink`
* [ROADMAP.md](ROADMAP.md) — Phase 4
* [TODO.md](TODO.md) — T-4.1b

---

## ADR-0022: Hover preview for wiki-links: host ships Markdown text, webview renders it

### Status
`Accepted`

### Date
2026-06-30

### Context
**M4.2** (Phase 4) is **hover preview for links**: resting the pointer on a rendered wiki-link in the preview pane shows a floating card previewing the target note — the read-side counterpart to T-4.1b's click-to-open (ADR-0021). The resolver (ADR-0020), the heading scanner (`findHeadingLine`, ADR-0021), and the persistent preview pane with its delegated-listener pattern (ADR-0002/0021) all already exist. What is new is a **read** path: the host must fetch the target note's content and the webview must show an excerpt of it next to the anchor.

Three project-specific questions had to be settled: (1) **what the host ships** — rendered HTML or Markdown source; (2) **how the request is shaped and made** — given the preview DOM is patched continuously (ADR-0008) and the webview must not be recreated (ADR-0002); and (3) **how much content** crosses the boundary, since a note can be arbitrarily large.

### Decision
1. **The host ships Markdown *text*, not HTML; the webview renders it with its own markdown-it renderer.** On a hover request the host resolves + reads the target, extracts a capped Markdown excerpt, and ships that **text**; the webview renders it through a dedicated instance of the **existing** `PreviewRenderer` (`createPreviewRenderer`) mounted in the card. This inherits the main preview's theming, plugin pipeline, and — critically — its `html: false` safety, so a previewed note can never inject raw HTML into the host's webview. The host never serialises DOM/HTML across the protocol.
2. **Two new typed, guarded messages.** `requestLinkPreview { target, heading }` (webview → host) is posted after a short **dwell** (~300 ms) by a single delegated `pointerover`/`pointerout` pair on the persistent preview pane (`registerWikiLinkHover`), mirroring T-4.1b's click delegation; it is boundary-guarded exactly like `openWikiLink` (CODING_GUIDELINES §9). `linkPreviewContent { target, heading, status, text?, title? }` (host → webview) carries the result: `status: "ok"` with a capped `text` excerpt and the note's `title`, or `status: "missing"` for a quiet "no note found" card. `target`/`heading` echo the request so the webview can drop a **stale** reply (the pointer may have moved on).
3. **Reuse the shared resolver, heading scanner, and renderer — no new primitive.** Resolution is `LinkIndexService.resolveTarget` (open-first on ambiguity, identical to click-nav); the `#heading` section slice reuses `parseHeadings` + `findHeadingLine` in a new **pure** `src/links/linkExcerpt.ts`; rendering reuses `PreviewRenderer`. Hover, click, and backlinks all resolve through one index.
4. **Capped excerpt (Producer decision).** `extractExcerpt(text, heading)` returns the top of the note, or — when a `heading` is given — that heading's section (from the heading line to the next same-or-higher heading, falling back to the top when the heading is absent), then caps to **≤ 60 lines or ≤ 2,000 characters, whichever bites first**. The cap keeps the `linkPreviewContent` message small and the card a *preview*, not a transclusion (that is M4.3).
5. **Never throw; degrade to `missing`.** An unresolved target — or a read that fails (e.g. the file was deleted inside the watcher debounce window, so the index still lists it; the same lesson as defect #2) — posts `status: "missing"` rather than leaking an unhandled rejection.
6. **No new setting; static snapshot.** Gated by the existing `markstudio.preview.wikiLinks` (off ⇒ no anchors ⇒ nothing to hover). The card is a snapshot taken at hover time — no live re-render, no nested hover, no prefetch/LRU cache this sprint.

### Alternatives Considered
1. **Host renders the excerpt to HTML and ships markup** — Rejected: it would duplicate the preview's render pipeline on the host, diverge in theming, and reintroduce the raw-HTML injection surface that `html: false` closes. Shipping text and rendering webview-side keeps one renderer and one safety posture.
2. **Reuse `openWikiLink` / overload an existing message** — Rejected: hover is a distinct read intent with a *reply*; a request/response pair of its own typed, guarded messages keeps the protocol honest (as ADR-0021 chose for the click).
3. **Per-anchor hover listeners** — Rejected: the same reason as the click handler — one delegated pair on the persistent pane survives every incremental patch (ADR-0002/0008) and keeps the hot render path untouched.
4. **Ship the whole note / no cap** — Rejected: a large note would bloat the message and the card; a bounded excerpt is enough for a preview, and full inline content is M4.3 (transclusion).
5. **An own setting (`markstudio.preview.linkHoverPreview`)** — Deferred: gating by `wikiLinks` is sufficient; revisit only if QA finds the card intrusive.
6. **A prefetch / LRU cache of excerpts** — Deferred: resolution + read happen once per hover after the dwell; a trivial stale-response guard is enough. Caching is a later refinement.

### Reasoning
Shipping Markdown text and rendering it with the same `PreviewRenderer` is the single most consequential choice: it gives the card the main preview's look and its `html: false` guarantee for free, with zero duplicated render logic. A dedicated request/response message pair, boundary-guarded like `openWikiLink`, keeps the untrusted boundary honest while echoing `target`/`heading` makes stale-response handling trivial. Reusing the resolver, heading scanner, and renderer means hover agrees with click and backlinks by construction. The line/char cap bounds both the message and the card, and degrading to `missing` on any failure keeps a hover from ever crashing the webview.

### Consequences
**Positive:** Obsidian-style hover preview that reuses the shared resolver, heading scanner, and renderer — no new resolution/render primitive, one index, one safety posture. The two new messages are small and guarded; the persistent preview and CodeMirror are untouched (no recreation). Host bundle grows from **~44.0 KB to ~47.6 KB** (+~3.6 KB for the excerpt extractor + hover handler).
**Negative / Trade-offs:** The card is a static snapshot (no live update while the target changes); ambiguous basenames preview the first match; nested hover (hovering a link inside a card) is inert; very large sections are truncated to the cap. All are deferred, not blocking.
**Neutral:** New `RequestLinkPreviewMessage` + `LinkPreviewContentMessage` in the protocol; new pure `src/links/linkExcerpt.ts`; new `src/webview/preview/wikiLinkHover.ts` + `src/webview/preview/HoverCard.ts`; a `requestLinkPreview` handler in `MarkStudioEditorProvider`. No new dependency, no new setting, no new command.

### Compliance Impact
No rule bent. Upholds ADR-0001 (the host reads notes via `openTextDocument`), ADR-0002 (the webview is never recreated; one delegated `pointerover`/`pointerout` pair on the persistent pane; preview is a `postMessage`, not a reload), ADR-0004 (reuses the M4.1 index/watcher), ADR-0005 (vanilla host + webview code, one new pure helper), and ADR-0008 (the host ships text; the webview's `html: false` renderer is the only thing that produces DOM). It realises ADR-0020's "hover preview M4.2 reuses this resolver" follow-up.

### Migration Plan
Not a migration. The webview mounts `registerWikiLinkHover(previewPane, bus, …)` + one `createHoverCard(...)` next to `registerWikiLinkClicks`; `MarkStudioEditorProvider` gains a `requestLinkPreview` case that posts `linkPreviewContent`. No existing behaviour changes; no setting or command added.

### Follow-Ups
* An optional `markstudio.preview.linkHoverPreview` toggle if the card proves intrusive.
* A small LRU cache / prefetch of excerpts if hover latency matters on large vaults.
* Source-pane (CodeMirror) hover preview — a separate seam from the preview-pane hover.
* Nested hover (previewing a link inside a hover card).

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0002](#adr-0002-one-persistent-webview-retained-when-hidden)
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)
* [ADR-0021](#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message)
* [design/wiki-hover.md](design/wiki-hover.md)
* [api/message-protocol.md](api/message-protocol.md) — `requestLinkPreview` / `linkPreviewContent`
* [ROADMAP.md](ROADMAP.md) — Phase 4
* [TODO.md](TODO.md) — M4.2

---

## ADR-0023: Graph view: host-side pure model + lazy webview canvas, zero new runtime deps

### Status
`Accepted`

### Date
2026-06-30

### Context
**M4.4** (Phase 4, closing) is the **graph view**: an interactive workspace-wide visualisation of every `.md` note as a node and every wiki-link as an edge — the vault-wide topology Backlinks (M4.1), in-preview click-nav (T-4.1b), and hover preview (M4.2) only show per-note. The link index (ADR-0020), the `provider.openInMarkStudio` navigation handshake (PR #4, ADR-0021 amendments), the lazy-bundle pattern for heavy webview features (Mermaid, ADR-0016), and the persistent-webview discipline (ADR-0002) all already exist. What is new is (a) a workspace-wide **read** seam over the existing index, (b) a **new webview surface** that is not the editor's preview (it has no document backing it), and (c) **rendering + simulation** of an arbitrary graph at interactive frame rates.

Three project-specific questions had to be settled: (1) **what library, if any**, should render and simulate the graph (the obvious candidates — `d3-force`, `cytoscape.js`, `vis-network` — all add real bundle and theming weight); (2) **what surface** the graph lives in (editor preview, custom editor view type, or a free-standing webview panel); and (3) **where the simulation runs** (host, webview main thread, webview worker), since a vault can have hundreds of notes.

### Decision
1. **Host-side pure graph model + lazy webview Canvas2D panel, zero new runtime dependencies.** A single new `vscode.WebviewPanel` (`GraphService`, mirroring the pattern of `registerBacklinks` but with a panel instead of a tree view), opened by a new `markstudio.graph.show` command, hosts the visualisation. The body is rendered with **Canvas2D**; labels are **DOM-positioned `<span>`s** so VS Code text rendering applies. The simulation is a **hand-rolled Fruchterman–Reingold integrator** in a pure `forceSimulation.ts`. No `d3-force`, no `cytoscape.js`, no `vis-network`. ADR-0005 (vanilla TS/HTML/CSS) holds.
2. **Edges come from the existing link index via one tiny additive getter.** `LinkIndex.allEdges(): { from, to }[]` exposes the (from→to) pairs the reverse-index build loop already computes internally; `LinkIndexService` adds `getEdges()`, `getNotePaths()`, and `uriFor(path)`. No second parse, no second resolver, no second watcher. One index serves Backlinks, click-nav, hover preview, **and** the graph.
3. **A free-standing `vscode.WebviewPanel`, not a custom editor.** A custom editor view type would need a document to back it; the graph is workspace-wide and orthogonal to any one note. The panel honours `retainContextWhenHidden: true` (ADR-0002 applied to a non-editor webview); a second `markstudio.graph.show` reveals the existing panel rather than creating a duplicate.
4. **Lazy third esbuild bundle (`dist/graph.js`).** The graph entry (`src/webview/graph/main.ts` + `render.ts` + `forceSimulation.ts`) is bundled separately and only loaded when the panel opens, mirroring the Mermaid pattern (ADR-0016). The editor webview's `dist/webview.js` is **untouched** by this sprint — the graph cannot inflate the cost of opening a single `.md`.
5. **Two new typed, guarded messages.** `graphData { nodes, edges, currentPath }` (host → webview) is posted whenever the index changes (debounced ~250 ms) or the active MarkStudio editor changes (immediate). `openGraphNode { path }` (webview → host) is boundary-guarded exactly like `openWikiLink` / `openMarkdownLink` (CODING_GUIDELINES §9); the host resolves `path → uri` via `LinkIndexService.uriFor` and routes to `provider.openInMarkStudio(uri, 0)` — the PR #4 pending-reveal handshake. **The graph never calls `vscode.window.showTextDocument` directly**; it would open the built-in text editor for a not-yet-open note.
6. **Simulation on the webview main thread (no worker for v1).** The panel is a *separate webview* from the editor, so simulation work cannot starve the editor or the host. The simulation **halts on convergence** (kinetic energy < ε pauses the RAF loop); it never burns CPU at idle. A web worker is a deferred follow-up gated on profiling.
7. **Live updates merge by `path`.** On a fresh `graphData` the webview keeps a `Map<path, SimulationNode>` and reuses existing positions for unchanged paths; new nodes spawn at the centre; removed nodes are dropped. The simulation re-warms briefly so the layout re-settles smoothly. No full re-initialisation on every save.
8. **Wiki-link only for v1.** Markdown-link edges (T-4.1a) and heading-level edges (T-4.1c) are tracked follow-ups; pulling them forward would conflate this sprint with backlog work.

### Alternatives Considered
1. **Adopt `d3-force` (~30 KB min) for the simulation.** Rejected for v1: the bundle delta is modest but the standing project rule is "zero new dependencies unless the in-tree alternative is genuinely worse" (ADR-0005). At ≤ 500 nodes a hand-rolled Fruchterman–Reingold is adequate. If Phase D profiling shows a real bottleneck, the in-tree fallback is **adding a Barnes–Hut quadtree in-tree** before reaching for the dependency.
2. **Adopt `cytoscape.js` (~300 KB min) or `vis-network` (~150 KB min).** Rejected: massive bundle delta for v1; both ship their own theming conventions, which fight `--vscode-*` tokens (project philosophy). Either would also push us toward a custom design system, which the project explicitly forbids.
3. **Render the body in SVG (not Canvas2D).** Rejected for nodes + edges: at 500 nodes every drag would mutate hundreds of DOM elements per frame. Canvas one-draw-per-frame is the right primitive for the body. **Kept** for labels: Canvas text is fuzzy at sub-pixel positions and ignores VS Code's font configuration.
4. **Render inside the editor's preview pane.** Rejected: the preview is per-document and incrementally patched on every edit (ADR-0008); the graph is workspace-wide and unrelated to any one document. A dedicated panel is the honest surface.
5. **Use a custom editor view type with a virtual document backing it.** Rejected: there is no per-document state to back the editor. `vscode.window.createWebviewPanel` is the right primitive (ADR-0002 still applies — single persistent panel, retained when hidden).
6. **Run the simulation in a web worker.** Deferred: profile first (Phase D). The graph panel is a separate webview; main-thread simulation cannot block the editor. A worker is a future optimisation if a vault grows beyond ~500 notes.
7. **Persist node positions across sessions** (via `Memento`). Deferred: `retainContextWhenHidden` already covers in-session persistence; cross-session is a follow-up.
8. **A separate `markstudio.graph.enabled` setting.** Deferred: the command alone is the surface; nothing runs unless the user opens the panel, so the cost is zero by default.

### Reasoning
The shared link index (ADR-0020) and the `provider.openInMarkStudio` handshake (PR #4) already do the heavy lifting; a vault-wide visualisation is mostly a small new read seam plus a new webview surface. Adding a graph library would be the easy answer, but the bundle cost is real and the theming conflict is worse — a fourth-party library would either look out of place against `--vscode-*` tokens or require fighting it to look native, neither of which is justifiable at the scale the project targets. The hand-rolled simulation is small (≈ 200 LoC), pure, deterministic given a seed, and converges + halts so it does not burn CPU at idle. Canvas2D + DOM labels is the boring + correct split: cheap drawing for the body, theme-correct text from VS Code for the labels. Routing every click through `provider.openInMarkStudio` is non-negotiable: it is the only path that opens MarkStudio (not the built-in text editor) for a not-yet-open note, and reusing it means the graph cannot drift from wiki-link / backlinks / standard-markdown-link navigation.

### Consequences
**Positive:** A first-party-feeling graph panel that shares the existing index, navigation, and theming. No new runtime dependencies. The editor's webview bundle is **untouched** (the graph is a separate lazy bundle). One `LinkIndexService` shared with Backlinks + click-nav + hover; one `provider.openInMarkStudio` shared with every navigation path. The pure model (`graphModel.ts`) and pure simulation (`forceSimulation.ts`) are unit-testable without booting VS Code.
**Negative / Trade-offs:** No filters / clustering / find-in-graph / minimap / multi-select / animated transitions / persisted positions / Markdown-link or heading-level edges in v1 — all deferred and tracked. The hand-rolled simulation is O(n²) per tick; if a vault exceeds ~500 notes the frame budget may tighten (ADR records the bar for adding a Barnes–Hut quadtree in-tree or escalating to `d3-force`). The simulation runs on the webview main thread (panel-local; cannot block the editor, but can block its own panel during very large warms — a worker is a deferred follow-up).
**Neutral:** New `GraphDataMessage` + `OpenGraphNodeMessage` in the protocol; new `src/graph/` module mirroring `src/links/` / `src/outline/`; new `src/webview/graph/` entry with its own esbuild target; new `markstudio.graph.show` command. No new dependency, no new setting.

### Compliance Impact
No rule bent. Upholds ADR-0001 (the host reads notes and resolves URIs; the webview only draws), ADR-0002 (single persistent webview panel, `retainContextWhenHidden`, no recreation), ADR-0004 (reuses the M4.1 index/watcher and the VS Code theme tokens), ADR-0005 (vanilla TS + zero new runtime deps), ADR-0006 (esbuild adds a third bundle, mirrors ADR-0016's Mermaid pattern), ADR-0008 (the editor's preview renderer is untouched — the graph is a separate surface), ADR-0020 (one shared link index), and the PR #4 amendments to ADR-0021 (every click routes through `provider.openInMarkStudio`).

### Migration Plan
Not a migration. `extension.ts` constructs a `GraphService` alongside `registerBacklinks` and pushes it to `context.subscriptions`. `package.json` contributes `markstudio.graph.show`. `esbuild.js` adds a third target. No existing behaviour changes; no migration of stored state.

### Follow-Ups
* Filters (folder / tag / search string).
* Local subgraph mode (N-hop neighbourhood of the current note).
* Persisted node positions across sessions (`Memento`).
* Markdown-link edges (T-4.1a) and heading-level edges (T-4.1c) once their parent backlog items land.
* Animated transitions on graph changes (fade-in, eased reposition).
* Find-in-graph / minimap / multi-select / clustering.
* Web-worker simulation if a vault grows beyond ~500 notes.
* Barnes–Hut quadtree in-tree if the O(n²) integrator becomes the bottleneck (preferred over a `d3-force` dependency).
* Keyboard navigation through nodes (accessibility).
* CodeMirror-pane integration ("jump from a wiki-link in source to its node in the graph").

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0002](#adr-0002-one-persistent-webview-retained-when-hidden)
* [ADR-0005](#adr-0005-vanilla-typescripthtmlcss--no-frameworks)
* [ADR-0006](#adr-0006-bundle-with-esbuild)
* [ADR-0008](#adr-0008-markdown-it-package-and-incremental-block-level-preview-patching)
* [ADR-0016](#adr-0016-lazy-loaded-mermaid-for-diagram-rendering-in-the-preview)
* [ADR-0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)
* [ADR-0021](#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message)
* [design/graph-view.md](design/graph-view.md)
* [api/message-protocol.md](api/message-protocol.md) — `graphData` / `openGraphNode` (added in Phase E)
* [ROADMAP.md](ROADMAP.md) — Phase 4
* [TODO.md](TODO.md) — M4.4

---

## ADR-0024: Markdown-link backlinks and heading-level promotion via additive widening of the link index

### Status
`Accepted`

### Date
2026-06-30

### Context
Sprint 6 closes the two Phase 4 carry-overs ADR-0020 explicitly deferred:

* **T-4.1a — Markdown-link backlinks.** Standard Markdown links (`[text](./note.md)`, `[text](note.md#heading)`) must feed the same backlinks index that wiki-links (ADR-0020) already feed, so the Backlinks panel surfaces both kinds and the Graph view (ADR-0023) picks them up for free through `LinkIndex.allEdges()`.
* **T-4.1c — Heading-level backlinks.** A link targeting `#heading` is currently captured but collapsed to the file in `LinkIndex`; it must be **promoted** to a per-target heading line so the Backlinks panel can surface the target heading next to each linking line.

Three questions had to be settled: (1) how Markdown-link resolution differs from the wiki-link resolver's basename-with-relative-first rule (ADR-0020) — Markdown links are author-explicit paths, not bare names; (2) whether to introduce a second `NoteLink` type / second index / second parser, or **widen** the existing one; and (3) where heading-level granularity lives, given ADR-0023 keeps the Graph view at note-level on purpose.

ADR-0020 followed a deliberate pattern: a pure target extractor (`parseWikiTargets`) feeding a pure reverse-index + resolver (`linkIndex`), with one I/O service (`LinkIndexService`) owning the watcher and async scan. The widening must preserve that shape — every existing M4.1 / T-4.1b / M4.2 / M4.4 test must still pass without modification.

### Decision
1. **Markdown-link resolution is explicit-path only — no basename fallback.** Wiki-links use case-insensitive basename matching because `[[Guide]]` is a name reference; standard Markdown links are author-explicit paths and resolve only relative to the source note's directory (or `joinPath(dirname(sourcePath), destination)` after stripping any `?query` / `#anchor` and unwrapping `<…>`). A destination that is an absolute URL (`scheme:` prefix), starts with `//`, is a bare `#fragment`, or is empty is skipped. A leading `/` (workspace-absolute) is **skipped in v1** — its meaning is ambiguous in multi-root workspaces, deferring to a follow-up. Reference-style links (`[text][id]` + `[id]: ./note.md`) and bare-anchor links are skipped in v1. If the resolved path does not exist in the index, the link is dropped (no basename fallback).
2. **Widen `NoteLink`, do not split it.** `NoteLink` gains `kind: "wiki" | "markdown"`. Both parsers (`parseWikiTargets`, new pure `parseMarkdownTargets`) emit the same shape and `LinkIndexService.indexFile` merges them into one tagged `NoteLink[]`. `Backlink` gains `kind` and an optional `targetLine: number | null`. `GraphEdge` is unchanged — edge weight collapses across both kinds (per-kind split is a deferred follow-up). The pre-Sprint-6 backlink build loop, ordering rules, dedupe key, and self-link policy are **untouched**; the widening is strictly additive.
3. **Markdown-link parser mirrors the wiki-link parser.** A new pure `src/links/parseMarkdownTargets.ts` reuses the wiki-link parser's front-matter / fenced-code / inline-code skipping; it scans for `[text](destination)` (including titled `[text](dest "title")` and angle-bracket `[text](<dest>)`) and emits a `{ target, heading, line, snippet }` for each link whose destination is a relative `.md`/`.markdown` path. Reference-style and bare-anchor links are skipped here so the resolver never sees them. The two parsers stay textually parallel so a future maintenance pass on either reads as one diff against the other.
4. **Heading-line promotion is computed once per (target, heading) pair per build.** The reverse-index build pass keeps an in-closure `Map<targetPath + "\\u0000" + heading, number | null>` cache: the first backlink to a given target heading runs `findHeadingLine(targetText, heading)` (`src/outline/headings.ts`, the same scanner M4.2 and T-4.1b use); every later backlink to the same heading hits the cache. Cache lives in the `buildLinkIndex` closure, **not** on the service, so each watcher-driven rebuild rebuilds the cache and can never serve stale heading lines. Heading misses set `targetLine: null` and the backlink remains at the file level (matches the M4.2 hover-preview policy: unresolved heading → top-of-note).
5. **Heading-level granularity lives in the index and the Backlinks panel only.** The Graph view (ADR-0023) stays note-level; edges carry the heading anchor in source data, but the renderer does not split a node per heading. The Backlinks panel surfaces `targetLine` only as a tree-item description suffix (`→ <heading>`) and as a tooltip target-line; the panel stays flat (one entry per linking line — no new grouping mode in v1).
6. **Heading-line resolution needs the target note's text.** `buildLinkIndex` is fed `ParsedNote { path, text, links }` (text added, the rest unchanged) so the build pass can call `findHeadingLine(targetText, heading)` without re-reading from disk. `LinkIndexService.indexFile` already has the text in hand; passing it through is one new field on `ParsedNote`, no new I/O.
7. **Zero new runtime dependencies, settings, commands, messages, watchers, or scans.** The Markdown extractor and the heading-line resolver are pure. No protocol change. The Backlinks tree-item icon vocabulary (`$(symbol-reference)` for wiki, `$(link)` for Markdown) reuses Codicons already loaded.
8. **The Graph view picks up Markdown-link edges automatically.** It already iterates `LinkIndex.allEdges()`; once both extractors feed the same builder, Markdown-link edges appear in `allEdges()` deduped and weight-summed with their wiki-link counterparts. **No graph-view code change.**

### Alternatives Considered
1. **Basename fallback for Markdown links** (e.g. `[guide](./Guide.md)` falls back to any `Guide.md` if the relative path misses). Rejected: Markdown links are explicit paths; fuzzy matching is the wiki-link affordance. A miss should be a miss so the author notices a broken link rather than silently routing through the wrong file.
2. **Split `NoteLink` into `WikiNoteLink` and `MarkdownNoteLink` with separate buckets.** Rejected by Producer policy: every existing M4.1 / T-4.1b / M4.2 / M4.4 test would have to be updated to thread the new types through. Adding one tag field is the minimum-blast-radius change and preserves the proven shape.
3. **Per-target asynchronous heading-line resolution** (after the build pass, in a follow-up tick). Rejected: the heading line is needed at panel-refresh time; computing it during the build pass under a small cache is simpler than two-phase refresh.
4. **Add a setting `markstudio.backlinks.headingLevel` or `markstudio.backlinks.markdownLinks`.** Rejected: the feature is additive and has no downside when on. Settings are configuration debt; defer until a user signal justifies one.
5. **Heading-level *nodes* in the Graph view** (one node per heading). Rejected for v1: explodes the node count, breaks layout determinism, and conflates this sprint with a graph redesign. ADR-0023 keeps the graph note-level.
6. **Per-kind edge weight split in the Graph view.** Deferred: edge weight collapses across both kinds; a single ordered pair gets one edge with weight summed. Per-kind rendering is a follow-up if a user signal justifies the visual complexity.
7. **Reference-style Markdown link indexing.** Deferred: would require a two-pass resolver (`[text][id]` plus `[id]: …`). Out of scope for v1 — most note-style writing uses inline links.
8. **Workspace-absolute Markdown links (`/docs/x.md`).** Deferred to a future sprint that has a multi-root strategy. v1 skips them rather than guess the root.
9. **Hover preview on standard Markdown links.** Deferred: the M4.2 hover path is wiki-link only and the preview's standard Markdown links already work via VS Code's default open behaviour. Adding a second delegated hover listener with its own security review is its own sprint.

### Reasoning
The ADR-0020 architecture was designed to accept exactly this widening: keeping the parser, the builder, and the resolver pure made adding a second extractor a *parallel* file rather than a refactor. Adding `kind` to `NoteLink` and `targetLine` to `Backlink` is a strictly additive widening — every existing test that does not look at `kind` or `targetLine` keeps passing untouched. Explicit-path resolution for Markdown links matches author intent (Markdown links are paths, not names) and avoids reintroducing the basename-collision risk in a multi-root vault for a syntax that already has no such convention. Computing heading lines in a per-build closure cache is the smallest possible reduction in `findHeadingLine` calls (O(distinct (target, heading) pairs) instead of O(backlinks)) without adding service-level state that could go stale. Keeping heading-level granularity confined to the index + Backlinks panel honours ADR-0023's "graph is note-level by design" without forcing a redesign of the graph data model.

### Consequences
**Positive:** Markdown-link backlinks and heading-level resolution land on **one** shared infrastructure with **zero** new runtime dependencies, settings, commands, messages, watchers, or scans. The Graph view picks up Markdown-link edges for free. The widening is additive — every M4.1 / T-4.1b / M4.2 / M4.4 test passes without modification. Closes Phase 4 with **no open follow-ups**.
**Negative / Trade-offs:** A Markdown link with a typo in the path is silently dropped (no panel entry) — author-explicit paths means a miss is the right signal. Reference-style links, bare-anchor links, and workspace-absolute (`/`-prefixed) Markdown links are not indexed in v1 — tracked deferrals. Edge weight collapses across both kinds in the Graph view, so a vault where two notes link via both kinds renders a single heavier edge with no per-kind breakdown. The heading-line cache is per-build; a build that touches a target's headings invalidates them naturally on the next rebuild, but a never-touched target's headings stay cached for the lifetime of the build, which is correct but worth noting.
**Neutral:** New pure `src/links/parseMarkdownTargets.ts`; `NoteLink.kind`, `Backlink.kind`, `Backlink.targetLine` added; `ParsedNote.text` added; `BacklinksTreeProvider` gains kind-aware icons + heading description + tooltip target-line. No new file outside `src/links/`.

### Compliance Impact
No rule bent. Upholds ADR-0005 (zero new dependencies), ADR-0008 (markdown-it / preview rendering untouched), ADR-0020 (one shared link index, one watcher, one async scan — additive widening of the same pure shape), ADR-0021/0022 (resolver remains the single source of truth for wiki-link navigation and hover preview), and ADR-0023 (the Graph view consumes `allEdges()` unchanged; heading granularity stays out of the graph by design). Realises the two carry-over follow-ups ADR-0020 §"Follow-Ups" listed.

### Migration Plan
Not a migration. `parseMarkdownTargets` is new and additive; `linkIndex.ts` adds `kind` to `NoteLink`, `kind` + `targetLine` to `Backlink`, and `text` to `ParsedNote`; `LinkIndexService.indexFile` runs both extractors and passes note text through; `BacklinksTreeProvider` renders the new fields. No protocol change, no setting, no command. Existing fixtures (wiki-only) round-trip unchanged.

### Follow-Ups
* Reference-style Markdown links (`[text][id]` + `[id]: ./note.md`) — two-pass resolver.
* Workspace-absolute (`/`-prefixed) Markdown link indexing, once a multi-root strategy lands.
* Per-kind edge weight split in the Graph view, if a user signal justifies the visual complexity.
* Hover preview on standard Markdown links (second delegated listener, its own security review).
* A Backlinks "group by target heading" view-mode, if heading-level visibility-as-suffix proves insufficient.
* Slug-based heading matching (shared with the outline) so headings containing inline Markdown (`## **Bold**`) resolve.

### References
* [ADR-0005](#adr-0005-vanilla-typescripthtmlcss--no-frameworks)
* [ADR-0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)
* [ADR-0021](#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message)
* [ADR-0022](#adr-0022-hover-preview-for-wiki-links-host-ships-markdown-text-webview-renders-it)
* [ADR-0023](#adr-0023-graph-view-host-side-pure-model--lazy-webview-canvas-zero-new-runtime-deps)
* [design/backlinks.md](design/backlinks.md) — v2 follow-ups section
* [ROADMAP.md](ROADMAP.md) — Phase 4 (closed)
* [TODO.md](TODO.md) — T-4.1a / T-4.1c

---

## ADR-0025: Templates engine: in-tree front-matter + variable expansion, native QuickPick, zero new deps

### Status
`Accepted`

### Date
2026-06-30

### Context
**M5.1 + M5.3** (Sprint 7) open **Phase 5 — Authoring Workflows** with the **Templates engine** and its first consumer, **Daily Notes**. A user needs to start a note from a reusable scaffold — a daily journal, a meeting note, a literature note — by expanding a small, predictable set of variables (date, title, slug, …), creating the file at a template-defined path, and opening it **in MarkStudio**. Daily Notes is the proof the engine generalises: "open today's note" is the engine resolving a configured template, expanding `{{date}}`, and create-or-opening the target — zero special-case logic.

The infrastructure to mirror already exists: `LinkIndexService` (ADR-0020) established the pure-core + one-service-owns-the-I/O shape (async non-blocking scan, `FileSystemWatcher`, 250 ms debounced rebuild, an `onDidChange*` event), and PR #4 / the ADR-0021 amendments established that **any** new file-open path must route through `provider.openInMarkStudio` / `vscode.openWith` → `markstudio.editor`, never `showTextDocument` — otherwise a not-yet-open note lands in the built-in text editor.

Four project-specific questions had to be settled: (1) whether to pull in libraries for templating (Handlebars / Mustache), YAML (`gray-matter`), and dates (`dayjs` / `date-fns`); (2) what the front-matter schema and the variable surface are; (3) how the two template roots (per-workspace, per-user) merge; and (4) the conflict policy when a template's output path already exists.

### Decision
1. **Zero new runtime dependencies — in-tree everything.** A ~30-line front-matter parser for a **fixed** `key: value` schema, an in-tree variable expander over a **closed allowlist**, and an in-tree date formatter built on `Intl.DateTimeFormat` parts. `gray-matter`, `dayjs`, `date-fns`, Handlebars, and Mustache are all rejected (ADR-0005). The variable set is ~16 closed tokens and the date format is a 5-token subset; both are a few dozen lines in-tree.
2. **Pure core + one vscode-aware service, mirroring `LinkIndexService` (ADR-0020).** Four pure modules under `src/templates/` — `frontMatterParser.ts`, `variableExpander.ts`, `dateFormatter.ts`, `templateResolver.ts` — import nothing from `vscode` and are unit-testable directly. A single `TemplateService` owns the two `FileSystemWatcher`s, the async (not-awaited) scan, the 250 ms debounced rebuild, the `onDidChangeTemplates` event, and the `vscode.env.clipboard.readText()` shim. A thin `registerTemplates.ts` owns the three commands and the native QuickPick / InputBox flow.
3. **Fixed front-matter schema; unknown keys round-trip.** Only `kind` (`"file"` default | `"snippet"`), `description`, `output` (required when `kind: file`), and `cursor` (optional 0-based line) are consumed. Unknown keys are kept verbatim in `meta.extras` for forward-compatibility but read by nothing this sprint. Malformed YAML → `meta = null`, `body = text`. **A template with no front-matter** is treated as `kind: file`, no `description`, `output: "{{filename}}.md"`. The parser supports exactly the fixed `key: value` subset (no nesting, no flow style, no block scalars) — anything richer is out of scope.
4. **Closed variable allowlist; everything else passes through verbatim.** Curly (`{{date}}`, `{{time}}`, `{{datetime}}`, `{{title}}`, `{{slug}}`, `{{filename}}`, `{{cursor}}`) and dollar (`$CURRENT_YEAR`, `$CURRENT_MONTH`, `$CURRENT_DATE`, `$CURRENT_HOUR`, `$CURRENT_MINUTE`, `$TM_FILENAME`, `$TM_FILENAME_BASE`, `$WORKSPACE_NAME`, `$CLIPBOARD`) tokens are substituted; anything not on the list — including **snippet placeholders `${1}` / `${1:default}` / `${0}`** — is left intact, no error, no warning. Snippet placeholders must survive Sprint 7 untouched so Sprint 8's CodeMirror tab-stop path can consume them. `{{slug}}` is `kebab-case({{title}})`, deterministic.
5. **Date formatter is `Intl.DateTimeFormat`-parts, `YYYY/MM/DD/HH/mm` only.** Any other character in the pattern passes through verbatim. Built on `Intl.DateTimeFormat` *parts* concatenated by token (never hand-rolled TZ math) so DST and multi-TZ machines stay correct; defaults to the runtime's effective timezone; tests pass a fixed `Date` so they are TZ-agnostic.
6. **Two-root merge, workspace wins by basename.** Templates come from `<workspaceFolder>/.markstudio/templates/**/*.md` and `<globalStorageUri>/templates/**/*.md`. The pure `templateResolver` merges by **canonical basename** (case-insensitive — the same identity convention the link index uses for notes), **workspace wins**, stable sort by display name. Multi-root: workspace lookup walks `vscode.workspace.workspaceFolders` in order, **first-root-wins** (active-root-wins is a deferred refinement). User templates fill in any basename not present in any workspace folder.
7. **No overwrite, ever — create-if-missing / open-if-exists.** When a template's expanded `output:` already exists, the engine opens the existing file and surfaces a status-bar info message `Template target exists — opening.` Daily Notes and `openExample` follow the identical rule.
8. **Every file open routes through `vscode.openWith` → `markstudio.editor`.** Never `showTextDocument`. This is the PR #4 / ADR-0021 lesson applied to a new file-creation code path — a not-yet-open note must land in MarkStudio, not the built-in text editor.
9. **No auto-bootstrap — empty state is a teaching opportunity.** When both roots resolve empty, the QuickPick shows a single non-selectable hint item pointing at `.markstudio/templates/` and the opt-in `MarkStudio: Create Example Template` command. The picker never silently dismisses. The folder is never created behind the user's back.
10. **Native QuickPick / InputBox only — no webview, no protocol change, no new bundle.** The whole feature is host-side: no editor-webview change, no message-protocol change, no `esbuild.js` change. Title InputBox is always shown for `kind: file` (empty submission defaults `{{title}}` to the template basename). Daily Notes is one-key — no picker, no InputBox.
11. **Three commands, five settings, no keybinding, no view, no Memento.** `markstudio.templates.create`, `markstudio.templates.openExample`, `markstudio.dailyNotes.openToday`; `templates.workspaceFolder` / `templates.userFolder` / `dailyNotes.template` / `dailyNotes.folder` / `dailyNotes.dateFormat`. No keybinding contribution (revisit only if F5 shows discoverability is a gap); no tree view; no Memento (template selection is one-shot).

### Alternatives Considered
1. **`gray-matter` for front-matter + `dayjs`/`date-fns` for dates + Handlebars/Mustache for templating.** Rejected: violates ADR-0005. The schema is a fixed `key: value` subset, the date format is 5 tokens, and the variable set is a closed allowlist — each is a few dozen lines in-tree with no library's surface area or supply-chain weight.
2. **A template gallery / preview pane / editor webview.** Rejected at brainstorm: violates "no fake chrome / less UI is better / native beats custom." Users author templates as plain `.md` files; the picker is a native QuickPick.
3. **Auto-bootstrap `.markstudio/templates/` on activation.** Rejected at brainstorm: an empty folder is a teaching opportunity, not a bug. `MarkStudio: Create Example Template` is the opt-in on-ramp.
4. **Overwrite (or prompt to overwrite) on an output-path collision.** Rejected: silently destroying a user's note is the worst possible outcome; create-if-missing / open-if-exists is predictable and matches Daily Notes' natural behaviour.
5. **`showTextDocument` for the new note.** Rejected: it opens the built-in text editor for a not-yet-open note — the exact PR #4 / ADR-0021 defect. `vscode.openWith` → `markstudio.editor` is the only correct path.
6. **A full VS Code snippet grammar now** (`${1|a,b,c|}` choices, `${1/regex/replace/}` transforms, nested placeholders). Deferred: v1 recognises and passes through `${N}` placeholders; Sprint 8 (M5.2) owns the CodeMirror expansion path.
7. **Active-root-wins multi-root precedence.** Deferred: first-root-wins is simpler to reason about and matches `findFiles` default ordering; revisit on a user signal.
8. **Per-template keybindings / `/template-name` autocompletion / usage stats.** All deferred — not in scope for a v1 engine.
9. **A `markstudio.templates.enabled` setting.** Rejected: the commands are the surface; nothing runs unless the user invokes one, so the default cost is zero.

### Reasoning
The `LinkIndexService` pattern (ADR-0020) was designed to be reused: a pure core behind a single I/O-owning service makes the genuinely testable pieces (parsing, expansion, formatting, precedence) unit-testable without booting VS Code, and confines all the watcher / scan / debounce machinery to one place. The variable set is small and *closed* on purpose — a template author can predict exactly what will be substituted, and the closed list is what lets snippet placeholders survive untouched into Sprint 8. Building the date formatter on `Intl.DateTimeFormat` parts avoids both a dependency and the classic hand-rolled-TZ bugs. Routing every open through `vscode.openWith` is non-negotiable: it is the single lesson PR #4 / ADR-0021 paid for, and the only path that keeps a freshly-created note in MarkStudio. No-overwrite and no-auto-bootstrap both choose the least-surprising, least-destructive behaviour, which is the right default for a tool that touches the user's files.

### Consequences
**Positive:** A first-party-feeling "new note from template" + "open today's note" workflow with **zero** new runtime dependencies, no webview change, no protocol change, and no new bundle. The pure modules are unit-testable in isolation; the service mirrors a proven shape. Daily Notes reuses the engine with no special logic. The engine already ships `kind: snippet` + `getTemplates("snippet")` so Sprint 8 only adds the CodeMirror expansion path. Host bundle grows by a small additive delta (target +6–10 kB); the editor webview is untouched.
**Negative / Trade-offs:** The in-tree YAML parser supports only the fixed `key: value` subset — a template author who writes nested or flow-style YAML gets it dropped to `meta.extras` or `meta = null`. Snippet placeholders in a `kind: file` template land as literal `${1}` text (F5-verified; revisit in Sprint 8 if it surprises). First-root-wins can surprise a multi-root user whose active editor is not in workspace-folder index 0 (the QuickPick `detail` slot surfaces the source root to mitigate). Reference-style date tokens beyond `YYYY/MM/DD/HH/mm`, active-root precedence, template categories, per-template keybindings, and `$CLIPBOARD` failure dialogs are all deferred.
**Neutral:** New `src/templates/` module (`frontMatterParser.ts`, `variableExpander.ts`, `dateFormatter.ts`, `templateResolver.ts`, `TemplateService.ts`) + `src/commands/registerTemplates.ts`; three new commands, five new settings, three new palette entries in `package.json`; one new line in `extension.ts`. No new dependency, no new view, no new keybinding, no new message, no `esbuild.js` change.

### Compliance Impact
No rule bent. Upholds ADR-0001 (the host reads/writes files and opens the custom editor via supported APIs), ADR-0002 (no webview recreation — the feature never touches the webview), ADR-0004 (reuses `createFileSystemWatcher` and VS Code's Configuration API; native QuickPick theming), ADR-0005 (vanilla TypeScript, zero new runtime dependencies, four pure modules), ADR-0006 (no new esbuild bundle), and ADR-0020 (mirrors the pure-core + one-I/O-service shape, one watcher pattern per root, async non-blocking scan). Applies the PR #4 / ADR-0021 amendment (open in MarkStudio via `vscode.openWith`, never `showTextDocument`) to a new file-creation path.

### Migration Plan
Not a migration. New files under `src/templates/` and `src/commands/registerTemplates.ts`; `src/extension.ts` constructs one `TemplateService` (pushed to `context.subscriptions`) and calls `registerTemplates(context, service)`; `package.json` contributes three commands, five settings, three palette entries. No existing behaviour changes; no message-protocol change; no stored-state migration.

### Follow-Ups
* **M5.2 Snippets** (Sprint 8) — CodeMirror tab-stop expansion of the `${N}` placeholders the engine already preserves.
* **Full VS Code snippet grammar** — choices `${1|a,b,c|}`, transforms `${1/regex/replace/}`, nested placeholders.
* **Active-root-wins** multi-root precedence, on a user signal.
* **More date tokens** beyond `YYYY/MM/DD/HH/mm`, by extending the in-tree formatter.
* **Template categories / nested-folder picker**, if the flat QuickPick grows unwieldy on a large vault.
* **Per-template keybindings**, **`/template-name` autocompletion**, **usage stats** — deferred.
* **M5.4 Workspace note features** — deferred until Sprint 7 + 8 adoption data exists.

### References
* [ADR-0001](#adr-0001-use-the-custom-editor-api)
* [ADR-0002](#adr-0002-one-persistent-webview-retained-when-hidden)
* [ADR-0004](#adr-0004-rely-on-vs-code-for-theming-autosave-and-file-watching)
* [ADR-0005](#adr-0005-vanilla-typescripthtmlcss--no-frameworks)
* [ADR-0006](#adr-0006-bundle-with-esbuild)
* [ADR-0020](#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)
* [ADR-0021](#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message)
* [design/templates.md](design/templates.md)
* [ROADMAP.md](ROADMAP.md) — Phase 5 (M5.1 + M5.3)
* [TODO.md](TODO.md) — M5.1 / M5.3
