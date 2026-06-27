// CodeMirror 6 extension set used by the MarkStudio source editor (T-104).
//
// Theming intentionally references **only** VS Code CSS variables (ADR-0004,
// CODING_GUIDELINES.md §5): nothing is hardcoded, so light, dark, and
// high-contrast themes are handled automatically by VS Code without a custom
// theme bridge. Tokens that we do not explicitly style fall through to the
// editor foreground, which keeps the output readable in every theme without
// shipping a competing color palette.

import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  crosshairCursor,
  drawSelection,
  dropCursor,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  syntaxHighlighting
} from "@codemirror/language";
import {
  highlightSelectionMatches,
  search,
  searchKeymap
} from "@codemirror/search";
import { tags } from "@lezer/highlight";
import type { MarkStudioConfig } from "../../messaging/messages";

// Minimal Markdown highlight bound to VS Code variables. We only style markup
// that has a stable theme token (links, code, descriptionForeground for
// blockquotes) and use typography for the rest, so themes do not need to
// expose syntax-token colors for this to look correct.
const markstudioHighlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "bold", fontSize: "1.5em" },
  { tag: tags.heading2, fontWeight: "bold", fontSize: "1.3em" },
  { tag: tags.heading3, fontWeight: "bold", fontSize: "1.15em" },
  { tag: [tags.heading4, tags.heading5, tags.heading6], fontWeight: "bold" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  {
    tag: [tags.link, tags.url],
    color: "var(--vscode-textLink-foreground)",
    textDecoration: "underline"
  },
  {
    tag: tags.monospace,
    fontFamily: "var(--vscode-editor-font-family)",
    color: "var(--vscode-textPreformat-foreground)"
  },
  {
    tag: tags.quote,
    color: "var(--vscode-descriptionForeground)",
    fontStyle: "italic"
  },
  { tag: tags.meta, color: "var(--vscode-descriptionForeground)" }
]);

// Editor surface theme. All chrome (background, gutters, cursor, selection,
// active line) is keyed to VS Code variables so the editor matches the host
// editor pixel-for-pixel across theme changes without a webview reload.
const markstudioTheme = EditorView.theme({
  "&": {
    color: "var(--vscode-editor-foreground)",
    backgroundColor: "var(--vscode-editor-background)",
    height: "100%"
  },
  ".cm-content": {
    caretColor: "var(--vscode-editorCursor-foreground)",
    fontFamily: "var(--vscode-editor-font-family)",
    fontSize: "var(--vscode-editor-font-size)",
    padding: "8px 0"
  },
  ".cm-scroller": {
    fontFamily: "var(--vscode-editor-font-family)",
    overflow: "auto"
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--vscode-editorCursor-foreground)"
  },
  "&.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "var(--vscode-editor-selectionBackground)"
  },
  ".cm-selectionBackground": {
    backgroundColor: "var(--vscode-editor-inactiveSelectionBackground)"
  },
  ".cm-activeLine": {
    backgroundColor: "var(--vscode-editor-lineHighlightBackground)"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "var(--vscode-editor-lineHighlightBackground)"
  },
  ".cm-gutters": {
    backgroundColor:
      "var(--vscode-editorGutter-background, var(--vscode-editor-background))",
    color: "var(--vscode-editorLineNumber-foreground)",
    border: "0"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "var(--vscode-editorLineNumber-foreground)"
  },
  ".cm-focused .cm-activeLineGutter, .cm-focused .cm-lineNumbers .cm-gutterElement.cm-activeLine":
    {
      color: "var(--vscode-editorLineNumber-activeForeground)"
    },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--vscode-editor-selectionHighlightBackground)"
  },
  // Find/replace panel (T-2.3). The CodeMirror search panel is themed to the
  // VS Code find-widget surface so it reads as part of the host, not a
  // bolted-on control. Everything keys to `--vscode-*` variables (ADR-0004).
  ".cm-panels": {
    backgroundColor: "var(--vscode-editorWidget-background)",
    color:
      "var(--vscode-editorWidget-foreground, var(--vscode-editor-foreground))",
    fontFamily: "var(--vscode-font-family)",
    fontSize: "var(--vscode-font-size, 13px)"
  },
  ".cm-panels.cm-panels-top": {
    borderBottom:
      "1px solid var(--vscode-editorWidget-border, var(--vscode-widget-border, transparent))"
  },
  ".cm-panel.cm-search": {
    padding: "4px 6px"
  },
  ".cm-panel.cm-search label": {
    fontSize: "var(--vscode-font-size, 13px)"
  },
  ".cm-panel.cm-search input[name=search], .cm-panel.cm-search input[name=replace]":
    {
      backgroundColor: "var(--vscode-input-background)",
      color: "var(--vscode-input-foreground)",
      border: "1px solid var(--vscode-input-border, transparent)",
      borderRadius: "2px",
      padding: "2px 4px"
    },
  ".cm-panel.cm-search input[name=search]:focus, .cm-panel.cm-search input[name=replace]:focus":
    {
      outline: "1px solid var(--vscode-focusBorder)",
      outlineOffset: "-1px"
    },
  ".cm-panel.cm-search button:not([name=close]), .cm-button": {
    backgroundColor:
      "var(--vscode-button-secondaryBackground, var(--vscode-button-background))",
    color:
      "var(--vscode-button-secondaryForeground, var(--vscode-button-foreground))",
    border: "1px solid var(--vscode-button-border, transparent)",
    borderRadius: "2px",
    padding: "2px 8px",
    backgroundImage: "none"
  },
  ".cm-panel.cm-search button:not([name=close]):hover, .cm-button:hover": {
    backgroundColor:
      "var(--vscode-button-secondaryHoverBackground, var(--vscode-toolbar-hoverBackground))"
  },
  ".cm-panel.cm-search button:focus-visible, .cm-button:focus-visible": {
    outline: "1px solid var(--vscode-focusBorder)",
    outlineOffset: "1px"
  },
  ".cm-panel.cm-search [name=close]": {
    color:
      "var(--vscode-icon-foreground, var(--vscode-editorWidget-foreground))",
    cursor: "pointer",
    borderRadius: "3px"
  },
  ".cm-panel.cm-search [name=close]:hover": {
    backgroundColor: "var(--vscode-toolbar-hoverBackground)"
  }
});

export function buildExtensions(config: MarkStudioConfig): Extension[] {
  return [
    lineNumbersCompartment.of(lineNumbersExtension(config.lineNumbers)),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    drawSelection(),
    dropCursor(),
    indentOnInput(),
    bracketMatching(),
    EditorState.allowMultipleSelections.of(true),
    rectangularSelection(),
    crosshairCursor(),
    highlightSelectionMatches(),
    // The find/replace panel mounts at the top, mirroring VS Code's find
    // widget; `searchKeymap` (below) binds Ctrl/Cmd+F, F3, etc. (T-2.3).
    search({ top: true }),
    markdown(),
    syntaxHighlighting(markstudioHighlight),
    wordWrapCompartment.of(wordWrapExtension(config.wordWrap)),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab
    ]),
    markstudioTheme
  ];
}

// The line-number gutter lives in a `Compartment` so `markstudio.editor.
// lineNumbers` can toggle it live via `reconfigure`, without rebuilding the
// editor (T-111, ADR-0002). An empty extension (`[]`) cleanly removes the
// gutter when the setting is off.
export const lineNumbersCompartment = new Compartment();

export function lineNumbersExtension(enabled: boolean): Extension {
  return enabled ? lineNumbers() : [];
}

// Line wrapping also lives in a `Compartment` so `markstudio.editor.wordWrap`
// can toggle soft-wrap live via `reconfigure`, without rebuilding the editor
// (T-2.5, ADR-0002). An empty extension (`[]`) restores horizontal scrolling
// when the setting is off.
export const wordWrapCompartment = new Compartment();

export function wordWrapExtension(enabled: boolean): Extension {
  return enabled ? EditorView.lineWrapping : [];
}
