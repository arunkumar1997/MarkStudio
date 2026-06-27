// Lazy-loaded Mermaid bundle entry (T-3.2, ADR-0016).
//
// This module is built as a **separate** esbuild target (`dist/mermaid.js`)
// that is NOT part of the main webview bundle. It is injected as a `<script>`
// only the first time the preview encounters a ```mermaid block, so the heavy
// Mermaid library (several MB) never inflates the base webview download for
// the majority of documents that contain no diagrams.
//
// The bundle's only job is to publish the Mermaid API on a well-known global
// the loader (`mermaid.ts`) then picks up; see `loadMermaid`.

import mermaid from "mermaid";

// Structural assignment — the loader reads this back through a minimal
// interface so the main bundle never imports `mermaid` itself.
(window as unknown as { __markstudioMermaid?: unknown }).__markstudioMermaid =
  mermaid;
