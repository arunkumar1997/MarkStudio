# Sprint 4 — M4.2 Hover preview for links

> Producer: **Remy**. Created 2026-06-30. Third Phase 4 — Knowledge Management sprint (follows M4.1 / T-4.1 and T-4.1b).
> Single source of truth for project state: [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) · [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).
> Branch: `feature/sprint-4` off `main` (`a6d48af`).

---

## 1. Sprint Goal

Hovering a rendered wiki-link in the **live preview** shows a small floating **hover card** previewing the target note — its content rendered with the existing markdown-it renderer — the way Obsidian's hover preview works. `[[note]]` shows the top of the note; `[[note#heading]]` shows the section under that heading. This is the read-side counterpart to T-4.1b's click-to-open, and it builds directly on that sprint's primitives: the shared M4.1 resolver and the persistent preview pane.

## 2. Scope (Producer decisions)

**In scope**
* **Delegated hover detection.** A single delegated `pointerover` / `pointerout` listener on the persistent preview root (mirroring T-4.1b's click delegation) matches `a.markstudio-wikilink` with a non-empty `data-wikilink-target`. After a short **dwell delay (~300 ms)** it requests a preview; leaving the anchor (or the card) before/after cancels and hides. **No per-anchor listeners.**
* **Two new typed messages** in `src/messaging/messages.ts`:
  * `requestLinkPreview` (webview → host) — `target: string`, `heading: string | null`. **Boundary-guarded** (CODING_GUIDELINES §9).
  * `linkPreviewContent` (host → webview) — `target: string`, `heading: string | null`, `status: "ok" | "missing"`, and on `ok` a capped markdown `text: string` plus a `title: string` (the resolved note's basename). Plain JSON only.
* **Host resolve + excerpt.** On `requestLinkPreview` the host resolves `target` relative to the active note through the **shared `LinkIndexService.resolveTarget`** (open-first on ambiguity, identical to click-nav), reads the target via `openTextDocument(...).getText()`, and extracts a **capped excerpt** (see §4). Unresolved → `status: "missing"`; never throws.
* **Hover card UI.** One persistent floating card element owned by the webview, positioned near the anchor, **rendered with the existing markdown-it renderer** (consistency, theming, and `html: false` safety come for free), themed to the VS Code **hover widget** tokens (`--vscode-editorHoverWidget-*`). Shows only if the pointer is still on the same anchor when content arrives; hides on `pointerout`, scroll, click, or Escape.
* **Graceful degradation.** `missing` → a tiny "No note found" card (or silent no-op — decide in the design note), never a crash. With `markstudio.preview.wikiLinks` off there are no anchors, so the feature is inertly absent.

**Out of scope (do not pull forward)**
* **Source-pane (CodeMirror) hover** — preview-pane only this sprint; CM6 hover is a separate follow-up.
* **Markdown-link (`[text](note.md)`) hover/indexing** — that is T-4.1a.
* **Transclusion / embedding** the target inline — that is **M4.3** (this sprint only shows a transient *preview*, it does not embed).
* **Nested hover** (hovering a link *inside* a hover card) — defer.
* **Live card updates** while the target file changes — the card is a static snapshot taken at hover time.
* **Heavy caching / prefetch** — a trivial "ignore stale responses" guard is enough; an LRU cache is a follow-up.
* **Quick-pick / disambiguation** for ambiguous basenames — open-first (same as click-nav).

## 3. Architecture (project-specific)

Touches the webview, the shared message contract, and the host resolver — **no webview structural change** (no new pane, no editor/preview recreation). Reuses T-4.1b's resolver and the persistent preview root.

| File | Responsibility | Must NOT |
|---|---|---|
| `src/webview/preview/wikiLinkHover.ts` (new) | Delegated `pointerover`/`pointerout` on the preview root; dwell timer; post `requestLinkPreview`; cancel on leave. Pairs with `wikiLinkClick.ts`. | Resolve/read files; add per-anchor listeners; touch the render path |
| `src/webview/preview/HoverCard.ts` (new) | One floating card element: position near the anchor, render the excerpt via the existing renderer, show/hide, dismiss on leave/scroll/Esc. | Fetch content itself; recreate on every hover |
| `src/messaging/messages.ts` | `RequestLinkPreviewMessage` (W→H) + guard; `LinkPreviewContentMessage` (H→W). | Import `vscode`/DOM; carry non-JSON |
| `src/links/linkExcerpt.ts` (new, **pure**) | Extract a capped excerpt from note text; when a `heading` is given, slice that heading's section (reuse `parseHeadings` / `findHeadingLine`). | Touch the file system |
| `src/editor/MarkStudioEditorProvider.ts` | `requestLinkPreview` handler: resolve via shared service → read → `linkExcerpt` → post `linkPreviewContent`. | Recreate the webview; duplicate resolver logic |
| `src/webview/main.ts` | Mount the hover + card; route `linkPreviewContent` to the card. | Remount anything |

Reuse, don't duplicate: resolution = the shared `LinkIndexService.resolveTarget` (T-4.1b); heading slice = `parseHeadings` + `findHeadingLine` (T-2.2 / T-4.1b); card rendering = the existing preview renderer. No parallel implementations.

## 4. Producer decisions (pre-empt scope creep)

1. **Host returns markdown TEXT, not HTML.** The webview renders it with its own renderer — keeps theming + `html: false` safety + output consistent with the main preview. The host never ships rendered HTML.
2. **Excerpt cap:** first **~60 lines or ~2,000 characters**, whichever comes first (dev tunes within reason); when a `#heading` is present, take that heading's section (from the heading line to the next same-or-higher heading), then apply the same cap. Falls back to the top of the note when the heading is not found.
3. **Open-first on ambiguity** (consistent with T-4.1b); no quick-pick.
4. **No new setting this sprint.** Gated by the existing `markstudio.preview.wikiLinks` (off ⇒ no anchors ⇒ nothing to hover). *Open question (§9): is hover-preview intrusive enough to deserve its own `markstudio.preview.linkHoverPreview` toggle? Default to "no new setting"; revisit if QA finds it intrusive.*
5. **Dwell delay ~300 ms**, single timer; hide promptly on leave. No new dependency.
6. **Static snapshot** — no live re-render while hovering; no nested hover.
7. **Reuse the shared resolver + renderer + heading scanner** — no new navigation/resolution/render primitive.

## 5. Tasks & Owners

| # | Task | Owner |
|---|---|---|
| 1 | `messages.ts` — `RequestLinkPreviewMessage` (+ guard) + `LinkPreviewContentMessage` | **Sage** |
| 2 | `linkExcerpt.ts` — pure capped excerpt + heading-section slice (reuse `parseHeadings`/`findHeadingLine`) | **Sage** |
| 3 | Host `requestLinkPreview` handler — resolve (shared service) → read → excerpt → post `linkPreviewContent` | **Sage** |
| 4 | `wikiLinkHover.ts` — delegated hover, dwell timer, request, cancel-on-leave | **Nova** |
| 5 | `HoverCard.ts` — floating card: position, theme (hover-widget tokens), render via the existing renderer, show/hide/dismiss | **Nova** |
| 6 | `main.ts` wiring + route `linkPreviewContent`; ignore stale responses | **Nova** |
| 7 | ADR-0022 (hover preview / two new messages / text-not-HTML) + `design/wiki-hover.md` | **Sage** + Producer review |
| 8 | Unit + integration tests: pure `linkExcerpt` (top, heading section, cap, miss); guards accept/reject `requestLinkPreview`; hover→request seam (dwell + cancel); `linkPreviewContent`→card render | **Ivy** |
| 9 | Manual EDH (F5): hover `[[note]]` / `[[note#heading]]` shows the card; missing/ambiguous; dismiss on leave/scroll/Esc; dark/light/high-contrast; toggle wikiLinks off | **Ivy** |
| 10 | Docs pass: `api/message-protocol.md` (both messages), CHANGELOG, FEATURES, ROADMAP, TODO (close M4.2), ARCHITECTURE, PROJECT_STATUS, AGENT_HANDOFF | **Sage** + Producer |

## 6. Success Criteria (Definition of Done)

* [ ] Hovering `[[B]]` in the preview shows, after a short dwell, a floating card previewing **B**'s content (rendered, themed).
* [ ] `[[B#Heading]]` previews the **section under that heading** (falls back to the top of B when the heading is absent).
* [ ] `[[B|alias]]` (rendered as "alias") still previews the underlying target **B**.
* [ ] An unresolved target degrades gracefully (tiny "no note found" card or silent no-op — per the design note), never a crash; an ambiguous basename previews the first match.
* [ ] The card dismisses on pointer-leave, scroll, click, and Escape; it never lingers.
* [ ] Both new messages are in the typed unions **and** `requestLinkPreview` is rejected by the boundary guard when malformed.
* [ ] One **delegated** hover listener on the persistent preview root; the DOM render path is untouched; the resolver, heading scanner, and renderer are **reused** (no duplication); one shared `LinkIndexService`.
* [ ] No webview recreation, no new pane, no new dependency. (No new setting unless §9 is resolved otherwise.)
* [ ] Host ships **markdown text**, not HTML; the webview renders it (`html: false` preserved).
* [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` all green; new unit/integration tests added.
* [ ] Docs updated (incl. `api/message-protocol.md`); **M4.2 marked Done** in TODO. QA sign-off in `docs/qa/sprint-4-signoff.md`.

## 7. Guardrails (project-specific)

* **Native + minimal.** One delegated hover listener; the render/patch path is untouched; the card is one reused element, not one-per-hover.
* **Untrusted boundary.** `requestLinkPreview` is guard-validated before the host acts; the host never trusts a raw `target`/`heading`. The host reads only what the workspace resolver resolves.
* **Reuse, don't duplicate.** Resolver, heading scanner, and renderer are all shared with earlier sprints.
* **Security.** Excerpt is plain markdown rendered with `html: false` (no raw HTML injection from a previewed note). Cap the excerpt to keep messages small.
* **Performance is a feature.** Resolution + read happen only after the dwell delay, once per hover; no prefetch, no scan, no live re-render; stale responses are ignored.
* **Graceful degradation.** `wikiLinks` off ⇒ no anchors ⇒ feature inertly absent; missing target ⇒ quiet fallback.

## 8. Branch & merge rules

* Dev branch: `feature/sprint-4` off `main` (`a6d48af`).
* `feat:` commits referencing **M4.2**.
* Regular `--no-ff` merge to `main` after QA sign-off — **never squash or rebase** (preserve the commits, as with Sprints 1–3).
* Keep Prettier (2-space + final newline) green before every commit — the recurring local formatter drift bit every prior sprint; re-check `prettier --check .` before committing.

## 9. Open questions (resolve during the sprint)

* **Own setting?** Is hover preview intrusive enough to warrant `markstudio.preview.linkHoverPreview` (default on), or is gating by `wikiLinks` enough? Producer default: no new setting; revisit if QA finds it intrusive.
* **Missing-target UX:** a tiny "No note found" card, or silent no-op? Lean toward a quiet card for discoverability; confirm in the F5 pass.
* **Card placement:** below the anchor by default, flipping above when near the viewport bottom — confirm the geometry in the F5 pass (jsdom can't measure layout).
* **Dwell + hide timings:** ~300 ms show / short hide grace so the pointer can travel into the card without it vanishing — tune in the F5 pass.
