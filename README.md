# MarkStudio

A native, Obsidian-inspired Markdown editor for Visual Studio Code.

MarkStudio delivers a fast, keyboard-first Markdown editing experience that feels like a **first-party VS Code feature**. It is built on the **Custom Editor API**, uses **CodeMirror 6** for editing and **markdown-it** for live preview, and is written in vanilla TypeScript, HTML, and CSS — styled entirely with VS Code theme variables.

## Features

- **Custom Markdown editor** — opens `.md` files in a split editor + live preview.
- **CodeMirror 6 source editor** — Markdown grammar, history, multi-cursor, in-editor find/replace, word-wrap toggle, theme-aware highlighting.
- **Live preview (markdown-it)** — incremental rendering, editor ⇄ preview scroll sync, math (KaTeX), Mermaid diagrams, callouts, task lists, tables, footnotes, and strikethrough — each individually toggleable.
- **Knowledge management** — wiki-style links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`), a Backlinks panel, in-preview link navigation, and hover preview cards for linked notes.
- **Document outline** — a native tree view that follows the active editor.
- **Word count & reading time** — a status-bar indicator for the active editor.
- **Layout modes** — split / editor-only / preview-only, with per-file persistence.

## Requirements

- VS Code `^1.85.0`

## Settings

All settings live under the `markstudio.*` namespace, including `markstudio.editor.lineNumbers`, `markstudio.editor.wordWrap`, and the `markstudio.preview.*` toggles (`math`, `mermaid`, `callouts`, `wikiLinks`, `footnotes`, `taskLists`, `tables`, `strikethrough`).

## Building from source

```sh
npm install
npm run build        # bundle the extension host + webview
npm test             # unit + integration tests
npm run package      # produce markstudio-<version>.vsix
```

## License

[MIT](LICENSE)
