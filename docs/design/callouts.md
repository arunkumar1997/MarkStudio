# Design — Callouts / Admonitions (T-3.3, Phase 3 M3.3)

> Pre-implementation design for rendering GitHub-style callout blockquotes in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0017](../DECISIONS.md#adr-0017-callouts-as-a-dependency-free-markdown-it-core-rule).

## Problem

Phase 3 (M3.3) calls for styled note/warning/tip callout blocks — a blockquote whose first line is a `[!TYPE]` marker, e.g.

```markdown
> [!NOTE]
> Body text.

> [!WARNING] Custom title
> Be careful.
```

It must attach to the existing markdown-it preview pipeline, be **individually toggleable** via configuration, **degrade gracefully** when disabled (render as an ordinary blockquote), and theme entirely via `--vscode-*` variables. Unlike math (T-3.1, KaTeX) and Mermaid (T-3.2), callouts are pure markup — they need **no new dependency**.

## Options considered

1. **A markdown-it core rule that post-processes the token stream.** After the built-in blockquote parser runs, walk the tokens, detect a `blockquote_open` whose first paragraph starts with `[!TYPE]`, and rewrite the open/close tags to a `<div class="markstudio-callout …">`, inject a title block, and strip the marker line. No dependency.
2. **An npm callout plugin** (e.g. `markdown-it-github-alerts`). Rejected: pulls a dependency for ~80 lines of well-scoped logic, against the dependency-policy ADRs, and would need its own ADR for no real gain.
3. **Override the `blockquote_open` renderer only.** Rejected: the renderer cannot see the inline body content to detect the marker or strip it cleanly, and cannot inject the title node.

**Chosen: option 1.** A small core rule keeps the work dependency-free, mirrors the existing fence-override pattern (T-3.2), and is fully unit-testable through the existing integration harness.

## Data flow

```
config.callouts (host, markstudio.preview.callouts)
        │  init / configChanged { config }
        ▼
PreviewRenderer.setConfig(config)
        │  rebuilds markdown-it with/without applyCallouts(md)
        ▼
md.parse → tokens → [core rule: markstudio_callouts]
        │  blockquote_open + "[!NOTE]…" → div.markstudio-callout + title block
        ▼
block groups → md.renderer.render → incremental DOM patch (unchanged)
```

When `callouts` is off the rule is never registered, so `> [!NOTE]` renders as a normal blockquote — nothing breaks.

## Files

* `src/messaging/messages.ts` — `MarkStudioConfig` gains `callouts: boolean`; `isMarkStudioConfig` validates it.
* `src/services/ConfigurationService.ts` — `read` resolves `preview.callouts` (default `true`).
* `package.json` — contributes `markstudio.preview.callouts` (boolean, default `true`, `resource` scope).
* `src/webview/preview/callouts.ts` (new) — `applyCallouts(md)`: the core rule, the type table (label + Codicon per type), and the token transform. No `import` of any new package.
* `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid, callouts)` applies callouts when on; `setConfig` rebuilds when `math`, `mermaid` **or** `callouts` flips.
* `src/webview/main.ts` — themed `.markstudio-callout` / `.markstudio-callout-title` styling driven entirely by `--vscode-*` variables, with a per-type accent.

## Supported types

| Marker | Title | Codicon | Accent variable |
| ------ | ----- | ------- | --------------- |
| `[!NOTE]` | Note | `codicon-info` | `--vscode-charts-blue` |
| `[!TIP]` | Tip | `codicon-lightbulb` | `--vscode-charts-green` |
| `[!IMPORTANT]` | Important | `codicon-report` | `--vscode-charts-purple` |
| `[!WARNING]` | Warning | `codicon-warning` | `--vscode-editorWarning-foreground` |
| `[!CAUTION]` | Caution | `codicon-error` | `--vscode-editorError-foreground` |

A custom title on the marker line (`> [!NOTE] My title`) overrides the default label. Unknown types are left as ordinary blockquotes.

## Public surface added

* Setting `markstudio.preview.callouts` (boolean, default `true`, `resource` scope).
* `MarkStudioConfig.callouts` field on the `init` / `configChanged` messages.
* No new message type.

## Decisions & trade-offs

* **No dependency — a core rule.** The transform is ~80 lines and fully under our control, so a plugin would be net negative against the dependency-policy ADRs. See ADR-0017.
* **The title is an `html_block` token.** markdown-it emits `html_block` content verbatim regardless of the `html: false` parser option, so the (escaped) title markup is injected without enabling raw HTML anywhere else in the document. The custom title text is run through `md.utils.escapeHtml`.
* **Rebuild on toggle, not per keystroke.** Consistent with math/mermaid (ADR-0008), `setConfig` rebuilds the markdown-it instance only when `callouts` actually flips — a settings event, never a typing cost.
* **Theme via `--vscode-*` only.** Each type sets a single `--markstudio-callout-accent` CSS variable from a VS Code theme variable (with graceful fallbacks); the border, icon, and title colour all derive from it, and the body uses the blockquote/widget background. No hard-coded colours, no custom design system.
* **Codicons reused.** The icons come from the Codicons font already loaded in the webview (T-107) — no new asset.

## Verification

The integration tests (jsdom) cover the markdown-it seam: a styled callout `div` with an icon + title when on, a custom title, fallback to a plain blockquote when off, an ordinary blockquote left untouched, and the live `setConfig` toggle. The visual theming across light/dark/high-contrast stays in the manual Extension Development Host matrix.
