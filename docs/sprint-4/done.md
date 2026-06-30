# Sprint 4 — Done (M4.2 / Hover preview for links)

> Close-out record. Written by the Producer (Remy) at merge. History lives in git.

---

## Outcome

**M4.2 — Hover preview for wiki-links in the preview** is **complete and merged to `main`**.

Hovering a rendered wiki-link (`[[note]]` / `[[note|alias]]` / `[[note#heading]]`) in the
preview now shows, after a short dwell (~300 ms), a floating **hover card** previewing the
target note — the top of the note, or the section under the named heading. This is the
read-side counterpart to T-4.1b's click-to-open.

- **Merge:** PR #3, `--no-ff` merge `8bf1a86` into `main`.
- **Branch:** `feature/sprint-4` (off `main` `a6d48af`).
- **ADR:** ADR-0022 (host ships Markdown **text**, not HTML; webview renders via the
  existing `html: false` renderer).

## Verification

- **Automated — PASS (228 tests, 0 failures):** 172 unit (+20) · 52 integration (+7) · 4 exthost.
- **Gate:** `npm run lint` (eslint `--max-warnings 0` + prettier) · `npm run typecheck` ·
  `npm run typecheck:test` · `npm run build` (host bundle 47.6 KB) — all green, re-run on
  `main` after the merge.
- **Human F5 EDH hover matrix:** verified working by the human reviewer (hover note /
  `#heading`, missing fallback, dismiss on leave/scroll/click/Esc, theme matrix, `wikiLinks`
  toggle off). QA sign-off: [../qa/sprint-4-signoff.md](../qa/sprint-4-signoff.md).

## Commits

| Commit | Description |
|---|---|
| `31c061e` | feat: hover preview for wiki-links in the preview (M4.2) |
| `24ddb94` | docs: record M4.2 hover preview for links (ADR-0022) |
| `7df2b79` | docs(qa): Sprint 4 M4.2 sign-off |
| `8bf1a86` | Merge M4.2 into `main` (PR #3, `--no-ff`) |

## What shipped

- `src/messaging/messages.ts` — typed `requestLinkPreview` (W→H) + `linkPreviewContent`
  (H→W), both boundary-guarded.
- `src/links/linkExcerpt.ts` (new, pure) — capped excerpt (≤ 60 lines / ≤ 2,000 chars),
  heading-section slice reusing the heading scanner.
- `src/editor/MarkStudioEditorProvider.ts` — `requestLinkPreview` host handler; reuses the
  shared M4.1 resolver (open-first); read wrapped in try/catch → `status:"missing"` on
  no-match and on read failure (defect-#2 lesson carried forward).
- `src/webview/preview/wikiLinkHover.ts` (new) — one delegated `pointerover`/`pointerout`
  pair on the persistent preview pane + dwell timer; stale-reply tracking.
- `src/webview/preview/HoverCard.ts` (new) — one persistent floating card; renders via the
  shared renderer; themed to `--vscode-editorHoverWidget-*`; dismiss on leave/scroll/click/Esc.
- `src/webview/main.ts` — wiring + `linkPreviewContent` routing + stale-response guard.

No new dependency, setting, or command.

## Next

**M4.3 — Embedded notes / transclusion.**
