// Live Markdown preview renderer (T-105, ADR-0008).
//
// Builds a single, long-lived markdown-it instance and an equally long-lived
// preview DOM root. Every update **patches** the existing DOM in place:
//
//   1. Parse the new text into markdown-it tokens.
//   2. Group tokens by top-level block (heading, paragraph, list, etc.).
//   3. Render each group to an HTML string and diff against the cached blocks.
//   4. Skip unchanged blocks; replace/insert/remove only the ones whose HTML
//      changed (longest common prefix + suffix; standard incremental algorithm).
//
// The preview root element is created once and **never** replaced — typing
// only mutates the children inside the changed range, so VS Code's webview
// repaint cost is bounded by the size of the user's edit instead of the
// document (CODING_GUIDELINES.md §8, ARCHITECTURE.md §4.2 / §8).

import MarkdownIt from "markdown-it";
import markdownItKatex from "@vscode/markdown-it-katex";
import type { MarkStudioConfig } from "../../messaging/messages";
import { MERMAID_BLOCK_CLASS, renderMermaidBlocks } from "./mermaid";
import { applyCallouts } from "./callouts";
import { applyWikiLinks } from "./wikiLinks";

type Token = ReturnType<MarkdownIt["parse"]>[number];

interface BlockEntry {
  html: string;
  readonly node: Element;
  // 1-based source line of this block's first content, derived from the
  // markdown-it token map. Used by scroll sync to anchor preview blocks to
  // editor lines (T-2.1). Refreshed on every render because an edit above a
  // block shifts its source line even when its rendered HTML is unchanged.
  startLine: number;
}

// A read-only view of a rendered block: the DOM node and the 1-based source
// line it starts at. Consumed by scroll sync (T-2.1).
export interface PreviewBlock {
  readonly node: Element;
  readonly startLine: number;
}

export interface PreviewRenderer {
  update(text: string): void;
  // Re-read the resolved settings (T-3.1, T-3.2, T-3.3, T-3.4). The `math`,
  // `mermaid`, `callouts` and `wikiLinks` flags change how markdown-it
  // tokenises/renders, so toggling any of them rebuilds the instance and
  // re-renders the last text — applied live without a reload. Other settings
  // that do not affect the preview are ignored.
  setConfig(config: MarkStudioConfig): void;
  // Live, document-ordered list of rendered blocks with their source lines.
  // Returned array is owned by the renderer; callers must not mutate it.
  getBlocks(): ReadonlyArray<PreviewBlock>;
  destroy(): void;
}

// 40 ms is short enough that the preview feels live during continuous typing
// and long enough that bursts of keystrokes coalesce into a single render.
const DEBOUNCE_MS = 40;

export function createPreviewRenderer(
  parent: HTMLElement,
  initialConfig: MarkStudioConfig
): PreviewRenderer {
  let mathEnabled = initialConfig.math;
  let mermaidEnabled = initialConfig.mermaid;
  let calloutsEnabled = initialConfig.callouts;
  let wikiLinksEnabled = initialConfig.wikiLinks;
  let md = createMarkdownIt(
    mathEnabled,
    mermaidEnabled,
    calloutsEnabled,
    wikiLinksEnabled
  );

  const root = document.createElement("article");
  root.className = "markstudio-preview-content";
  parent.append(root);

  const blocks: BlockEntry[] = [];
  let pendingText: string | null = null;
  let timer: number | null = null;
  let lastRendered: string | null = null;

  function flush(): void {
    timer = null;
    if (pendingText === null) {
      return;
    }
    const text = pendingText;
    pendingText = null;
    if (text === lastRendered) {
      return;
    }
    lastRendered = text;
    render(text);
  }

  function render(text: string): void {
    const tokens = md.parse(text, {});
    const groups = groupTopLevelTokens(tokens);
    const env: Record<string, unknown> = {};
    const newHtml = groups.map((group) =>
      md.renderer.render(group, md.options, env).trim()
    );
    patch(root, blocks, newHtml);
    // Refresh every block's source line from this render. The HTML diff in
    // `patch` preserves nodes whose markup did not change, but their source
    // line still shifts when text is inserted or removed above them, so the
    // mapping must be rewritten wholesale (positions are 1:1 with `newHtml`).
    let lastLine = 1;
    for (let i = 0; i < blocks.length; i++) {
      const line = startLineOfGroup(groups[i]);
      lastLine = line < 0 ? lastLine : line;
      blocks[i].startLine = lastLine;
    }
    // Lazily render any new Mermaid diagrams the patch inserted (T-3.2). This
    // is async and fire-and-forget, so the hot render path stays synchronous;
    // unchanged diagram blocks keep their already-rendered SVG (their cached
    // placeholder HTML is unchanged, so `patch` preserves the node).
    if (mermaidEnabled) {
      renderMermaidBlocks(root);
    }
  }

  return {
    update(text: string): void {
      pendingText = text;
      if (timer === null) {
        timer = window.setTimeout(flush, DEBOUNCE_MS);
      }
    },
    setConfig(config: MarkStudioConfig): void {
      if (
        config.math === mathEnabled &&
        config.mermaid === mermaidEnabled &&
        config.callouts === calloutsEnabled &&
        config.wikiLinks === wikiLinksEnabled
      ) {
        return;
      }
      mathEnabled = config.math;
      mermaidEnabled = config.mermaid;
      calloutsEnabled = config.callouts;
      wikiLinksEnabled = config.wikiLinks;
      md = createMarkdownIt(
        mathEnabled,
        mermaidEnabled,
        calloutsEnabled,
        wikiLinksEnabled
      );
      // Force a re-render of the current document under the new pipeline.
      if (lastRendered !== null) {
        render(lastRendered);
      }
    },
    getBlocks(): ReadonlyArray<PreviewBlock> {
      return blocks;
    },
    destroy(): void {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      pendingText = null;
      blocks.length = 0;
      root.replaceChildren();
      root.remove();
    }
  };
}

// Build a markdown-it instance, optionally wired with KaTeX math rendering
// (T-3.1, ADR-0015), Mermaid diagram blocks (T-3.2, ADR-0016), callout boxes
// (T-3.3) and wiki-style links (T-3.4). Rebuilt (not mutated) whenever a
// preview-affecting setting flips, because markdown-it plugins/rules cannot be
// cleanly detached once applied; the rebuild is a settings-change event, never
// a per-keystroke cost.
function createMarkdownIt(
  math: boolean,
  mermaid: boolean,
  callouts: boolean,
  wikiLinks: boolean
): MarkdownIt {
  const md = new MarkdownIt({
    // Raw HTML disabled by default for safety (ADR-0008). Phase 3 may revisit
    // with an explicit security review.
    html: false,
    linkify: true,
    typographer: false,
    breaks: false,
    xhtmlOut: false
  });
  if (math) {
    md.use(markdownItKatex, {
      // Never throw on malformed input: KaTeX renders the offending source in
      // its error color instead, so a typo can never break the whole preview.
      throwOnError: false
    });
  }
  if (mermaid) {
    applyMermaidFence(md);
  }
  if (callouts) {
    applyCallouts(md);
  }
  if (wikiLinks) {
    applyWikiLinks(md);
  }
  return md;
}

// Override the fence renderer so a ```mermaid block emits a placeholder
// container holding the (escaped) diagram source instead of a `<pre><code>`
// (T-3.2). The async Mermaid pass (`renderMermaidBlocks`) later replaces the
// container's contents with the rendered SVG. Because the placeholder HTML
// encodes the source, an edit to the diagram changes the cached block HTML and
// `patch` swaps in a fresh, unrendered container; an unchanged diagram keeps
// its node (and its already-rendered SVG). All other fences fall through to
// markdown-it's default renderer, so non-Mermaid code blocks are untouched.
function applyMermaidFence(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self): string => {
    const info = tokens[idx].info.trim().split(/\s+/, 1)[0].toLowerCase();
    if (info === "mermaid") {
      return `<div class="${MERMAID_BLOCK_CLASS}">${md.utils.escapeHtml(
        tokens[idx].content
      )}</div>`;
    }
    return defaultFence
      ? defaultFence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}

function patch(
  parentEl: Element,
  cache: BlockEntry[],
  newHtml: ReadonlyArray<string>
): void {
  // Longest common prefix.
  let prefix = 0;
  const minLen = Math.min(cache.length, newHtml.length);
  while (prefix < minLen && cache[prefix].html === newHtml[prefix]) {
    prefix++;
  }

  // Longest common suffix (not overlapping the prefix region).
  let suffix = 0;
  while (
    suffix < cache.length - prefix &&
    suffix < newHtml.length - prefix &&
    cache[cache.length - 1 - suffix].html ===
    newHtml[newHtml.length - 1 - suffix]
  ) {
    suffix++;
  }

  const oldStart = prefix;
  const oldEnd = cache.length - suffix;
  const newStart = prefix;
  const newEnd = newHtml.length - suffix;

  // Anchor for inserts is the first preserved-suffix node, or null to append.
  const insertBefore: Element | null =
    suffix === 0 ? null : cache[cache.length - suffix].node;

  for (let i = oldStart; i < oldEnd; i++) {
    cache[i].node.remove();
  }

  const inserted: BlockEntry[] = [];
  for (let i = newStart; i < newEnd; i++) {
    const html = newHtml[i];
    const node = createBlockNode(html);
    parentEl.insertBefore(node, insertBefore);
    // `startLine` is a placeholder; `render` refreshes every block after patch.
    inserted.push({ html, node, startLine: 0 });
  }

  cache.splice(oldStart, oldEnd - oldStart, ...inserted);
}

// Convert one block's HTML string into a single Element. Top-level Markdown
// blocks render to a single root element once raw HTML is disabled; if a
// future plugin produces multiple roots, wrap them in a span-less div so the
// cache keeps a 1:1 mapping with DOM nodes.
function createBlockNode(html: string): Element {
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  if (
    fragment.childElementCount === 1 &&
    fragment.firstChild === fragment.firstElementChild
  ) {
    return fragment.firstElementChild as Element;
  }
  const wrapper = document.createElement("div");
  wrapper.append(fragment);
  return wrapper;
}

// The 1-based source line a block group starts at, taken from the first token
// in the group that carries a markdown-it source map. Returns -1 when no token
// in the group has a map (rare; the caller carries the previous block's line).
function startLineOfGroup(group: ReadonlyArray<Token>): number {
  for (const token of group) {
    if (token.map) {
      return token.map[0] + 1;
    }
  }
  return -1;
}

// Group flat markdown-it tokens by top-level block. Each group is a
// self-contained slice that `md.renderer.render` can serialise on its own.
function groupTopLevelTokens(tokens: ReadonlyArray<Token>): Token[][] {
  const groups: Token[][] = [];
  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.level !== 0) {
      // Defensive: a well-formed token stream only exposes level-0 tokens at
      // the outer walk. Skip anything unexpected so a malformed plugin output
      // cannot wedge the renderer.
      i++;
      continue;
    }
    if (token.nesting === 1) {
      let depth = 1;
      let j = i + 1;
      while (j < tokens.length) {
        if (tokens[j].nesting === 1) {
          depth++;
        } else if (tokens[j].nesting === -1) {
          depth--;
          if (depth === 0) {
            break;
          }
        }
        j++;
      }
      groups.push(tokens.slice(i, j + 1));
      i = j + 1;
    } else {
      groups.push([token]);
      i++;
    }
  }
  return groups;
}
