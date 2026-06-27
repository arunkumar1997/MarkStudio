# Design — Math Rendering (T-3.1, Phase 3 M3.1)

> Pre-implementation design for inline and block math in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0015](../DECISIONS.md#adr-0015-katex-for-math-rendering-in-the-preview).

## Problem

Phase 3 (M3.1) calls for inline (`$…$`) and block (`$$…$$`) math rendering. It must attach to the existing markdown-it preview pipeline, be **individually toggleable** via configuration, and **degrade gracefully** when disabled — the delimiters must never break the surrounding render.

## Options considered

1. **KaTeX via `@vscode/markdown-it-katex`** — KaTeX renders TeX to HTML + CSS synchronously, with no runtime layout reflow loop. The `@vscode/markdown-it-katex` plugin is the same one VS Code's built-in Markdown math uses; it is actively maintained and MIT-licensed.
2. **MathJax** — Heavier, asynchronous, larger bundle; rendering fidelity is marginally higher but the size and async complexity are not worth it for a preview pane.
3. **A hand-rolled parser** — Rejected outright: re-implementing TeX layout is out of scope and would never match KaTeX.

**Chosen: option 1.** KaTeX is fast, synchronous (fits the existing block-diff render loop), small relative to MathJax, and the VS Code plugin gives us robust `$`/`$$` delimiter parsing for free.

## Data flow

```
config.math (host, markstudio.preview.math)
        │  init / configChanged { config }
        ▼
PreviewRenderer.setConfig(config)
        │  rebuilds the markdown-it instance with/without md.use(markdownItKatex)
        ▼
md.parse → tokens → block groups → md.renderer.render (KaTeX emits .katex spans)
        │
        ▼
incremental DOM patch (unchanged: longest-common-prefix/suffix)
```

When `math` is off, no plugin is applied, so `$a^2$` renders as literal text — nothing breaks.

## Files

* `src/messaging/messages.ts` — `MarkStudioConfig` gains `math: boolean`; `isMarkStudioConfig` validates it.
* `src/services/ConfigurationService.ts` — `read` resolves `preview.math` (default `true`).
* `package.json` — contributes `markstudio.preview.math` (boolean, default `true`, `resource` scope).
* `src/webview/preview/PreviewRenderer.ts` — `createPreviewRenderer(parent, initialConfig)`; new `createMarkdownIt(math)` factory wires `markdownItKatex` with `throwOnError: false`; new `setConfig(config)` rebuilds the instance and re-renders the last text when the `math` flag flips.
* `src/webview/main.ts` — passes `message.config` to the renderer; `configChanged` / re-`init` call `preview.setConfig`.
* `src/editor/webviewHtml.ts` — loads `dist/katex/katex.min.css` via `asWebviewUri`.
* `esbuild.js` — `copyKatexAssets()` copies `katex.min.css` + the `fonts/` directory into `dist/katex/`.

## Public surface added

* Setting `markstudio.preview.math` (boolean, default `true`, `resource` scope).
* `MarkStudioConfig.math` field on the `init` / `configChanged` messages.
* No new message type.

## Decisions & trade-offs

* **Rebuild the markdown-it instance on toggle, not per keystroke.** markdown-it plugins cannot be cleanly detached once applied, so `setConfig` rebuilds the instance only when the `math` flag actually changes — a rare settings event, never a typing cost. The single-long-lived-instance spirit of ADR-0008 holds for the hot path.
* **Bundle KaTeX unconditionally; the toggle controls rendering, not bundling.** The plugin imports `katex`, so it is always in the webview bundle (~270 KB minified). Disabling `markstudio.preview.math` stops *rendering* math; it does not lazy-unload the library. This keeps the CSP, nonce, and load path simple (no dynamic script injection). Acceptable per "degrades gracefully when disabled."
* **Fonts ship locally.** `katex.min.css` references its fonts via relative `fonts/*` URLs; copying the `fonts/` directory next to the CSS lets the existing `font-src ${webview.cspSource}` CSP rule serve them with no remote fetch (same pattern as Codicons, T-107).
* **`throwOnError: false`.** A malformed expression renders in KaTeX's error color instead of throwing, so a typo can never break the whole preview.
