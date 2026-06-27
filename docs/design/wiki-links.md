# Design — Wiki-style Links (T-3.4, Phase 3 M3.4)

> Pre-implementation design for rendering wiki-style `[[…]]` links in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0018](../DECISIONS.md#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule).

## Problem

Phase 3 (M3.4) calls for wiki-style links — an inline `[[target]]` reference, optionally with an alias and/or a heading anchor:

```markdown
See [[My Note]] for details.
Jump to [[home|the home page]].
Read [[Guide#Setup]] first.
```

It must attach to the existing markdown-it preview pipeline, be **individually toggleable** via configuration, **degrade gracefully** when disabled (render as literal `[[…]]` text), and theme entirely via `--vscode-*` variables. Like callouts (T-3.3) and unlike math (T-3.1) / Mermaid (T-3.2), wiki links are pure markup — they need **no new dependency**. Resolution to actual files is deferred to **Phase 4**; v1 styles the link and carries its target/heading as `data-*` attributes for a later click handler.

## Options considered

1. **A markdown-it inline rule registered before the built-in `link` rule.** Claim a `[[` opener before the ordinary `[link](url)` parser sees it, scan to the closing `]]`, parse the target / alias / heading, and emit a styled anchor. No dependency.
2. **An npm wiki-link plugin** (e.g. `markdown-it-wikilinks`). Rejected: pulls a dependency for ~60 lines of well-scoped logic, against the dependency-policy ADRs, and most plugins hard-code a URL resolver we do not want until Phase 4.
3. **A core rule post-processing the token stream** (as callouts do). Rejected: wiki links are *inline*, not block-level; an inline rule is the idiomatic, lower-risk seam and never has to re-tokenise paragraphs.

**Chosen: option 1.** A small inline rule keeps the work dependency-free, runs at the natural `[[` position, leaves ordinary `[link](url)` syntax untouched, and is fully unit-testable through the existing integration harness.

## Data flow

```
config.wikiLinks (host, markstudio.preview.wikiLinks)
        │  init / configChanged { config }
        ▼
PreviewRenderer.setConfig(config)
        │  rebuilds markdown-it with/without applyWikiLinks(md)
        ▼
md.parse → inline tokens → [inline rule: markstudio_wikilink]
        │  "[[Guide#Setup|alias]]" → <a class="markstudio-wikilink"
        │                              data-wikilink-target data-wikilink-heading>
        ▼
block groups → md.renderer.render → incremental DOM patch (unchanged)
```

When `wikiLinks` is off the rule is never registered, so `[[note]]` renders as literal text — nothing breaks.

## Syntax supported

| Input | Display text | `data-wikilink-target` | `data-wikilink-heading` |
| ----- | ------------ | ---------------------- | ----------------------- |
| `[[note]]` | `note` | `note` | — |
| `[[note\|alias]]` | `alias` | `note` | — |
| `[[note#heading]]` | `note#heading` | `note` | `heading` |
| `[[note#heading\|alias]]` | `alias` | `note` | `heading` |

A link containing a newline or a nested `[`/`]` is rejected, so ordinary `[link](url)` and `[ref][id]` syntax is never swallowed. An empty `[[]]` is ignored. The `title` attribute carries a human-readable "where this points" tooltip.

## Files

* `src/messaging/messages.ts` — `MarkStudioConfig` gains `wikiLinks: boolean`; `isMarkStudioConfig` validates it.
* `src/services/ConfigurationService.ts` — `read` resolves `preview.wikiLinks` (default `true`).
* `package.json` — contributes `markstudio.preview.wikiLinks` (boolean, default `true`, `resource` scope).
* `src/webview/preview/wikiLinks.ts` (new) — `applyWikiLinks(md)`: the inline rule and the target/alias/heading parser. No `import` of any new package.
* `src/webview/preview/PreviewRenderer.ts` — `createMarkdownIt(math, mermaid, callouts, wikiLinks)` applies the rule when on; `setConfig` rebuilds when any preview flag flips.
* `src/webview/main.ts` — themed `.markstudio-wikilink` styling driven entirely by `--vscode-*` variables (a dashed underline marks the link as not-yet-resolved).

## Decisions & trade-offs

* **No dependency — an inline rule.** The rule is ~60 lines and fully under our control, so a plugin would be net negative against the dependency-policy ADRs. See ADR-0018.
* **Registered before the `link` rule.** Running `before("link", …)` lets the `[[` opener win over markdown-it's ordinary link parser without disabling it; a single `[` falls straight through to the built-in rule.
* **Rebuild on toggle, not per keystroke.** Consistent with math/mermaid/callouts (ADR-0008), `setConfig` rebuilds the markdown-it instance only when `wikiLinks` actually flips — a settings event, never a typing cost.
* **Resolution deferred to Phase 4.** The anchor is styled and carries `data-wikilink-target` / `data-wikilink-heading`, but has no `href` and does not navigate yet. A Phase 4 click handler will resolve the target to a file and open it.
* **Theme via `--vscode-*` only.** The link colour is `--vscode-textLink-foreground` with a dashed underline (solid on hover); no hard-coded colours, no custom design system.

## Verification

The integration tests (jsdom) cover the markdown-it seam: a styled `a.markstudio-wikilink` carrying its target when on, alias display text, a captured heading anchor, literal-text fallback when off, an ordinary `[link](url)` left untouched, and the live `setConfig` toggle. The visual theming across light/dark/high-contrast stays in the manual Extension Development Host matrix.
