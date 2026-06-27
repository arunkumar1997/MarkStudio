// Wiki-style link rendering for the preview (T-3.4, M3.4).
//
// Renders `[[target]]`, `[[target|alias]]`, `[[target#heading]]` and
// `[[target#heading|alias]]` as links in the preview. Like callouts (T-3.3)
// this needs **no new dependency**: it is a small markdown-it **inline rule**
// registered before the built-in link rule so a `[[` opener is claimed before
// the ordinary `[link](url)` parser sees it.
//
// Resolution to actual files is deferred to Phase 4 — for now the link is
// styled and carries its target/heading as `data-*` attributes so a later
// click handler can resolve and open the note. When the feature is off the
// rule is never registered, so `[[note]]` renders as literal text — graceful
// degradation with zero special-casing on the render path.

import type MarkdownIt from "markdown-it";
import type StateInline from "markdown-it/lib/rules_inline/state_inline.mjs";

// Class stamped on the rendered wiki-link anchor and used by the preview CSS.
export const WIKILINK_CLASS = "markstudio-wikilink";

const OPEN_BRACKET = 0x5b; // "["

// Register the wiki-link inline rule on a markdown-it instance. Called only
// when `markstudio.preview.wikiLinks` is on (PreviewRenderer.createMarkdownIt).
export function applyWikiLinks(md: MarkdownIt): void {
  md.inline.ruler.before("link", "markstudio_wikilink", wikiLinkRule);
}

function wikiLinkRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  // Fast bail unless the input is `[[`.
  if (
    state.src.charCodeAt(start) !== OPEN_BRACKET ||
    state.src.charCodeAt(start + 1) !== OPEN_BRACKET
  ) {
    return false;
  }

  const closeIdx = state.src.indexOf("]]", start + 2);
  if (closeIdx === -1 || closeIdx > state.posMax) {
    return false;
  }

  const inner = state.src.slice(start + 2, closeIdx);
  // Reject empty links and anything with a newline or nested bracket so we
  // never swallow ordinary `[...]` link syntax or span across lines.
  if (inner.length === 0 || /[\n[\]]/.test(inner)) {
    return false;
  }

  const parsed = parseWikiLink(inner);
  if (!parsed) {
    return false;
  }

  // In silent (validation) mode we only report that a match exists.
  if (!silent) {
    const open = state.push("wikilink_open", "a", 1);
    open.attrSet("class", WIKILINK_CLASS);
    open.attrSet("data-wikilink-target", parsed.target);
    if (parsed.heading) {
      open.attrSet("data-wikilink-heading", parsed.heading);
    }
    open.attrSet("title", parsed.title);
    open.markup = "wikilink";

    const text = state.push("text", "", 0);
    text.content = parsed.label;

    const close = state.push("wikilink_close", "a", -1);
    close.markup = "wikilink";
  }

  state.pos = closeIdx + 2;
  return true;
}

interface ParsedWikiLink {
  // The note target (part before `#` and `|`), trimmed.
  readonly target: string;
  // The heading anchor after `#`, if any, trimmed.
  readonly heading: string | null;
  // The visible link text: the alias if present, else the raw target text.
  readonly label: string;
  // A human-readable tooltip describing where the link points.
  readonly title: string;
}

function parseWikiLink(inner: string): ParsedWikiLink | null {
  const pipeIdx = inner.indexOf("|");
  const linkPart = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
  const alias = pipeIdx === -1 ? null : inner.slice(pipeIdx + 1).trim();

  const hashIdx = linkPart.indexOf("#");
  const target =
    hashIdx === -1 ? linkPart.trim() : linkPart.slice(0, hashIdx).trim();
  const heading =
    hashIdx === -1 ? null : linkPart.slice(hashIdx + 1).trim() || null;

  // A link must resolve to either a note or a same-document heading.
  if (target.length === 0 && !heading) {
    return null;
  }

  const label = (alias && alias.length > 0 ? alias : linkPart.trim()).trim();
  if (label.length === 0) {
    return null;
  }

  const title = heading
    ? target.length > 0
      ? `${target} \u203a ${heading}`
      : `\u00a7 ${heading}`
    : target;

  return { target, heading, label, title };
}
