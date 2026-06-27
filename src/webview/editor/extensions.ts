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
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
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
    backgroundColor: "var(--vscode-editorGutter-background, var(--vscode-editor-background))",
    color: "var(--vscode-editorLineNumber-foreground)",
    border: "0"
  },
  ".cm-lineNumbers .cm-gutterElement": {
    color: "var(--vscode-editorLineNumber-foreground)"
  },
  ".cm-focused .cm-activeLineGutter, .cm-focused .cm-lineNumbers .cm-gutterElement.cm-activeLine": {
    color: "var(--vscode-editorLineNumber-activeForeground)"
  },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-selectionMatch": {
    backgroundColor: "var(--vscode-editor-selectionHighlightBackground)"
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
    markdown(),
    syntaxHighlighting(markstudioHighlight),
    EditorView.lineWrapping,
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
