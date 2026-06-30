// In-preview standard-markdown-link click handling (ADR-0021 amendment 2026-06-30).
//
// Markdown-it renders `[label](./Other.md)` as a plain `<a href="…">` in the
// preview. PR #4's first amendment made wiki-links (`[[note]]`, no `href`,
// handled by `wikiLinkClick.ts`) and the Backlinks panel open `.md` targets in
// MarkStudio with the pending-reveal handshake. This handler extends that fix
// to standard markdown links so any href pointing at a workspace `.md`
// (`./file.md`, `subdir/file.md`, `../file.md`, `/docs/x.md`, with an optional
// `#heading` fragment) opens the target in MarkStudio too — instead of falling
// through to the webview's default anchor behaviour, which navigates the
// iframe to a useless `vscode-webview://…` URL.
//
// Like the wiki-link click handler, this is a **single delegated** click
// listener on the persistent preview pane (`shell.previewPane`, never replaced
// per ADR-0002), so it survives every incremental preview patch with no
// per-anchor binding.

import type { WebviewMessageBus } from "../../messaging/WebviewMessageBus";

// `data-wikilink-target` attribute stamped on a rendered `[[wiki-link]]`
// anchor by `wikiLinks.ts`. Anchors carrying it are owned by
// `wikiLinkClick.ts`; this handler ignores them so wiki-link clicks are not
// double-handled (a wiki-link anchor has no `href` today, but the guard keeps
// the two handlers strictly disjoint).
const WIKILINK_TARGET_ATTR = "data-wikilink-target";

// Pure classification helpers. Exported for unit tests and consumed by the
// delegated listener below; both run in the webview bundle, which imports
// nothing from `vscode` or Node.

// `true` when `href` starts with a URL scheme (e.g. `http:`, `https:`,
// `mailto:`, `vscode:`, `command:`). External hrefs are left to the webview's
// default behaviour — we never intercept them.
export function isExternalHref(href: string): boolean {
  // RFC 3986 scheme: ALPHA *( ALPHA / DIGIT / "+" / "-" / "." ) ":"
  return /^[a-z][a-z0-9+\-.]*:/i.test(href);
}

// Parsed local markdown href: a workspace-relative or workspace-absolute path
// to a `.md` / `.markdown` file with an optional URL fragment.
export interface LocalMarkdownHref {
  // The raw path part of the href (everything before `#`), URL-decoded.
  readonly target: string;
  // The fragment (everything after `#`), URL-decoded, or `null` when absent /
  // empty.
  readonly heading: string | null;
}

// Classify a raw `href` from a preview anchor. Returns the parsed local target
// when this handler should claim it, else `null` (the click is then left to
// default behaviour). Rejects external schemes, fragment-only same-document
// links (`#section`), empty hrefs, and anything not ending in `.md` /
// `.markdown` (after stripping the fragment and any query string).
export function parseLocalMarkdownHref(href: string): LocalMarkdownHref | null {
  if (href.length === 0) {
    return null;
  }
  if (isExternalHref(href)) {
    return null;
  }
  // Same-document fragment-only link (`#heading`) — browser default scrolling
  // already works, so we deliberately do not intercept.
  if (href.startsWith("#")) {
    return null;
  }

  const hashIndex = href.indexOf("#");
  const rawPath = hashIndex === -1 ? href : href.substring(0, hashIndex);
  const rawHeading = hashIndex === -1 ? "" : href.substring(hashIndex + 1);

  if (rawPath.length === 0) {
    return null;
  }

  // Strip a `?query` before extension matching but keep it out of the target —
  // the host has nothing to do with query strings on a file path.
  const pathWithoutQuery = rawPath.split("?")[0];
  if (!/\.(md|markdown)$/i.test(pathWithoutQuery)) {
    return null;
  }

  const target = safeDecode(pathWithoutQuery);
  const heading = rawHeading.length === 0 ? null : safeDecodeOrRaw(rawHeading);

  return { target, heading };
}

// Mount the delegated standard-markdown-link click handler on `previewRoot`.
// One listener for the lifetime of the webview (the preview pane is never
// replaced, ADR-0002). A click that resolves to a local `.md` target is
// intercepted (`preventDefault`) and posted as an `openMarkdownLink` message;
// every other click — external URLs, modifier-held opens, wiki-links, image
// anchors, non-markdown files, fragment-only links — is left alone.
export function registerMarkdownLinkClicks(
  previewRoot: HTMLElement,
  bus: WebviewMessageBus
): void {
  previewRoot.addEventListener("click", (event) => {
    // Don't fight another handler that already claimed this click (e.g. the
    // wiki-link handler when its anchor wraps an inline child).
    if (event.defaultPrevented) {
      return;
    }
    // Modifier-held clicks keep the default — the user is asking for a new
    // tab / window / save target, which we have nothing useful to do with.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
      return;
    }

    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) {
      return;
    }
    const anchor = eventTarget.closest("a[href]");
    if (anchor === null) {
      return;
    }
    // Wiki-link anchors are owned by `wikiLinkClick.ts`; this listener stays
    // strictly disjoint so the two never fire on the same click.
    if (anchor.hasAttribute(WIKILINK_TARGET_ATTR)) {
      return;
    }

    const href = anchor.getAttribute("href") ?? "";
    const parsed = parseLocalMarkdownHref(href);
    if (parsed === null) {
      return;
    }

    event.preventDefault();
    bus.post({
      type: "openMarkdownLink",
      href,
      target: parsed.target,
      heading: parsed.heading
    });
  });
}

function safeDecode(value: string): string {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function safeDecodeOrRaw(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
