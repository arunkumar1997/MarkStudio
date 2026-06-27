# Sprint 1 — T-3.5 Footnotes & GFM completeness (M3.5)

> Producer: **Remy**. Created 2026-06-27. This closes **Phase 3 — Modern Markdown**.
> Single source of truth for project state remains [docs/PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/AGENT_HANDOFF.md](../AGENT_HANDOFF.md).

---

## 1. Sprint Goal

Deliver **M3.5 — Footnotes & GFM completeness**: footnotes, task lists, tables, and strikethrough render in the live preview, each individually toggleable and degrading gracefully when off. After this, Phase 3 closes and its exit criteria are met.

## 2. Scope (Producer decisions)

**In scope**
* Footnotes (`[^1]` references + `[^1]:` definitions).
* GFM task lists (`- [ ]` / `- [x]`), rendered as checkboxes (read-only in preview).
* GFM tables.
* Strikethrough (`~~text~~`).
* One `markstudio.preview.*` boolean per feature, **default `true`**, `resource` scope — mirrors M3.1–M3.4. Decided against a single combined `gfm` toggle so each feature stays independently controllable (resolves the open question in [AGENT_HANDOFF.md](../AGENT_HANDOFF.md) §11).
* Reuse the `MarkStudioConfig` + `configChanged` seam (T-111) and the `PreviewRenderer.setConfig` rebuild pattern (T-3.1…T-3.4).

**Out of scope (do not pull forward)**
* Editing/toggling task-list checkboxes from the preview (write-back to source) — that is a Phase 4-style interaction; checkboxes render **disabled**.
* Any CodeMirror source-side syntax extension for these features.
* A preview toolbar/Codicon control for Phase 3 toggles (separate discoverability follow-up).
* Wiki-link navigation / resolution (Phase 4).

## 3. Settings to contribute

| Setting | Type | Default | Scope |
|---|---|---|---|
| `markstudio.preview.footnotes` | boolean | `true` | resource |
| `markstudio.preview.taskLists` | boolean | `true` | resource |
| `markstudio.preview.tables` | boolean | `true` | resource |
| `markstudio.preview.strikethrough` | boolean | `true` | resource |

> Note: markdown-it ships GFM tables and strikethrough **built in** (enabled via options/`md.enable`), so prefer toggling the core ruler over adding a dependency where possible. Footnotes need a plugin (`markdown-it-footnote`); task lists need a plugin or a small core rule. Engineer to choose per ADR (see §6).

## 4. Tasks & Owners

| # | Task | Owner | Notes |
|---|---|---|---|
| 1 | Decide plugin vs. dependency-free per feature; record ADR-0019 | **Nova** (Frontend) | Prefer no new dep for tables/strikethrough (built-in); footnotes likely need `markdown-it-footnote` |
| 2 | Extend `MarkStudioConfig` + `isMarkStudioConfig` guard with the 4 flags | **Nova** | `src/messaging/messages.ts` |
| 3 | Resolve the 4 settings in `ConfigurationService.read` | **Nova** | `src/services/ConfigurationService.ts` |
| 4 | Thread flags into `createMarkdownIt(...)` + `setConfig` rebuild | **Nova** | `src/webview/preview/PreviewRenderer.ts` |
| 5 | Contribute the 4 settings in `package.json` | **Nova** | `contributes.configuration` |
| 6 | Theme footnote refs/backrefs, task-list checkboxes, tables, `<del>` via `--vscode-*` only | **Milo** (Art) | `src/webview/main.ts` styles; no custom design system |
| 7 | Integration tests: each feature renders when on, degrades when off, live `setConfig` toggle; `ConfigurationService` cases; update config fixtures across the 4 config-bearing test files | **Ivy** (QA) | mirror the T-3.4 test set |
| 8 | Manual EDH (F5) verification matrix in dark/light/high-contrast | **Ivy** | the one gap that automation can't cover |
| 9 | Docs pass: ADR-0019, `design/gfm.md`, message-protocol, CHANGELOG, FEATURES, ROADMAP (M3.5 → Done, Phase 3 → Done), TODO, STATUS, HANDOFF | **Nova** + Producer review | follow the project's doc discipline |

## 5. Success Criteria (Definition of Done)

* [ ] Footnotes, task lists, tables, and strikethrough render correctly in the preview.
* [ ] Each is toggleable via its `markstudio.preview.*` setting and **degrades gracefully** when off (literal/plain rendering, no broken DOM).
* [ ] Toggling a setting live rebuilds the renderer via `configChanged` → `setConfig` (no webview/editor recreation).
* [ ] Styled entirely via `--vscode-*` variables; correct in dark/light/high-contrast.
* [ ] `npm run lint`, `npm run typecheck`, `npm run typecheck:test`, `npm run build`, `npm test` all green.
* [ ] New tests added; integration + ConfigurationService counts updated.
* [ ] Docs updated; **Phase 3 marked Done** in ROADMAP with exit criteria checked.
* [ ] QA sign-off in `docs/qa/sprint-1-signoff.md`.

## 6. Architecture guardrails (project-specific)

* Native VS Code patterns only — no React/Vue/Tailwind/etc. (per `.github/copilot-instructions.md`).
* Single persistent webview; never replace `webview.html`; never recreate CodeMirror; `retainContextWhenHidden`.
* One markdown-it instance on the hot path; rebuild **only** when a preview flag flips (ADR-0008).
* Prefer no new dependency; if footnotes need `markdown-it-footnote`, justify it in **ADR-0019** and keep it a single small runtime dep.
* Performance is a feature: no full re-render on keystroke; block-diff patching stays intact.

## 7. Blocker to clear first (Producer)

The Phase 2.5/3 batch (T-2.2, T-3.1, T-3.2, T-3.3, T-3.4) is **uncommitted** on top of `faaa927` and CI has never run on it. **Decision:** commit as a per-task split (one commit each, message `feat: ... (T-x.y)`), then push so CI validates before T-3.5 lands on top. Dev team to do this as step 0 of the sprint.

## 8. Branch & merge rules

* Dev branch: `feature/sprint-1` (off `main` after the step-0 commits land).
* Commit footnotes/GFM with `feat:` messages; reference T-3.5.
* Regular merge to `main` after QA sign-off — **never squash or rebase**.
