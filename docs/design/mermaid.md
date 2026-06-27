# Design — Mermaid Diagrams (T-3.2, Phase 3 M3.2)

> Pre-implementation design for rendering fenced ```mermaid blocks in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0016](../DECISIONS.md#adr-0016-lazy-loaded-mermaid-for-diagram-rendering-in-the-preview).

## Problem

Phase 3 (M3.2) calls for rendering fenced ```mermaid blocks as diagrams in the preview. It must attach to the existing markdown-it preview pipeline, be **individually toggleable** via configuration, and **degrade gracefully** when disabled — a `mermaid` block must fall back to a normal code block and never break the surrounding render.

Two properties make Mermaid different from math (T-3.1, KaTeX):

* **Size.** Mermaid is ~3.3 MB minified — more than 3× the entire current webview bundle. Always bundling it (as KaTeX is) would make every document pay that download even when it contains no diagrams.
* **Async.** Mermaid's `render` returns a Promise; it cannot run synchronously inside the existing block-diff render loop.

## Options considered

1. **Lazy-load Mermaid as a separate bundle** — ship `dist/mermaid.js` as its own esbuild target, injected on first use with the page nonce. Base webview stays small; the heavy library loads only when a diagram is first seen.
2. **Bundle Mermaid unconditionally** (the KaTeX/ADR-0015 pattern) — simplest, but adds ~3.3 MB to every load.
3. **esbuild code splitting** — requires `format: "esm"` for the webview, complicating the nonce/CSP load path.

**Chosen: option 1.** A separate IIFE bundle injected with the existing nonce needs no CSP change (a nonce-bearing `<script>` is allowed regardless of its `src`) and keeps the base download essentially unchanged.

## Data flow

```
config.mermaid (host, markstudio.preview.mermaid)
        │  init / configChanged { config }
        ▼
PreviewRenderer.setConfig(config)
        │  rebuilds markdown-it with/without the mermaid fence override
        ▼
md.parse → tokens → block groups → md.renderer.render
        │  a ```mermaid fence → <div class="markstudio-mermaid">…source…</div>
        ▼
incremental DOM patch (unchanged: longest-common-prefix/suffix)
        │
        ▼  (fire-and-forget, async)
renderMermaidBlocks(root)
        │  first call lazy-injects dist/mermaid.js (nonce-bearing <script>)
        ▼  mermaid.render(id, source) → SVG → container.innerHTML
```

When `mermaid` is off, the fence override is not applied, so a ```mermaid block renders as a plain `<pre><code>` — nothing breaks.

## Files

* `src/messaging/messages.ts` — `MarkStudioConfig` gains `mermaid: boolean`; `isMarkStudioConfig` validates it.
* `src/services/ConfigurationService.ts` — `read` resolves `preview.mermaid` (default `true`).
* `package.json` — contributes `markstudio.preview.mermaid` (boolean, default `true`, `resource` scope); adds `mermaid` as a runtime dependency.
* `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid)` applies the mermaid fence override; `render` calls `renderMermaidBlocks(root)` after `patch` when mermaid is on; `setConfig` rebuilds when `math` **or** `mermaid` flips.
* `src/webview/preview/mermaid.ts` (new) — the lazy loader (`loadMermaid`) and async render pass (`renderMermaidBlocks`); talks to Mermaid only through a minimal interface so the **main bundle never imports `mermaid`**.
* `src/webview/preview/mermaidEntry.ts` (new) — the separate-bundle entry that publishes the Mermaid API on a global.
* `src/editor/webviewHtml.ts` — exposes the lazy bundle URI via `data-mermaid-src` on the root element and gives the bootstrap script an id so the loader can reuse its nonce.
* `esbuild.js` — third build target bundling `mermaidEntry.ts` → `dist/mermaid.js`.
* `src/webview/main.ts` — themed `.markstudio-mermaid` container styling.

## Public surface added

* Setting `markstudio.preview.mermaid` (boolean, default `true`, `resource` scope).
* `MarkStudioConfig.mermaid` field on the `init` / `configChanged` messages.
* No new message type.

## Decisions & trade-offs

* **Lazy-load, don't bundle.** Mermaid is too large to ship to documents that have no diagrams. A separate bundle injected with the page nonce keeps the base webview at ~974 KB while Mermaid (~3.3 MB) loads only on first use. See ADR-0016.
* **Placeholder-then-fill, keyed to the source.** The fence emits a container holding the escaped source; an async pass fills it with SVG and marks it rendered. Because the cached block HTML encodes the source, an unchanged diagram keeps its node (and SVG) across edits, while an edited diagram is swapped for a fresh, unrendered container — consistent with the ADR-0008 block diff.
* **Graceful degradation at two levels.** If the library fails to load, the raw source stays visible; if a single diagram fails to parse, only that diagram's box shows the error. `securityLevel: "strict"` runs input through DOMPurify.
* **Theme detected once at load.** The Mermaid theme is chosen from the VS Code body classes when the library loads; a live theme switch does not re-theme already-rendered diagrams until the next edit. Minor debt, acceptable for v1.
* **No new message type.** The toggle reuses the `MarkStudioConfig` + `configChanged` seam (T-111).

## Verification

The integration tests (jsdom) cover the markdown-it seam: placeholder emission when on, code-block fallback when off, non-mermaid fences untouched, and the live `setConfig` toggle. Mermaid's actual in-webview rendering (SVG output, theming, async fill) cannot be exercised under jsdom and stays in the manual Extension Development Host matrix.
