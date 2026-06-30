# Design — Hover Preview for Wiki-Links (M4.2, Phase 4)

> Pre-implementation design for previewing a wiki-link's target on hover. Status: **implemented**. The durable decision is recorded as [ADR-0022](../DECISIONS.md#adr-0022-hover-preview-for-wiki-links-host-ships-markdown-text-webview-renders-it). Mirrors [wiki-navigation.md](wiki-navigation.md), the click counterpart.

## Problem

The preview renders wiki-links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`) as styled `a.markstudio-wikilink` anchors carrying their target in `data-*` (T-3.4), and T-4.1b made them **clickable** to open the target (ADR-0021). M4.2 adds the **read-side** affordance: resting the pointer on such a link shows a floating card previewing the target note's content — `[[note]]` previews the top of the note, `[[note#heading]]` previews that section — the way Obsidian's hover preview works.

The constraint is the same architectural split as the click: the target resolves against the **workspace** and is **read** by the host (ADR-0001/0004), but the **hover** happens in the webview's preview DOM, which must not be recreated (ADR-0002). So a hover has to make a request across the boundary and render the reply, reusing the click's resolver rather than growing a second one.

## Options considered

1. **Host ships Markdown text; webview renders it with the existing renderer** — a delegated hover posts `requestLinkPreview`; the host resolves via the shared M4.1 index, reads + caps an excerpt, and ships the **text**; the webview renders it with a reused `PreviewRenderer` in the card. Keeps one renderer, one theming path, and `html: false` safety.
2. **Host renders the excerpt to HTML and ships markup** — rejected: duplicates the render pipeline on the host, diverges in theming, and reopens the raw-HTML injection surface `html: false` closes.
3. **Ship the whole note / no cap** — rejected: a large note bloats the message and the card; a bounded excerpt is enough for a preview. (Full inline content is M4.3, transclusion.)

**Chosen: option 1.** See [ADR-0022](../DECISIONS.md#adr-0022-hover-preview-for-wiki-links-host-ships-markdown-text-webview-renders-it) for the full rationale.

## Data flow

```
preview DOM: <a class="markstudio-wikilink"
                data-wikilink-target="Guide"
                data-wikilink-heading="Setup">…</a>
        │  pointer rests (~300 ms dwell)
        ▼
registerWikiLinkHover(previewPane, bus, …)            ── one delegated
   pointerover → closest('a.markstudio-wikilink')       pointerover/pointerout
   start dwell timer; on fire read data-*               pair on the persistent
   pointerout → cancel timer + ask card to hide         pane (survives patches)
        │  postMessage
        ▼
{ type: "requestLinkPreview", target: "Guide", heading: "Setup" }  ── webview → host
        │
        ▼
MarkStudioEditorProvider.requestLinkPreview(bus, fromUri, target, heading)
   LinkIndexService.resolveTarget(fromUri, target) ──▶ vscode.Uri[]   (shared M4.1 index)
   open-first; no match → status:"missing"
   openTextDocument(uri).getText()
   extractExcerpt(text, heading)   ── pure: heading-section slice or top, capped
        │  postMessage
        ▼
{ type: "linkPreviewContent", target, heading, status:"ok", text, title }  ── host → webview
        │  (drop if target/heading no longer match the hovered anchor)
        ▼
HoverCard.showContent(anchor)   ← PreviewRenderer.update(text)   (reused renderer, html:false)
   or HoverCard.showMissing(anchor) on status:"missing"
```

## Excerpt rules (Producer decisions, plan §4)

`extractExcerpt(text, heading)` is **pure** (`src/links/linkExcerpt.ts`) and reuses the outline scanner (`parseHeadings` / `findHeadingLine`).

| Situation | Behaviour |
| --------- | --------- |
| `[[Guide]]` (no heading) | Excerpt from the **top** of `Guide.md`. |
| `[[Guide#Setup]]` | The **section** under `## Setup`: from the heading line to the next same-or-higher heading. |
| `[[Guide#Missing]]` (heading absent) | Falls back to the **top** of the note. |
| Long section / note | Capped to **≤ 60 lines or ≤ 2,000 characters**, whichever bites first (`MAX_EXCERPT_LINES` / `MAX_EXCERPT_CHARS`). |
| Unresolved / read fails | `status: "missing"` → a quiet "No note found" card; never a throw. |
| Ambiguous basename | Preview the **first** match (open-first, same as click-nav). |
| `[[#heading]]` (empty target) | Inert — nothing to preview. |

## Interaction & dismissal (tunable in the F5 pass, plan §9)

* **Dwell ~300 ms** before requesting — sweeping the pointer across links does not fire a request per link.
* **Stale guard:** the hover tracks the active anchor + request; a `linkPreviewContent` whose `target`/`heading` no longer match the hovered anchor is dropped, so a late reply never pops a card for a link the pointer already left.
* **Placement:** below the anchor by default, flipping above when it would overflow the viewport bottom, clamped horizontally. (jsdom cannot measure layout, so geometry is verified manually.)
* **Dismiss** on pointer-leave (with a small grace so the pointer can travel into the card), `pointerleave` from the card, scroll, click outside, and Escape.
* **Theming:** VS Code hover-widget tokens (`--vscode-editorHoverWidget-background` / `-border` / `-foreground`), so the card reads as a first-party hover.

## What this is **not** (out of scope)

* **Source-pane (CodeMirror) hover** — preview-pane only; CM6 hover is a separate follow-up.
* **Transclusion / embedding** the target inline — that is **M4.3**; this is a transient *preview*.
* **Nested hover** (a link inside the card), **live card updates** while the target changes, and **prefetch / LRU caching** — all deferred.
* **A new setting** — gated by the existing `markstudio.preview.wikiLinks` (off ⇒ no anchors ⇒ feature inertly absent).

## Files

| File | Role |
| ---- | ---- |
| `src/messaging/messages.ts` | `RequestLinkPreviewMessage` (W→H) + guard; `LinkPreviewContentMessage` (H→W) + guard. |
| `src/links/linkExcerpt.ts` (pure) | `extractExcerpt(text, heading)` — heading-section slice or top, capped. |
| `src/editor/MarkStudioEditorProvider.ts` | `requestLinkPreview` handler: resolve → read → excerpt → post `linkPreviewContent`; degrade to `missing`. |
| `src/webview/preview/wikiLinkHover.ts` | Delegated hover, dwell timer, post request, cancel on leave, active-anchor tracking. |
| `src/webview/preview/HoverCard.ts` | One floating card: position, theme, host the reused renderer, show/fallback/hide, dismiss. |
| `src/webview/main.ts` | Mount the hover + card; route `linkPreviewContent`; drop stale replies. |
