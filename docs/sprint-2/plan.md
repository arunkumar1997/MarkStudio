# Sprint 2 — T-4.1 Backlinks panel (M4.1)

> Producer: **Remy**. Created 2026-06-27. First milestone of **Phase 4 — Knowledge Management**.
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).

---

## 1. Sprint Goal

Deliver **M4.1 — Backlinks panel**: a native VS Code tree view that, for the active MarkStudio note, lists every other note in the workspace that links to it via a wiki-link (`[[note]]`). Clicking a backlink opens the source note at the linking line. The link index updates as files change and **never blocks the UI**.

This also delivers the **wiki-link resolver** deferred from Phase 3 (T-3.4 / ADR-0018) — the shared Phase 4 primitive that maps a `[[target]]` to a workspace file.

## 2. Scope (Producer decisions)

**In scope**
* Host-side **link index**: scan workspace `.md` files, extract wiki-link targets + the source line, build a reverse map `targetNote → [{ sourceUri, line, snippet }]`.
* **Target resolver**: resolve `[[target]]` / `[[folder/target]]` / `[[target#heading]]` to a workspace `.md` file by **case-insensitive basename** (path-qualified targets resolve relative first, then fall back to basename). The `#heading` is captured but resolution is to the file.
* **`MarkStudio Backlinks` tree view** (Explorer container), visible only while a MarkStudio editor is active, mirroring the Outline pattern (T-2.2 / ADR-0014). Each node = a linking note; clicking opens that file at the linking line via `vscode.window.showTextDocument` + reveal.
* **Incremental updates** via a `FileSystemWatcher` on `**/*.md` (create / change / delete), debounced; the index updates without a full re-scan where practical.
* **Non-blocking indexing**: initial scan is async (`workspace.findFiles` + batched reads); the UI is never blocked (ROADMAP Phase 4 exit criterion).

**Out of scope (do not pull forward)**
* Standard Markdown-link backlinks (`[text](note.md)`) — wiki-links only for v1; Markdown-link indexing is a follow-up.
* Hover preview for links (that is **M4.2**, the next milestone).
* Click-to-navigate wiki-links **inside the preview** — separate task; this sprint resolves targets host-side for the panel, not in-webview navigation.
* Graph view (M4.4), transclusion (M4.3).
* Heading-level backlinks (we capture `#heading` but resolve/group at the file level).

## 3. Architecture (project-specific)

New host-side module `src/links/` (mirrors `src/outline/`):

| File | Responsibility | Must NOT |
|---|---|---|
| `parseWikiTargets.ts` | **Pure** (no `vscode`/DOM): given note text, return `[{ target, heading, line }]`. Reuses the T-3.4 syntax rules (reject newline/nested brackets). | Import `vscode` or markdown-it |
| `linkIndex.ts` | **Pure-ish** reverse-index + resolver: build `Map<resolvedKey, Backlink[]>`; resolve a target to a key by basename. | Touch the file system directly |
| `LinkIndexService.ts` | Workspace scan (`findFiles`), batched async reads, `FileSystemWatcher`, debounce, fire `onDidChangeIndex`. | Block activation; re-scan everything on each change |
| `BacklinksTreeProvider.ts` | `vscode.TreeDataProvider`: backlinks for the active note; node → source file + line. | Render in the webview |
| `registerBacklinks.ts` | Create the `TreeView`, follow the active doc (`onDidChangeActiveDocument`), refresh on `onDidChangeIndex`, register `markstudio.backlinks.open` command. | Parse via the webview tokeniser |

Wire from `src/extension.ts` (alongside `registerOutline`). **No webview/protocol change** — this is entirely host-side, like the Outline.

## 4. Producer decisions (pre-empt scope creep)

1. **Wiki-links only** count as backlinks in v1. Markdown links → follow-up.
2. **Basename resolution, case-insensitive.** `[[Guide]]` matches `Guide.md` anywhere; `[[docs/Guide]]` resolves the relative path first, else basename. Ambiguous basename → all matches are linked (no error).
3. **No new setting.** Mirror the Outline (T-2.2): the panel is always available and shows only when a MarkStudio editor is active. (Revisit a `markstudio.backlinks.*` toggle only if needed.)
4. **File-level grouping.** `#heading` is captured for a future M4.x but backlinks group per source file/line, not per heading.
5. **Snippet = the trimmed source line** containing the link (for readable tree labels/tooltips).

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| 1 | `parseWikiTargets.ts` — pure host-side target extractor (mirror T-3.4 rules) | **Sage** |
| 2 | `linkIndex.ts` — reverse index + basename resolver | **Sage** |
| 3 | `LinkIndexService.ts` — async scan + FileSystemWatcher + debounce + `onDidChangeIndex` | **Sage** |
| 4 | `BacklinksTreeProvider.ts` + `registerBacklinks.ts` — tree view, active-doc follow, open command | **Sage** |
| 5 | Wire into `extension.ts`; add the tree view + command in `package.json` | **Sage** |
| 6 | ADR-0020 (host-side link index + basename resolver) + `design/backlinks.md` | **Sage** + Producer review |
| 7 | Unit tests for `parseWikiTargets` + `linkIndex`/resolver (pure, mock-free); extend the `vscode` mock if the service needs new host APIs | **Ivy** |
| 8 | Manual EDH (F5) verification: multi-file workspace, backlinks appear/update on edit/create/delete, click opens at line, large-workspace responsiveness | **Ivy** |
| 9 | Docs pass: message-protocol (note "no change"), CHANGELOG, FEATURES, ROADMAP (M4.1 → Done), TODO, ARCHITECTURE (`src/links/` real), PROJECT_STATUS, AGENT_HANDOFF | **Sage** + Producer |

## 6. Success Criteria (Definition of Done)

* [ ] Opening note B that is linked from note A via `[[B]]` shows A in the `MarkStudio Backlinks` view.
* [ ] Clicking the backlink opens A and reveals the linking line.
* [ ] Editing/creating/deleting a `.md` file updates the panel (debounced) without a manual refresh.
* [ ] Initial indexing is async and does not block activation or the UI on a large workspace.
* [ ] Basename resolution is case-insensitive; path-qualified targets resolve correctly.
* [ ] No webview recreation, no protocol change; native tree view only (no custom webview chrome).
* [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` all green; new unit tests added.
* [ ] Docs updated; **M4.1 marked Done** in ROADMAP. QA sign-off in `docs/qa/sprint-2-signoff.md`.

## 7. Guardrails (project-specific)

* Native VS Code patterns only — a `TreeDataProvider`, not webview UI (per `.github/copilot-instructions.md` and ADR-0014).
* `FileSystemWatcher` is now genuinely warranted (workspace-wide indexing) — distinct from the text-backed editor reconciliation that ADR-0009 deliberately left to `onDidChangeTextDocument`. Record this distinction in ADR-0020.
* Performance is a feature: async scan, batched reads, debounced updates, incremental where practical. No synchronous workspace walk on the activation path.
* Keep `parseWikiTargets` / `linkIndex` pure so they are unit-testable without booting VS Code.

## 8. Branch & merge rules

* Dev branch: `feature/sprint-2` off `main`.
* `feat:` commits referencing T-4.1.
* Regular merge to `main` after QA sign-off — **never squash or rebase**.
* Watch for the stray formatter that reindents to 4-space / strips final newlines — keep Prettier (2-space + final newline) green before every commit.
