// Callout / admonition rendering for the preview (T-3.3, M3.3).
//
// Renders GitHub-style callout blockquotes — a blockquote whose first line is
// a `[!TYPE]` marker (e.g. `> [!NOTE]`, `> [!WARNING]`) — as a themed callout
// box with an icon + title. Unlike math (T-3.1) and Mermaid (T-3.2) this needs
// **no new dependency**: it is a small, well-scoped markdown-it core rule that
// post-processes the token stream produced by the built-in blockquote parser.
//
// When the feature is off the rule is simply not registered, so a `> [!NOTE]`
// block renders as an ordinary blockquote — graceful degradation with zero
// special-casing on the render path.

import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";

// Class stamped on the callout container and used as the base for the
// per-type modifier (`markstudio-callout-note`, …) and the title element.
export const CALLOUT_CLASS = "markstudio-callout";

// The supported callout types, each mapped to a default title and a VS Code
// Codicon (already loaded in the webview, T-107). The icon name is the
// codicon suffix, e.g. `info` → `codicon-info`.
interface CalloutDef {
  readonly label: string;
  readonly icon: string;
}

const CALLOUTS: Readonly<Record<string, CalloutDef>> = {
  note: { label: "Note", icon: "info" },
  tip: { label: "Tip", icon: "lightbulb" },
  important: { label: "Important", icon: "report" },
  warning: { label: "Warning", icon: "warning" },
  caution: { label: "Caution", icon: "error" }
};

// First line of a callout blockquote: `[!TYPE]` optionally followed by a
// custom title on the same line. Leading whitespace is tolerated because the
// blockquote parser may keep an indent.
const MARKER = /^\s*\[!([A-Za-z]+)\]\s*(.*)$/;

// Register the callout transform on a markdown-it instance. Called only when
// `markstudio.preview.callouts` is on (PreviewRenderer.createMarkdownIt).
export function applyCallouts(md: MarkdownIt): void {
  md.core.ruler.push("markstudio_callouts", (state) => {
    transformCallouts(state, md);
  });
}

function transformCallouts(state: StateCore, md: MarkdownIt): void {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== "blockquote_open") {
      continue;
    }
    const paragraphOpen = tokens[i + 1];
    const inline = tokens[i + 2];
    if (
      !paragraphOpen ||
      paragraphOpen.type !== "paragraph_open" ||
      !inline ||
      inline.type !== "inline"
    ) {
      continue;
    }

    const newlineIdx = inline.content.indexOf("\n");
    const firstLine =
      newlineIdx === -1 ? inline.content : inline.content.slice(0, newlineIdx);
    const match = MARKER.exec(firstLine);
    if (!match) {
      continue;
    }
    const type = match[1].toLowerCase();
    const def = CALLOUTS[type];
    if (!def) {
      continue;
    }

    const closeIdx = findMatchingClose(tokens, i);
    if (closeIdx === -1) {
      continue;
    }

    // Turn the blockquote into a themed callout container.
    tokens[i].tag = "div";
    tokens[i].attrSet("class", `${CALLOUT_CLASS} ${CALLOUT_CLASS}-${type}`);
    tokens[closeIdx].tag = "div";

    const customTitle = match[2].trim();
    const titleText = customTitle.length > 0 ? customTitle : def.label;
    const titleToken = createTitleToken(state, md, def.icon, titleText);

    const rest = newlineIdx === -1 ? "" : inline.content.slice(newlineIdx + 1);
    if (rest.trim().length === 0) {
      // The marker was the whole first paragraph: drop it and put the title in
      // its place. The callout body lives in the following block(s).
      tokens.splice(i + 1, 3, titleToken);
    } else {
      // The marker shares its paragraph with body text: strip the marker line,
      // re-parse the remaining inline content, and insert the title before it.
      inline.content = rest;
      const children: Token[] = [];
      state.md.inline.parse(rest, state.md, state.env, children);
      inline.children = children;
      tokens.splice(i + 1, 0, titleToken);
    }
  }
}

// Build a non-parsed HTML title block (icon + label). An `html_block` token is
// emitted verbatim by markdown-it's renderer regardless of the `html: false`
// parser option, so this injects trusted, escaped markup without enabling raw
// HTML anywhere else in the document.
function createTitleToken(
  state: StateCore,
  md: MarkdownIt,
  icon: string,
  titleText: string
): Token {
  const token = new state.Token("html_block", "", 0);
  token.block = true;
  token.content =
    `<div class="${CALLOUT_CLASS}-title">` +
    `<span class="codicon codicon-${icon}" aria-hidden="true"></span>` +
    `<span class="${CALLOUT_CLASS}-title-text">${md.utils.escapeHtml(
      titleText
    )}</span>` +
    `</div>\n`;
  return token;
}

// Index of the `blockquote_close` that matches the `blockquote_open` at
// `openIdx`, accounting for nested blockquotes. Returns -1 if unbalanced.
function findMatchingClose(
  tokens: ReadonlyArray<Token>,
  openIdx: number
): number {
  let depth = 0;
  for (let j = openIdx; j < tokens.length; j++) {
    if (tokens[j].type === "blockquote_open") {
      depth++;
    } else if (tokens[j].type === "blockquote_close") {
      depth--;
      if (depth === 0) {
        return j;
      }
    }
  }
  return -1;
}
