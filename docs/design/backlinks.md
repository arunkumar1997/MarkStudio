# Design — Backlinks Panel (T-4.1, Phase 4 M4.1)

> Pre-implementation design for the backlinks panel and the host-side wiki-link resolver. Status: **implemented**. The durable decision is recorded as [ADR-0020](../DECISIONS.md#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher).

## Problem

Phase 4 (M4.1) opens the Knowledge-Management layer with a **backlinks panel**: for the active MarkStudio note, list every *other* workspace note that links to it via a wiki-link (`[[note]]`), and open the source at the linking line on click. The index must stay live as files change and must **never block the UI**, even on a large vault (the Phase 4 exit criterion).

This sprint also lands the **wiki-link resolver** that [ADR-0018](../DECISIONS.md#adr-0018-wiki-links-as-a-dependency-free-markdown-it-inline-rule) deferred from Phase 3 — the shared primitive that maps a `[[target]]` to a workspace file. The preview's T-3.4 rule only *styled* `[[…]]` and carried its target as `data-*`; here we actually resolve it.

VS Code has no native "what links here" surface that works for a custom editor (the same gap the outline faced in [ADR-0014](../DECISIONS.md#adr-0014-document-outline-as-a-host-side-treedataprovider)), and the data is cross-file rather than per-document, so it cannot be derived from open `TextDocument`s alone — it needs a workspace-wide index.

## Options considered

1. **Host-side `TreeDataProvider` + a workspace link index behind a `FileSystemWatcher`** — a native tree view that follows the active note, backed by an async, debounced, incremental index. Native chrome, no webview UI.
2. **In-webview backlinks pane** — rejected for the same reasons as the outline: duplicates UI a native tree gives for free, adds a pane + state to the App Shell, conflicts with "less UI is better / native beats custom."
3. **Reconcile from open documents only (no watcher)** — rejected: the index must see notes no editor has open, for which `onDidChangeTextDocument` never fires.

**Chosen: option 1**, mirroring the Outline. See [ADR-0020](../DECISIONS.md#adr-0020-host-side-link-index-with-a-case-insensitive-basename-resolver-behind-a-filesystemwatcher) for the full rationale, including why a `FileSystemWatcher` is warranted here in contrast to [ADR-0009](../DECISIONS.md#adr-0009-reconcile-external-changes-through-the-managed-textdocument-with-a-cursor-preserving-diff).

## Data flow

```
workspace.findFiles("**/*.md")  ──async, batched fs.readFile──▶ parseWikiTargets(text)
        │  (kicked off at activation, NOT awaited)                        │
        ▼                                                                 ▼
  FileSystemWatcher("**/*.md")                                   WikiTarget[] + snippet
   create / change / delete ──debounce 250 ms──▶ notes: Map<path, ParsedNote>
        │                                                                 │
        ▼                                                          buildLinkIndex(notes)
   onDidChangeIndex ◀── rebuild reverse index ◀──────────── Map<noteKey, Backlink[]>
        │
        ▼
BacklinksTreeProvider (follows onDidChangeActiveDocument) ──▶ TreeView (Explorer)

click a node ──command markstudio.backlinks.open(uri, line)──▶
   workspace.openTextDocument(uri) → window.showTextDocument(doc, { selection: line })
```

## Resolution rules (Producer decisions, plan §4)

| Target written in source | Resolves to | Rule |
| ------------------------ | ----------- | ---- |
| `[[Guide]]` | `Guide.md` anywhere in the workspace | Case-insensitive **basename** |
| `[[guide]]` | `Guide.md` | Case-insensitive |
| `[[Guide.md]]` | `Guide.md` | Trailing `.md`/`.markdown` stripped |
| `[[docs/Guide]]` (from `a/Note.md`) | `a/docs/Guide.md` if it exists, else basename `guide` | **Path-qualified → relative first**, else basename |
| `[[Guide]]` with two `Guide.md` files | **both** | Ambiguous basename links all matches (no error) |
| `[[Self]]` in `Self.md` | — | A note never backlinks itself |
| `[[Guide#Setup]]` | `Guide.md` | `#heading` captured, resolved to the **file** this sprint |

The snippet shown in the tree is the **trimmed source line** containing the link.

## Files

New host-side module `src/links/` (mirrors `src/outline/`):

* `src/links/parseWikiTargets.ts` — **pure** `parseWikiTargets(text): WikiTarget[]`. No `vscode`/DOM imports; unit-tested. Reuses the T-3.4 syntax rules (close on the same line, reject nested `[`/`]`); skips fenced code blocks, leading YAML front matter, and inline code spans. A same-document `[[#heading]]` (empty target) is not returned.
* `src/links/linkIndex.ts` — **pure** `buildLinkIndex(notes): LinkIndex`, the reverse-index + **resolver**. No `vscode`/file-system imports; unit-tested. Operates on plain `ParsedNote` data (path + links) so the resolution rules above are testable without VS Code.
* `src/links/LinkIndexService.ts` — owns the I/O: async batched `workspace.findFiles` + `fs.readFile` scan, a `FileSystemWatcher` on `**/*.md`, a 250 ms debounce, per-file incremental re-parse, and the `onDidChangeIndex` event. Maps the pure index's path strings back to `vscode.Uri`s.
* `src/links/BacklinksTreeProvider.ts` — `vscode.TreeDataProvider<ResolvedBacklink>`; holds the active document URI, recomputes backlinks on demand, exposes `backlinkCount` for the empty-state message. One flat node per source note + linking line.
* `src/links/registerBacklinks.ts` — creates the `LinkIndexService` + `TreeView`, follows the active doc (`onDidChangeActiveDocument`), refreshes on `onDidChangeIndex`, and registers the internal `markstudio.backlinks.open` command. Returns one disposable.
* `src/extension.ts` — `registerBacklinks(provider)` in `context.subscriptions`, alongside `registerOutline(provider)`.
* `package.json` — `contributes.views.explorer` → `markstudio.backlinks`, `when: "activeCustomEditorId == 'markstudio.editor'"`.

## Public surface added

* View `markstudio.backlinks` (Explorer container, visible only while a MarkStudio editor is active).
* Internal command `markstudio.backlinks.open` (tree-item click target; **not** contributed to the palette).
* No host ⇄ webview message, no protocol change, no new setting.

## Decisions & trade-offs

* **Native tree view, not webview UI** — mirrors the Outline (ADR-0014); free theming, keyboard nav, the Explorer look, zero custom chrome.
* **Pure parse + resolve, I/O in the service** — `parseWikiTargets` and `linkIndex` are dependency-free and unit-tested (the resolver's rules are pinned without a VS Code host); the service is the thin host-API glue exercised manually / in the Extension Host layer, exactly as `OutlineTreeProvider` / `registerOutline` are.
* **Async, debounced, incremental indexing** — the initial scan is kicked off but not awaited (activation never blocks), watcher bursts are coalesced, and only the changed file is re-parsed before the cheap reverse-index rebuild. This is the Phase 4 exit criterion in practice.
* **A `FileSystemWatcher` *is* warranted here** — unlike the text-backed editor (ADR-0009), the index must see files no editor has open; the workspace watcher is the supported API for that breadth (ADR-0004). See ADR-0020.
* **Open in a plain text editor** — the custom editor is `priority: "option"`, so `showTextDocument` opens the built-in text editor (which honours `selection`) and reliably reveals the linking line in the file the user is navigating *to*.
* **Known limitations (v1):** wiki-links only (Markdown links are a follow-up); `#heading` is captured but grouped at the file level; path identity is the workspace-relative POSIX path, so an identically-named file in two roots of a multi-root workspace could collide on resolution; the panel follows only the active MarkStudio editor.

## Verification

The unit tests (pure, mock-free) cover `parseWikiTargets` (syntax + skipped regions: fences, front matter, inline code, nested-bracket / ordinary-link rejection, multi-line) and `buildLinkIndex` (basename + case-insensitivity, `.md` extension, ambiguous basenames, path-qualified relative-first + basename fallback, no self-link, per-line dedupe, sort order, heading carry-through). The live behaviour — backlinks appearing/updating as files are created/changed/deleted, click-to-open at the line, and large-workspace responsiveness — stays in the manual Extension Development Host matrix.
