// GFM task-list rendering for the preview (T-3.5, M3.5).
//
// Renders task-list items — a list item whose text starts with `[ ]`, `[x]`
// or `[X]` — as a checkbox followed by the remaining text. Like callouts
// (T-3.3) and wiki links (T-3.4) this needs **no new dependency**: it is a
// small markdown-it core rule that post-processes the token stream produced by
// the built-in list parser (the same approach as the well-known
// `markdown-it-task-lists` plugin, kept in-tree so it stays under our control).
//
// The checkboxes are rendered **disabled** — the preview is read-only and does
// not write a toggle back to the source this sprint (Producer decision). When
// the feature is off the rule is simply not registered, so a `- [ ]` item
// renders as an ordinary list item with literal `[ ]` text — graceful
// degradation with zero special-casing on the render path.

import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";

// Class stamped on a task-list `<li>` and used by the preview CSS.
export const TASK_LIST_ITEM_CLASS = "markstudio-task-list-item";
// Class stamped on the enclosing `<ul>` / `<ol>` so its bullet can be hidden.
export const TASK_LIST_CLASS = "markstudio-task-list";
// Class stamped on the injected checkbox `<input>`.
export const TASK_LIST_CHECKBOX_CLASS = "markstudio-task-list-checkbox";

// A task-list marker is `[ ]`, `[x]` or `[X]` followed by a space, at the very
// start of the item's first paragraph.
const UNCHECKED = "[ ] ";
const CHECKED_LOWER = "[x] ";
const CHECKED_UPPER = "[X] ";

// Register the task-list transform on a markdown-it instance. Called only when
// `markstudio.preview.taskLists` is on (PreviewRenderer.createMarkdownIt). The
// rule runs `after("inline")` so every list item's inline content has already
// been parsed into children we can prepend the checkbox to.
export function applyTaskLists(md: MarkdownIt): void {
  md.core.ruler.after("inline", "markstudio_task_lists", (state) => {
    transformTaskLists(state);
  });
}

function transformTaskLists(state: StateCore): void {
  const tokens = state.tokens;
  // Start at 2: a task item is `list_item_open`, `paragraph_open`, `inline`.
  for (let i = 2; i < tokens.length; i++) {
    if (!isTaskListItem(tokens, i)) {
      continue;
    }
    todoify(tokens[i], state);

    // Mark the `<li>` so its list-style bullet can be removed in CSS.
    addClass(tokens[i - 2], TASK_LIST_ITEM_CLASS);

    // Mark the enclosing `<ul>` / `<ol>` so the whole list reads as a task
    // list (used to strip the default bullets / padding).
    const listOpen = parentTokenIndex(tokens, i - 2);
    if (listOpen !== -1) {
      addClass(tokens[listOpen], TASK_LIST_CLASS);
    }
  }
}

// An `inline` token at `index` is a task-list item iff it is the first
// paragraph of a list item and its content opens with a task marker.
function isTaskListItem(tokens: ReadonlyArray<Token>, index: number): boolean {
  return (
    tokens[index].type === "inline" &&
    tokens[index - 1].type === "paragraph_open" &&
    tokens[index - 2].type === "list_item_open" &&
    startsWithMarker(tokens[index].content)
  );
}

function startsWithMarker(content: string): boolean {
  return (
    content.startsWith(UNCHECKED) ||
    content.startsWith(CHECKED_LOWER) ||
    content.startsWith(CHECKED_UPPER)
  );
}

// Replace the leading `[ ]` / `[x]` marker with a disabled checkbox token and
// strip the marker from both the inline content and its first text child.
function todoify(inline: Token, state: StateCore): void {
  const checked = !inline.content.startsWith(UNCHECKED);
  const checkbox = new state.Token("html_inline", "", 0);
  checkbox.content =
    `<input class="${TASK_LIST_CHECKBOX_CLASS}" type="checkbox" disabled` +
    (checked ? " checked" : "") +
    "> ";

  const children = inline.children ?? [];
  children.unshift(checkbox);
  // children[1] is now the original first text token; trim its marker.
  if (children[1] && children[1].type === "text") {
    children[1].content = children[1].content.slice(UNCHECKED.length);
  }
  inline.children = children;
  inline.content = inline.content.slice(UNCHECKED.length);
}

// Append a class to a token's existing `class` attribute (preserving any class
// markdown-it already set), used to flag the `<li>` and its parent list.
function addClass(token: Token, className: string): void {
  const existing = token.attrGet("class");
  token.attrSet("class", existing ? `${existing} ${className}` : className);
}

// Index of the `*_list_open` token that encloses the `list_item_open` at
// `itemIndex` — the token one nesting level shallower. Returns -1 if none.
function parentTokenIndex(
  tokens: ReadonlyArray<Token>,
  itemIndex: number
): number {
  const targetLevel = tokens[itemIndex].level - 1;
  for (let i = itemIndex - 1; i >= 0; i--) {
    if (tokens[i].level === targetLevel) {
      return i;
    }
  }
  return -1;
}
