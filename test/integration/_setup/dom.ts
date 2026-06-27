// Integration-test DOM harness (T-113, ADR-0012).
//
// The webview seams under integration test — CodeMirror 6 (`createEditor`) and
// the markdown-it preview (`createPreviewRenderer`) — touch real DOM APIs
// (`document`, `window`, `requestAnimationFrame`, MutationObserver, …) that the
// pure unit layer (T-112) deliberately avoids. This module stands up a single
// jsdom document and installs its globals on `globalThis` so those source
// modules run unmodified under Node's test runner (`node:test`).
//
// It runs as a **top-level side effect**: the integration entry imports this
// file first (see `esbuild.integration.js`), so the DOM globals exist before
// any source module — and therefore before CodeMirror — is evaluated.

import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  // Provides requestAnimationFrame / cancelAnimationFrame, which CodeMirror's
  // view layer schedules measurements through.
  pretendToBeVisual: true,
  url: "http://localhost/"
});

const { window } = dom;

// Copy every window-owned global that isn't already present on the Node global,
// so DOM constructors (HTMLElement, Element, Node, Range, MutationObserver, …)
// and helpers (getComputedStyle, requestAnimationFrame, …) resolve at runtime.
const target = globalThis as unknown as Record<string, unknown>;
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in target) {
    continue;
  }
  const value = (window as unknown as Record<string, unknown>)[key];
  if (typeof value === "function") {
    target[key] = (value as (...args: unknown[]) => unknown).bind(window);
  } else {
    target[key] = value;
  }
}

// A few globals must point at the jsdom implementations even though Node 20
// ships its own (read-only) versions, so define them explicitly.
function force(key: string, value: unknown): void {
  Object.defineProperty(globalThis, key, {
    value,
    configurable: true,
    writable: true
  });
}

force("window", window);
force("document", window.document);
force("navigator", window.navigator);
force("requestAnimationFrame", window.requestAnimationFrame.bind(window));
force("cancelAnimationFrame", window.cancelAnimationFrame.bind(window));
force("getComputedStyle", window.getComputedStyle.bind(window));

// jsdom does not implement ResizeObserver; CodeMirror feature-detects it but
// constructs one when present, so provide an inert stand-in. The integration
// tests assert document content and node identity, not pixel layout, so a
// no-op observer is sufficient.
if (!("ResizeObserver" in target)) {
  class NoopResizeObserver {
    public observe(): void {
      /* no layout in jsdom */
    }
    public unobserve(): void {
      /* no layout in jsdom */
    }
    public disconnect(): void {
      /* no layout in jsdom */
    }
  }
  force("ResizeObserver", NoopResizeObserver);
}

// Provide a fresh, detached container appended to the jsdom body. Each test
// gets its own so DOM state never leaks between cases.
export function createContainer(): HTMLElement {
  const container = window.document.createElement("div");
  window.document.body.append(container);
  return container;
}

// Remove a container created by `createContainer` from the document.
export function removeContainer(container: HTMLElement): void {
  container.remove();
}
