# Design — Footnotes & GFM completeness (T-3.5, Phase 3 M3.5)

> Pre-implementation design for footnotes, GFM task lists, tables, and strikethrough in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0019](../DECISIONS.md#adr-0019-footnotes--gfm-completeness-plugin-for-footnotes-built-ins--an-in-tree-rule-for-the-rest).

## Problem

Phase 3 (M3.5) closes the milestone set by adding four Markdown features to the preview, each **individually toggleable** and **degrading gracefully** when off:

```markdown
Here is a footnote.[^1]

[^1]: And its definition.

- [ ] A task not done
- [x] A task done

| A | B |
| - | - |
| 1 | 2 |

This is ~~struck through~~.
```

Each must attach to the existing markdown-it preview pipeline, be controllable via its own `markstudio.preview.*` setting, and theme entirely via `--vscode-*` variables.

## Options considered (per feature)

The Producer decided **one setting per feature** (not a combined `gfm` toggle), so each can be sourced independently:

1. **Tables & strikethrough** — already shipped in markdown-it's *default* preset; no dependency. Toggle by disabling the built-in `table` / `strikethrough` rulers when off.
2. **Task lists** — a dependency-free in-tree core rule (`src/webview/preview/taskLists.ts`), mirroring callouts (T-3.3) and wiki links (T-3.4). Checkboxes render **disabled** (read-only) this sprint. Rejected an npm plugin: the algorithm is ~30 lines and a plugin's label-wrapper / write-back affordances are unwanted now.
3. **Footnotes** — the one genuinely non-trivial feature (two-pass parse, numbering, back-links). Use the canonical `markdown-it-footnote` plugin rather than re-implementing it in-tree.

See [ADR-0019](../DECISIONS.md#adr-0019-footnotes--gfm-completeness-plugin-for-footnotes-built-ins--an-in-tree-rule-for-the-rest) for the full rationale.

## Data flow

```
config.{footnotes,taskLists,tables,strikethrough} (host, markstudio.preview.*)
        │  init / configChanged { config }
        ▼
PreviewRenderer.setConfig(config)
        │  rebuilds markdown-it: md.use(footnote) / applyTaskLists(md) /
        │  md.disable("table") / md.disable("strikethrough") as the flags say
        ▼
md.parse → tokens → [core rules: footnote_tail, markstudio_task_lists]
        ▼
block groups → md.renderer.render → incremental DOM patch (unchanged)
```

When a flag is off, its plugin/rule is simply not applied (footnotes, task lists) or its built-in ruler is disabled (tables, strikethrough), so the source degrades to literal text / plain paragraphs — nothing breaks. One markdown-it instance stays on the hot typing path; it is rebuilt only when a flag actually flips (ADR-0008).

## Files

* `src/messaging/messages.ts` — `MarkStudioConfig` gains `footnotes` / `taskLists` / `tables` / `strikethrough` (booleans); `isMarkStudioConfig` validates them.
* `src/services/ConfigurationService.ts` — `read` resolves each `preview.*` key (default `true`).
* `package.json` — contributes the four `markstudio.preview.*` settings (boolean, default `true`, `resource` scope). Adds `markdown-it-footnote` (runtime) + `@types/markdown-it-footnote` (dev).
* `src/webview/preview/taskLists.ts` (new) — `applyTaskLists(md)`: the core rule + class constants. No `import` of any new package.
* `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid, callouts, wikiLinks, footnotes, taskLists, tables, strikethrough)` wires each feature; `setConfig` rebuilds when any preview flag flips.
* `src/webview/main.ts` — themed footnote, task-list-checkbox, and strikethrough (`<s>`/`<del>`) styling driven entirely by `--vscode-*` variables (tables were already themed).

## Public surface added

* Settings `markstudio.preview.footnotes`, `markstudio.preview.taskLists`, `markstudio.preview.tables`, `markstudio.preview.strikethrough` (boolean, default `true`, `resource` scope).
* `MarkStudioConfig.{footnotes,taskLists,tables,strikethrough}` fields on the `init` / `configChanged` messages.
* No new message type.

## Rendered markup & theming

| Feature | Markup | Themed selectors |
| ------- | ------ | ---------------- |
| Footnotes | `markdown-it-footnote` defaults | `.footnote-ref a`, `.footnote-backref`, `.footnotes-sep`, `.footnotes`, `.footnotes-list`, `.footnote-item` |
| Task lists | `<input class="markstudio-task-list-checkbox" disabled>` on `li.markstudio-task-list-item` inside `ul.markstudio-task-list` | checkbox `accent-color`; list-style stripped |
| Tables | markdown-it built-in `<table>/<th>/<td>` | already themed in `main.ts` |
| Strikethrough | markdown-it built-in `<s>` | `del, s` → `line-through` + `--vscode-descriptionForeground` |

## Decisions & trade-offs

* **One dependency, for one feature.** `markdown-it-footnote` (the markdown-it org's own, ~11 KB, no transitive deps) for footnotes only; tables/strikethrough use built-ins; task lists are in-tree. See ADR-0019.
* **Task-list checkboxes are read-only.** The injected `<input>` is always `disabled` — no write-back to the source this sprint (Producer decision). Interactive toggling is a Phase 4-style follow-up.
* **The checkbox is an `html_inline` token.** markdown-it emits `html_inline` content verbatim regardless of `html: false`, so the (trusted, fixed) checkbox markup is injected without enabling raw HTML anywhere else.
* **Rebuild on toggle, not per keystroke.** Consistent with the other Phase 3 toggles (ADR-0008).
* **Theme via `--vscode-*` only.** No hard-coded colours, no custom design system.

## Verification

The integration tests (jsdom) cover the markdown-it seam for each feature: rendered when on (footnote ref + section, two disabled checkboxes with correct checked state, a `<table>`, a `<s>`), degraded when off (literal `[^1]` / `[ ]` text, plain-text table source, literal `~~`), an ordinary list/link left untouched, and the live `setConfig` toggle. The visual theming across light/dark/high-contrast stays in the manual Extension Development Host matrix.
