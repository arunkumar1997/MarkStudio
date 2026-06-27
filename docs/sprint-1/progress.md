# Sprint 1 — Progress Tracker (T-3.5 / M3.5)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Plan: [plan.md](plan.md). Goal: footnotes + GFM (task lists, tables, strikethrough), each toggleable.

---

## Status: DEV COMPLETE — awaiting QA sign-off + Producer merge (T-3.5 / M3.5), 2026-06-27

| Phase | State | Owner | Notes |
|---|---|---|---|
| 0 · Clear blocker (commit + push T-2.2/3.1/3.2/3.3/3.4, per-task split) | ✅ Done | Dev team | Already committed + pushed to `origin/main` (`b5546d7`) before this session |
| 1 · ADR-0019 (plugin vs dependency-free per feature) | ✅ Done | Nova | Per-feature: built-ins (tables/strikethrough), in-tree rule (task lists), `markdown-it-footnote` (footnotes) |
| 2 · Config plumbing (messages guard, ConfigurationService, package.json) | ✅ Done | Nova | 4 new flags, default true |
| 3 · PreviewRenderer wiring (createMarkdownIt + setConfig rebuild) | ✅ Done | Nova | + new `taskLists.ts` core rule |
| 4 · Theming (footnotes, task checkboxes, tables, strikethrough) | ✅ Done | Milo | `--vscode-*` only |
| 5 · Tests (integration + ConfigurationService + fixtures) | ✅ Done | Ivy/Dev | unit 85→93, integration 26→39 |
| 6 · Manual EDH matrix (dark/light/high-contrast) | ☐ Todo | Ivy | the one gap automation can't cover |
| 7 · Docs pass + ROADMAP Phase 3 → Done | ✅ Done | Nova + Producer | ADR-0019, design/gfm.md, message-protocol, CHANGELOG, FEATURES, ROADMAP, TODO, STATUS, HANDOFF |
| 8 · QA sign-off `docs/qa/sprint-1-signoff.md` | ☐ Todo | Ivy | gates merge |

## Pipeline (local, green)
* `npm run lint` ✅ · `npm run typecheck` ✅ · `npm run typecheck:test` ✅ · `npm run build` ✅ · `npm test` ✅ (93 unit + 39 integration) · `npm run test:exthost` ✅ (4)
* Production webview: **2,025.3 KB → 2,041.4 KB (+16.1 KB)**.

## Notes / deviations
* 2026-06-27 — Step 0 blocker was already cleared (the Phase 2.5/3 batch is committed + pushed); this session branched `feature/sprint-1` off `main` `d79a58f` and went straight to implementation.
* 2026-06-27 — `callouts.ts` / `wikiLinks.ts` were reformatted 4→2-space to satisfy `prettier --check` (pre-existing drift in `d79a58f`); whitespace-only.

## Decisions log
* 2026-06-27 — Producer: one `markstudio.preview.*` toggle per feature (not a combined `gfm`), all default `true`. Resolves AGENT_HANDOFF §11.
* 2026-06-27 — Producer: task-list checkboxes render **disabled** (no source write-back this sprint).
* 2026-06-27 — Nova (ADR-0019): `markdown-it-footnote` for footnotes; dependency-free in-tree core rule for task lists; built-in rulers for tables + strikethrough.
