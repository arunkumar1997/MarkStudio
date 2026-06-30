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

---

## v2 follow-ups (T-4.1a + T-4.1c, Sprint 6 — closes Phase 4)

> Status: **implemented in Sprint 6**. The durable decision is recorded as [ADR-0024](../DECISIONS.md#adr-0024-markdown-link-backlinks-and-heading-level-promotion-via-additive-widening-of-the-link-index). Sprint 6 closes the two carry-overs ADR-0020 explicitly deferred:
>
> * **T-4.1a — Markdown-link backlinks:** the same index that already feeds wiki-link backlinks now also feeds `[text](./note.md)` standard Markdown links.
> * **T-4.1c — Heading-level backlinks:** a link targeting `#heading` is now resolved to a per-target heading line and surfaced in the Backlinks panel description; the Graph view stays note-level on purpose.

### Producer non-negotiables

The widening is **additive**, not a refactor:

* Zero new runtime dependencies.
* Zero new settings, commands, messages, watchers, or workspace scans.
* `NoteLink` is **widened**, not split — every M4.1 / T-4.1b / M4.2 / M4.4 test passes without modification.
* Markdown-link resolution is **explicit-path only** — no basename fallback (that is the wiki affordance).
* Heading-level granularity lives in the **index + Backlinks panel only**; the Graph view stays note-level (ADR-0023 unchanged).

### Markdown-link resolution rules

| Destination written in source | Resolves to | Rule |
| ----------------------------- | ----------- | ---- |
| `[text](./note.md)` (from `a/Source.md`) | `a/note.md` if it exists, else dropped | **Explicit relative path**, joined with `dirname(sourcePath)` |
| `[text](../sibling/note.md)` | The normalised relative path, if it exists, else dropped | `..` segments collapse via the existing `normalizePath` |
| `[text](note.md)` (no `./`) | Treated as relative-to-source (CommonMark) | Same as `./note.md` |
| `[text](<./note with spaces.md>)` | The angle-bracket destination, unwrapped | `<…>` allowed around the destination |
| `[text](./note.md "title")` | Same as `./note.md` | Optional `"title"` after the destination is ignored for indexing |
| `[text](./note.md#heading)` | `./note.md` at the heading line, when found | `?query` / `#anchor` stripped before path resolution |
| `[text](https://…)` / `mailto:…` / `vscode:…` / `file://…` | — | **Absolute URL skipped** (any `scheme:` prefix or leading `//`) |
| `[text](#section)` | — | **Bare anchor** — same-document, not a cross-note backlink |
| `[text](/docs/x.md)` | — | **Workspace-absolute skipped in v1** (ambiguous in multi-root; deferred) |
| `[text][id]` + `[id]: ./note.md` | — | **Reference-style skipped in v1** (deferred) |

The resolver runs after the path is joined and normalised — a destination that does not exist in the index is **dropped**, never falling back to basename. Authors who want fuzzy matching reach for `[[note]]`.

### Heading-level promotion (T-4.1c)

`Backlink` gains `targetLine: number | null`. For a wiki-link or Markdown-link with `heading !== null`, the build pass resolves the target heading to a 0-based line in the **target** note via `findHeadingLine(targetText, heading)` (`src/outline/headings.ts`, already in production for M4.2 hover preview and T-4.1b click navigation). A miss returns `null` — the backlink remains at the file level (matching the M4.2 unresolved-heading → top-of-note policy).

To make this cheap, `buildLinkIndex` keeps a per-build closure cache keyed by `${targetPath}\u0000${heading}`. The first backlink to a given target heading runs `findHeadingLine`; every later backlink to the same heading hits the cache. The cache lives in the **closure** (not on the service), so each watcher-driven rebuild rebuilds it and stale heading lines are structurally impossible.

`buildLinkIndex` is now fed `ParsedNote { path, text, links }` — text added, so the build pass can call `findHeadingLine` against the target note without re-reading from disk. `LinkIndexService.indexFile` already has the text in hand; passing it through is one new field, no new I/O.

### Unified `NoteLink` (additive widening)

```ts
interface NoteLink {
  target: string;
  heading: string | null;
  line: number;
  snippet: string;
  kind: "wiki" | "markdown"; // NEW
}

interface Backlink {
  sourcePath: string;
  line: number;
  snippet: string;
  heading: string | null;
  kind: "wiki" | "markdown";   // NEW
  targetLine: number | null;    // NEW
}

interface ParsedNote {
  path: string;
  text: string;                 // NEW (so the build pass can resolve headings)
  links: ReadonlyArray<NoteLink>;
}
```

`GraphEdge` is **unchanged** — edge weight collapses across both kinds (per-kind split is a deferred follow-up). The pre-Sprint-6 backlink build loop, ordering rules, dedupe key, and self-link policy are untouched.

### Files touched

| File | Change |
| ---- | ------ |
| `src/links/parseMarkdownTargets.ts` | **NEW**. Pure extractor mirroring `parseWikiTargets.ts`: shares front-matter / fence / inline-code skipping; scans `[text](destination)` (optionally `<dest>`-bracketed, optionally with a `"title"`); emits `{ target, heading, line, snippet }` for relative `.md`/`.markdown` destinations only. Reference-style and bare-anchor links are skipped here, never reach the resolver. |
| `src/links/linkIndex.ts` | Widen `NoteLink` with `kind`; widen `Backlink` with `kind` + `targetLine`; add `text` to `ParsedNote`; add a per-build heading-line cache; add `resolveMarkdownTarget` next to the existing wiki resolver. The reverse-index build pass, ordering, dedupe key, and self-link policy are unchanged. |
| `src/links/LinkIndexService.ts` | Run both extractors per file, tag each link with `kind`, merge. Pass note text through to `ParsedNote`. No new event, no new watcher, no new scan. |
| `src/links/BacklinksTreeProvider.ts` | `iconPath` reflects `kind` (`$(symbol-reference)` for wiki, `$(link)` for Markdown); description gains ` → <heading>` suffix when `heading !== null`; tooltip appends `→ <heading> (line N)` when `targetLine !== null`. The tree stays flat — one entry per linking line. |
| `src/graph/*` | **No change.** The Graph view already consumes `LinkIndex.allEdges()`; Markdown-link edges flow in automatically once the index produces them. |
| `package.json` | **No change.** |

### Tree-item description format

* **Wiki, no heading:** `line 12 · sees [[Guide]]` (unchanged)
* **Wiki with heading, found:** `line 12 → Setup · sees [[Guide#Setup]]`
* **Wiki with heading, not found:** `line 12 · sees [[Guide#Typo]]` (no suffix — degraded gracefully)
* **Markdown, no heading:** `line 4 · see [Guide](./Guide.md)`
* **Markdown with heading, found:** `line 4 → Setup · see [Guide](./Guide.md#Setup)`

Snippet truncation continues to bite last so the heading suffix is never the part that gets dropped.

### Out of scope (deferred)

* **Reference-style Markdown links** (`[text][id]` + `[id]: ./note.md`) — two-pass resolver.
* **Workspace-absolute Markdown links** (`/docs/x.md`) — needs a multi-root strategy.
* **Per-kind edge weight split** in the Graph view.
* **Hover preview on standard Markdown links** — would need a second delegated listener and its own security review.
* **Heading-level *grouping*** in the Backlinks panel ("group by target heading" view-mode).
* **Heading-level *nodes*** in the Graph view (ADR-0023 keeps the graph note-level by design).
* **Slug-based heading matching** (so `## **Bold**` resolves from `#bold`) — shared with the outline.

### Verification

The unit tests pin the new behaviour: Markdown-extractor edge cases (front-matter / fences / inline code / `"title"` / `<…>` brackets / external URLs / bare anchors / reference-style rejection); index integration on mixed-kind notes; heading-line cache hit/miss; backwards-compat on wiki-only inputs (every existing assertion intact). Integration assertions cover the Backlinks tree-item shape (icon vocabulary, description heading suffix, tooltip target-line). Manual F5 against a mixed-kind fixture vault confirms the panel renders correctly across the dark / light / high-contrast theme matrix and that the Graph view picks up the new Markdown-link edges automatically.
