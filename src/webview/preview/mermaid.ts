// Mermaid diagram rendering for the preview (T-3.2, M3.2, ADR-0016).
//
// Mermaid is large and asynchronous, unlike KaTeX (T-3.1). To keep the base
// webview bundle small it is shipped as a **separate** bundle (`dist/mermaid.js`,
// built from `mermaidEntry.ts`) and **lazy-loaded on first use**: the very
// first time the preview renders a ```mermaid block we inject a `<script>`
// carrying the page nonce, which publishes the Mermaid API on a global. Every
// later diagram reuses the already-loaded library.
//
// This module must NOT `import mermaid` — doing so would pull the library into
// the main webview bundle and defeat the lazy load. It talks to the lazily
// loaded library through the minimal `MermaidApi` interface below.

// The slice of Mermaid's surface the preview uses. Kept intentionally minimal
// so the main bundle never depends on Mermaid's types.
interface MermaidApi {
  initialize(config: Record<string, unknown>): void;
  render(id: string, text: string): Promise<{ readonly svg: string }>;
}

declare global {
  interface Window {
    __markstudioMermaid?: MermaidApi;
  }
}

// CSS class the preview fence renderer stamps on a pending diagram container.
export const MERMAID_BLOCK_CLASS = "markstudio-mermaid";
// Marks a container whose diagram has already been rendered (or has failed),
// so a later re-render of an unchanged block does not redraw it.
const RENDERED_ATTR = "data-mermaid-rendered";

let mermaidPromise: Promise<MermaidApi> | null = null;
let initialized = false;
let renderCounter = 0;

// Resolve the active VS Code theme to a Mermaid theme name. The webview body
// carries `vscode-dark` / `vscode-high-contrast` classes; everything else is
// treated as a light theme.
function detectTheme(): string {
  const classes = document.body.classList;
  if (
    classes.contains("vscode-dark") ||
    classes.contains("vscode-high-contrast")
  ) {
    return "dark";
  }
  return "default";
}

function configure(mermaid: MermaidApi): MermaidApi {
  if (!initialized) {
    mermaid.initialize({
      startOnLoad: false,
      // `strict` runs Mermaid's input through DOMPurify and never injects raw
      // HTML — appropriate inside the CSP-locked webview.
      securityLevel: "strict",
      // Do NOT let Mermaid paint its built-in "Syntax error" diagram into the
      // page. By default a parse error makes Mermaid inject an error graphic
      // (the bomb SVG) into the document body — outside our preview root — and
      // it is never cleaned up, so it lingers even after the user fixes the
      // diagram. With this on, `render` simply rejects and we show our own
      // inline message in the offending block instead (T-3.2 bug fix).
      suppressErrorRendering: true,
      theme: detectTheme(),
      fontFamily: "var(--vscode-font-family)"
    });
    initialized = true;
  }
  return mermaid;
}

// Lazily load (once) and return the Mermaid API. Rejects if the bundle URI is
// unavailable (e.g. under the jsdom test harness) or the script fails to load,
// in which case the caller leaves the raw diagram source visible.
function loadMermaid(): Promise<MermaidApi> {
  if (mermaidPromise) {
    return mermaidPromise;
  }
  mermaidPromise = new Promise<MermaidApi>((resolve, reject) => {
    const existing = window.__markstudioMermaid;
    if (existing) {
      resolve(configure(existing));
      return;
    }
    const root = document.getElementById("markstudio-root");
    const src = root?.dataset.mermaidSrc;
    if (!src) {
      reject(new Error("mermaid bundle URI unavailable"));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    // Reuse the bootstrap script's nonce so the injected script satisfies the
    // strict `script-src 'nonce-…'` CSP without exposing the nonce elsewhere.
    const nonce = document.getElementById("markstudio-bootstrap")?.nonce;
    if (nonce) {
      script.nonce = nonce;
    }
    script.onload = (): void => {
      const api = window.__markstudioMermaid;
      if (api) {
        resolve(configure(api));
      } else {
        reject(new Error("mermaid bundle did not publish its API"));
      }
    };
    script.onerror = (): void => reject(new Error("mermaid bundle failed"));
    document.head.append(script);
  });
  return mermaidPromise;
}

// Render every not-yet-rendered ```mermaid container under `root`. Fire-and-
// forget: the caller never awaits this so the hot render path stays sync.
// Degrades gracefully — a load failure leaves the raw source visible, and a
// single diagram's parse error is shown only in that diagram's box.
export function renderMermaidBlocks(root: HTMLElement): void {
  const pending = Array.from(
    root.querySelectorAll<HTMLElement>(
      `.${MERMAID_BLOCK_CLASS}:not([${RENDERED_ATTR}])`
    )
  );
  if (pending.length === 0) {
    return;
  }
  void draw(pending);
}

async function draw(blocks: ReadonlyArray<HTMLElement>): Promise<void> {
  let mermaid: MermaidApi;
  try {
    mermaid = await loadMermaid();
  } catch {
    // Library unavailable — leave the raw source visible (graceful fallback).
    return;
  }
  for (const block of blocks) {
    if (!block.isConnected || block.hasAttribute(RENDERED_ATTR)) {
      continue;
    }
    const source = block.textContent ?? "";
    const id = `markstudio-mermaid-${++renderCounter}`;
    try {
      const { svg } = await mermaid.render(id, source);
      if (!block.isConnected) {
        continue;
      }
      block.innerHTML = svg;
      block.setAttribute(RENDERED_ATTR, "true");
    } catch (error) {
      if (!block.isConnected) {
        continue;
      }
      block.textContent = `Mermaid error: ${
        error instanceof Error ? error.message : String(error)
      }`;
      block.classList.add("markstudio-mermaid-error");
      block.setAttribute(RENDERED_ATTR, "true");
    } finally {
      // Mermaid appends a temporary measurement element (id `d<id>`) to the
      // document body while rendering. It is normally removed on success, but
      // a failed render can leave it behind — outside our preview root, where
      // `patch` never reaches it. Remove it explicitly so nothing lingers.
      document.getElementById(`d${id}`)?.remove();
    }
  }
}
