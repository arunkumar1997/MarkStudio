# Sprint 3 — T-4.1b In-preview wiki-link navigation

> Producer: **Remy**. Created 2026-06-27. Second Phase 4 — Knowledge Management sprint (follows M4.1, T-4.1).
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).
> Branch: `feature/sprint-3` off `main` (`31fe689`).

---

## 1. Sprint Goal

Make a wiki-link **clickable inside the live preview**: clicking a `[[target]]` (or `[[target|alias]]`, `[[target#heading]]`) in the preview pane resolves the target via the **host-side resolver shipped in M4.1** (`src/links/`) and opens the resolved note — at the `#heading` line when one is present, else the top of the file.

This closes the most visible gap from the M4.1 F5 pass (clicking a preview link currently does nothing — the T-3.4 anchors carry `data-wikilink-target` / `data-wikilink-heading` but no `href`) and exercises the resolver end-to-end ahead of **M4.2 — Hover preview for links**.

## 2. Scope (Producer decisions)

**In scope**
* **Preview click handling.** A delegated click listener in the webview detects clicks on `a.markstudio-wikilink`, reads its `data-wikilink-target` (+ optional `data-wikilink-heading`), prevents the default, and posts a new **`openWikiLink`** message to the host. No per-anchor listeners (delegation only — Performance is a feature).
* **New typed message `openWikiLink` (webview → host).** Carries `target: string`, `heading: string | null`. Added to the discriminated union in `src/messaging/messages.ts` **with a boundary guard** (untrusted-input rule, CODING_GUIDELINES §9). This is the first protocol addition since the Outline's `revealLine`.
* **Host-side resolve + open.** The host resolves `target` **relative to the active document's URI** (so `[[sub/Note]]` and ambiguous basenames behave exactly as the Backlinks panel does), then opens the resolved file. Reuses the M4.1 resolver — add a small `resolveTarget(fromUri, target): vscode.Uri | vscode.Uri[] | null` surface on `LinkIndexService` (delegating to a pure resolver in `linkIndex.ts`), rather than duplicating resolution logic.
* **Heading navigation.** When `heading` is present, reveal the heading's line in the opened note (reuse the host heading scanner `src/outline/headings.ts`); otherwise open at line 0. Falls back to line 0 when the heading is not found.
* **Graceful degradation.** Unresolved target → a non-intrusive signal (status-bar / `window.setStatusBarMessage` or a quiet `window.showWarningMessage`), never a crash. Ambiguous basename (multiple matches) → open the first by the resolver's existing stable order (document later in the design note); a quick-pick disambiguation is a follow-up, not this sprint.

**Out of scope (do not pull forward)**
* **Hover preview** for links — that is **M4.2**, the next milestone (this sprint is the click primitive it builds on).
* **Markdown-link** (`[text](note.md)`) clicking/indexing — that is **T-4.1a**.
* **Heading-level *backlinks*** (grouping the Backlinks panel by heading) — that is **T-4.1c**; this sprint only *navigates* to a heading, it does not change the panel.
* **Creating a missing note** on click ("click to create") — defer; v1 only navigates to existing notes.
* **Quick-pick disambiguation** UI for ambiguous basenames — defer (open-first this sprint).
* Any CodeMirror / source-pane link affordance — preview-only this sprint.

## 3. Architecture (project-specific)

Touches the webview, the shared message contract, and the host resolver. **No webview structural change** — no new pane, no editor/preview recreation; a single delegated listener on the existing preview root.

| File | Responsibility | Must NOT |
|---|---|---|
| `src/webview/preview/wikiLinks.ts` (or a small new `wikiLinkClick.ts` beside it) | Delegated click handler on the preview root: match `a.markstudio-wikilink`, read `data-*`, `preventDefault`, post `openWikiLink`. | Resolve files itself; add per-anchor listeners; touch the DOM render path |
| `src/messaging/messages.ts` | Add `OpenWikiLinkMessage` to `WebviewToHostMessage` + a boundary guard in `isWebviewToHostMessage`. | Import `vscode`/DOM; carry non-JSON payloads |
| `src/links/linkIndex.ts` | Add a **pure** `resolveTarget(fromPath, target)` (basename + path-qualified relative-first, mirroring `backlinksFor`'s resolution) returning the matching path key(s). | Touch the file system |
| `src/links/LinkIndexService.ts` | Wrap the pure resolver as `resolveTarget(fromUri, target): vscode.Uri \| vscode.Uri[] \| null` (path→URI mapping). | Re-scan on resolve; block |
| `src/editor/MarkStudioEditorProvider.ts` (host message handler) | On `openWikiLink`: resolve via the shared `LinkIndexService`, scan headings if a `#heading` is set, open via `showTextDocument` at the line (reuse the M4.1 open-at-line helper). | Recreate the webview; duplicate resolver logic |

The `LinkIndexService` is currently created **inside `registerBacklinks`**. To reuse one index for both the panel and click-navigation without a second workspace scan, **hoist the single `LinkIndexService` instance** to `extension.ts` and inject it into both `registerBacklinks(provider, service)` and the editor provider's message handler. Record this wiring choice in the design note (and an ADR if it changes the ownership model materially).

## 4. Producer decisions (pre-empt scope creep)

1. **Resolve relative to the *active note*** (the note whose preview was clicked), identical to the Backlinks panel — not relative to the workspace root.
2. **Open-first on ambiguity** this sprint; a disambiguation quick-pick is a tracked follow-up.
3. **Navigate to existing notes only** — no click-to-create.
4. **One shared `LinkIndexService`** for the panel and click-nav (hoist to `extension.ts`); do not spin up a second index.
5. **Reuse the existing open-at-line helper** (`openSourceAtLine` pattern from `registerBacklinks.ts`) and the heading scanner (`src/outline/headings.ts`) — no new navigation primitive.
6. **No new setting** — wiki-links are already gated by `markstudio.preview.wikiLinks`; when that is off no anchors render, so click-nav is inertly absent.

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| 1 | `messages.ts` — add `OpenWikiLinkMessage` (`target`, `heading`) to `WebviewToHostMessage` + boundary guard | **Sage** |
| 2 | `linkIndex.ts` — pure `resolveTarget(fromPath, target)`; `LinkIndexService.resolveTarget(fromUri, target)` URI wrapper | **Sage** |
| 3 | Hoist the single `LinkIndexService` to `extension.ts`; inject into `registerBacklinks` + the editor provider | **Sage** |
| 4 | Host handler in `MarkStudioEditorProvider` — resolve + heading-scan + open-at-line on `openWikiLink` | **Sage** |
| 5 | Webview delegated click handler — match `a.markstudio-wikilink`, read `data-*`, post `openWikiLink` | **Nova** |
| 6 | ADR (shared index ownership / new message) + `design/wiki-navigation.md` | **Sage** + Producer review |
| 7 | Unit tests: pure `resolveTarget` (basename, relative-first, ambiguous, miss); `messages.ts` guard accepts/rejects `openWikiLink`; integration test for the webview click → message seam | **Ivy** |
| 8 | Manual EDH (F5): click `[[note]]`, `[[note|alias]]`, `[[note#heading]]` in the preview opens the right note/line; ambiguous + unresolved behave; dark/light/high-contrast | **Ivy** |
| 9 | Docs pass: `api/message-protocol.md` (document `openWikiLink`), CHANGELOG, FEATURES, ROADMAP, TODO (close T-4.1b), ARCHITECTURE, PROJECT_STATUS, AGENT_HANDOFF | **Sage** + Producer |

## 6. Success Criteria (Definition of Done)

* [ ] Clicking a `[[B]]` in the preview opens note **B** in an editor.
* [ ] `[[B#Heading]]` opens **B** and reveals the `Heading` line (falls back to line 0 if absent).
* [ ] `[[B|alias]]` (rendered as "alias") still resolves on the underlying target **B**.
* [ ] Resolution is relative to the **active note** and matches the Backlinks panel for the same target (case-insensitive basename; path-qualified relative-first).
* [ ] An unresolved target degrades gracefully (a quiet message, no crash); an ambiguous basename opens the first match.
* [ ] The new `openWikiLink` message is in the typed union **and** rejected by the boundary guard when malformed.
* [ ] Only **one** `LinkIndexService` exists (shared by the panel and click-nav); no second workspace scan.
* [ ] No webview recreation, no new pane, no editor/preview remount; a single delegated listener.
* [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` all green; new unit/integration tests added.
* [ ] Docs updated (incl. `api/message-protocol.md` for the new message); **T-4.1b marked Done** in TODO. QA sign-off in `docs/qa/sprint-3-signoff.md`.

## 7. Guardrails (project-specific)

* **Native + minimal.** Click is delegated (one listener on the preview root), not per-anchor; the DOM render path is untouched (anchors already exist from T-3.4).
* **Untrusted boundary.** The `openWikiLink` payload is validated by a guard before the host acts (CODING_GUIDELINES §9); the host never trusts a raw `target`/`heading` string.
* **Reuse, don't duplicate.** Resolution = the M4.1 resolver; open-at-line = the M4.1 helper; heading line = `src/outline/headings.ts`. No parallel implementations.
* **Single index.** One `LinkIndexService` for the workspace; sharing it is the whole point of hoisting it.
* **Graceful degradation.** With `markstudio.preview.wikiLinks` off there are no anchors and nothing to click — the feature is inertly absent, no special-casing.
* **Performance is a feature.** No new scan on click; resolution is an in-memory map lookup; heading scan runs only when a `#heading` is present.

## 8. Branch & merge rules

* Dev branch: `feature/sprint-3` off `main` (`31fe689`).
* `feat:` commits referencing **T-4.1b**.
* Regular merge to `main` after QA sign-off — **never squash or rebase** (preserve the commits, as with Sprint 1 & 2).
* Keep Prettier (2-space + final newline) green before every commit — the recurring local formatter drift (4-space reindent / stripped final newline) bit both prior sprints; re-check `prettier --check .` before committing.

## 9. Open questions (resolve during the sprint)

* Should the host resolver live wholly in `linkIndex.ts` as a pure function the panel *also* routes through (unifying panel + click resolution), or stay a thin parallel method? Prefer unifying — note the decision in the ADR.
* For an ambiguous basename, is "open first by stable order" acceptable UX for v1, or worth a quick-pick now? Producer says open-first now; revisit if QA finds it confusing.
* Where exactly does the webview mount the delegated listener — on the preview root element created by the App Shell — and does it need re-binding after a `setContent` reconcile? (It should not, if bound once to the persistent root; confirm in the F5 pass.)
