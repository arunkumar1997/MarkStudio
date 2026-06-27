# Design — In-Preview Wiki-Link Navigation (T-4.1b, Phase 4)

> Pre-implementation design for making rendered wiki-links clickable in the preview. Status: **implemented**. The durable decision is recorded as [ADR-0021](../DECISIONS.md#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message).

## Problem

The preview already **renders** wiki-links (`[[note]]`, `[[note|alias]]`, `[[note#heading]]`) as styled `a.markstudio-wikilink` anchors carrying their target in `data-*` (T-3.4), and M4.1 shipped a host-side resolver that maps a `[[target]]` to a workspace file ([ADR-0020](../DECISIONS.md#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher)). What's missing is the connection between them: clicking such a link does nothing.

T-4.1b makes those anchors **navigable** — clicking `[[note]]` opens the target note in an editor, and `[[note#heading]]` reveals the heading line. It is the in-document counterpart to the Backlinks panel's "what links here," and it must reuse the M4.1 resolver rather than grow a second one.

The constraint is architectural: resolution and editor navigation are **host** responsibilities (ADR-0001/0004 — the webview has neither the workspace file index nor the `vscode` API to open a note), but the **click** happens in the webview's preview DOM. So the click has to cross the host ⇄ webview boundary, without recreating the webview (ADR-0002).

## Options considered

1. **Webview delegates the click; host resolves + navigates** — one delegated listener on the persistent preview pane posts a new `openWikiLink` message; the host resolves via the shared M4.1 index and opens the note. Resolution stays where the architecture already puts it.
2. **Resolve in the webview, post a ready-made path** — rejected: the webview has no workspace file index and no `vscode` API; it would need a synced copy of the index shipped across the protocol.
3. **A second, webview-local resolver** — rejected: it would duplicate ADR-0020's basename/relative-first/ambiguity rules and inevitably drift.

**Chosen: option 1.** See [ADR-0021](../DECISIONS.md#adr-0021-in-preview-wiki-link-navigation-via-a-shared-host-side-resolver-and-an-openwikilink-message) for the full rationale.

## Data flow

```
preview DOM: <a class="markstudio-wikilink"
                data-wikilink-target="Guide"
                data-wikilink-heading="Setup">…</a>
        │  user clicks
        ▼
registerWikiLinkClicks(previewPane, bus)              ── one delegated listener
   closest('a.markstudio-wikilink') → read data-*      on the persistent pane
   preventDefault()                                    (survives every patch)
        │  postMessage
        ▼
{ type: "openWikiLink", target: "Guide", heading: "Setup" }   ── webview → host
        │
        ▼
MarkStudioEditorProvider.openWikiLink(fromUri, target, heading)
   LinkIndexService.resolveTarget(fromUri, target) ──▶ vscode.Uri[]   (shared M4.1 index)
        │  open-first on ambiguity; status-bar message on miss
        ▼
workspace.openTextDocument(uri) → window.showTextDocument(doc)
   heading ? reveal findHeadingLine(text, heading) : top of file
```

## Resolution & navigation rules (Producer decisions, plan §4)

The resolver is **the M4.1 resolver**, reused verbatim — so a clicked link and its backlink resolve identically.

| Situation | Behaviour | Rule |
| --------- | --------- | ---- |
| `[[Guide]]` | open `Guide.md` anywhere in the workspace | Case-insensitive **basename** (ADR-0020) |
| `[[docs/Guide]]` (from `a/Note.md`) | open `a/docs/Guide.md` if it exists, else basename | Path-qualified **relative-first**, else basename |
| `[[Guide]]` with two `Guide.md` | open the **first** match | Ambiguous → open-first, **no quick-pick** this sprint |
| `[[Self]]` in `Self.md` | open `Self.md` | Forward resolution **keeps** self-match (differs from the backlink build, which drops self) |
| `[[Guide#Setup]]` | open `Guide.md`, reveal the `## Setup` line | `findHeadingLine`, case-insensitive trimmed exact match; miss → top of file |
| `[[Missing]]` (no match) | transient status-bar message, no open | **Existing notes only** — no click-to-create this sprint |
| `[[#heading]]` (empty target) | inert | Same-document heading links deferred |

No quick-pick, no note creation, no modal dialogs.

## Files

* `src/messaging/messages.ts` — new `OpenWikiLinkMessage` (`type: "openWikiLink"`, `target: string`, `heading: string | null`) in the `WebviewToHostMessage` union, plus a boundary-guard case in `isWebviewToHostMessage` (validates `target` is a string and `heading` is string-or-null).
* `src/links/linkIndex.ts` — new **pure** `LinkIndex.resolveForward(fromPath, target): string[]`, a public wrapper over the private `resolveTarget` the backlink build already used. Unit-tested; keeps the self-match.
* `src/links/LinkIndexService.ts` — new `resolveTarget(fromUri, target): vscode.Uri[]` URI wrapper around `resolveForward`.
* `src/outline/headings.ts` — new **pure** `findHeadingLine(text, heading): number` (case-insensitive trimmed exact match on raw heading source; `-1` on miss). Lives with the outline scanner since both reason about heading lines.
* `src/links/registerBacklinks.ts` — signature changes to `registerBacklinks(provider, service)`; the service is now injected rather than constructed/started internally.
* `src/extension.ts` — creates the **single** `LinkIndexService`, calls `start()`, injects it into `register()` and `registerBacklinks()`, and disposes it via `context.subscriptions`.
* `src/editor/MarkStudioEditorProvider.ts` — takes the injected `linkIndexService`; adds the `openWikiLink` case to the message-bus switch and a private `async openWikiLink(fromUri, target, heading)` that resolves, opens, and reveals the heading.
* `src/webview/preview/wikiLinkClick.ts` — **new** `registerWikiLinkClicks(previewRoot, bus)`: one delegated `click` listener using `Element.closest('a.markstudio-wikilink')`, reading `data-wikilink-target` / `data-wikilink-heading`, calling `preventDefault()`, and posting `openWikiLink`.
* `src/webview/main.ts` — mounts `registerWikiLinkClicks(shell.previewPane, bus)` after scroll-sync.

## Public surface added

* One webview → host message: `openWikiLink` (see [api/message-protocol.md](../api/message-protocol.md)).
* No new view, command, setting, or dependency. The feature is gated by the existing `markstudio.preview.wikiLinks` toggle — a non-rendered link can't be clicked.

## Decisions & trade-offs

* **One resolver, shared** — `resolveForward` exposes the existing index instead of forking it, so the Backlinks panel and click-navigation are provably consistent. The only difference is the self-policy (forward keeps self; backlink drops it), applied by each caller, not by the resolver.
* **One `LinkIndexService`, hoisted to `extension.ts`** — the panel and click-navigation share one workspace scan and one live index; no second `FileSystemWatcher`, no duplicate memory.
* **One delegated listener on the persistent pane** — `shell.previewPane` is never replaced (ADR-0002), so a single listener survives every incremental preview patch; no per-render rebinding.
* **Open-first / status-bar-on-miss** — the lowest-friction defaults; disambiguation quick-pick and click-to-create are deferred follow-ups.
* **Known limitations (v1):** ambiguous basenames open the first match silently; unresolved targets only surface in the status bar; `findHeadingLine` is an exact match on raw source, so headings with inline Markdown (`## **Bold**`) don't navigate; same-document `[[#heading]]` links are inert. All tracked in ADR-0021 follow-ups.

## Verification

Unit tests pin `resolveForward` (basename, case-insensitivity, `.md` extension, ambiguous → all matches, path-qualified relative-first + basename fallback, self-match kept), `findHeadingLine` (exact/case-insensitive/trimmed match, miss, front-matter skip), and the `openWikiLink` guard (well-formed accept; missing/!string `target`, non-string-or-null `heading` reject). An integration test exercises the click → message seam: a click on `a.markstudio-wikilink` reads the `data-*` and posts `openWikiLink`, while clicks elsewhere and on non-wiki anchors stay inert. The live behaviour — actually opening the note and revealing the heading in the Extension Development Host — stays in the manual matrix and QA sign-off.
