# Sprint 7 — Progress Tracker (M5.1 Templates + M5.3 Daily Notes)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-7/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Brainstorm: [../research/phase-5-authoring-brainstorm.md](../research/phase-5-authoring-brainstorm.md).
> Goal: ship the Templates engine + Daily Notes — the foundation of Phase 5 — Authoring Workflows.

---

## Status: 🟢 Phase A (design) — COMPLETE · 🟢 Phase B (pure modules) — COMPLETE · � Phase C (service + commands) — COMPLETE · 🟡 Phase D (integration + exthost tests) — NEXT

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0025 + `design/templates.md`** | ✅ Done | Remy / Sage | ADR-0025 appended to DECISIONS.md (+ index table fixed to include 0023/0024/0025); `docs/design/templates.md` written; plan + progress already on branch |
| 1 | `frontMatterParser.ts` (pure) | ✅ Done | Sage | ~30 LOC reader, fixed schema, unknown keys → `meta.extras`, malformed → `meta=null` |
| 2 | `variableExpander.ts` (pure) | ✅ Done | Sage | Closed allowlist; `{{slug}}`=kebab; snippet `${N}` + unknown tokens pass through; `findCursorMarker` |
| 3 | `dateFormatter.ts` (pure) | ✅ Done | Sage | `YYYY/MM/DD/HH/mm` via `Intl.DateTimeFormat` parts; other chars verbatim; TZ-aware |
| 4 | `templateResolver.ts` (pure) | ✅ Done | Sage | Workspace > user by basename; first-root-wins; stable sort; `filterByKind` |
| 5 | `TemplateService.ts` — watchers, scan, debounced rebuild, `onDidChangeTemplates`, `getTemplates/getTemplate/createFromTemplate/openOrCreateDailyNote/createExampleTemplate` | ✅ Done | Sage | Mirrors `LinkIndexService` shape; two-pass expansion; opens via `provider.openInMarkStudio`; exposed on extension API |
| 6 | `registerTemplates.ts` — three commands + QuickPick / InputBox + opens-in-MarkStudio route | ✅ Done | Sage + Milo | Native QuickPick (Codicon + description + detail); inert empty-state hint; empty title → basename |
| 7 | `extension.ts` — wire `TemplateService` | ✅ Done | Sage | Singleton `new TemplateService(context, provider)` + `.start()`; pushed to `context.subscriptions`; on `MarkStudioExtensionApi` |
| 8 | `package.json` — three commands, five settings | ✅ Done | Sage | Commands appear in palette by default; no new keybinding, no new view |
| 9 | Unit tests — parser / expander / formatter / resolver | 🟢 Done (Phase B) | Ivy | +58 (20 parser + 9 formatter + 20 expander + 12 resolver); unit 316 → 374 |
| 10 | Integration tests — `TemplateService` watcher round-trip, conflict policy, openExample idempotency | ⬜ Not started | Ivy | Target +5 |
| 11 | Exthost tests — command registration, `dailyNotes.openToday` create-then-open round-trip, opens in MarkStudio | ⬜ Not started | Ivy | Target +3 |
| 12 | Docs pass — ADR-0025, design doc, status/handoff/roadmap/todo/features/changelog/architecture | ⬜ Not started | Sage + Remy | Phase E |
| 13 | Manual F5 matrix (see plan.md §5.13) | ⬜ Not started | Ivy + human | Theme matrix (dark/light/HC) on QuickPick; opens-in-MarkStudio verified |

## Verification (local)

- `npm run lint` — pending
- `npm run typecheck` — ✅ green (Phase C)
- `npm run typecheck:test` — ✅ green (Phase C)
- `npm run build` — ✅ green (Phase C); webview/mermaid/graph unchanged
- `npm test` — unit ✅ **374** (316 baseline + 58 Phase B); integration 65 pending re-run
- `npm run test:exthost` — pending (baseline 13)

## Commits

_(none yet — first commit will be the plan; ADR-0025 + `design/templates.md` follow in Phase A)_

* `1e8ecc0` — docs(sprint-7): ADR-0025 + design/templates.md (Phase A)
* _(Phase B)_ feat(templates): pure modules — front-matter parser, variable expander, date formatter, two-root resolver + unit tests
* _(Phase C)_ feat(templates): TemplateService + registerTemplates + extension wiring + package.json commands/settings

## Bundle sizes (running)

| Bundle | Baseline (post-Sprint-6) | After Sprint 7 | Delta |
|---|---|---|---|
| `dist/extension.js` | ~88 kB | 94.9 kB | +~7 kB |
| `dist/webview.js` | 2.0 MB | 2.0 MB (unchanged) | 0 |
| `dist/mermaid.js` | 7.5 MB | unchanged | 0 |
| `dist/graph.js` | 19.3 kB | unchanged | 0 |

## Decisions log

* 2026-06-30 — Producer: **Sprint 7 covers M5.1 + M5.3 together** (one engine, two consumers) per the Phase 5 brainstorm (unanimous 6/6 for Concept A).
* 2026-06-30 — Producer: **Zero new runtime dependencies** — in-tree front-matter parser + in-tree date formatter. `gray-matter` / `dayjs` / `date-fns` rejected.
* 2026-06-30 — Producer: **Front-matter schema fixed** — only `kind`/`description`/`output`/`cursor` consumed.
* 2026-06-30 — Producer: **Variable allowlist closed**; snippet `${N}` placeholders pass through verbatim for Sprint 8.
* 2026-06-30 — Producer: **All file creation routes through `vscode.openWith` → `markstudio.editor`** (PR #4 / ADR-0021 lesson).
* 2026-06-30 — Producer: **No overwrite, ever** — `output:` collision opens the existing file with a status-bar info message.
* 2026-06-30 — Producer: **No auto-bootstrap** of `.markstudio/templates/`; opt-in `MarkStudio: Create Example Template` is the on-ramp (brainstorm Disagreement 4).
* 2026-06-30 — Producer: **No webview / no protocol change** in Sprint 7. Snippets (Sprint 8) own the CM6 integration.
* 2026-06-30 — Producer: **No keybinding** contribution in Sprint 7; revisit only if F5 shows discoverability is a gap.
* 2026-06-30 — Producer: **Multi-root precedence = first-workspace-folder wins**; active-root-wins is a deferred refinement.

## Open questions (carry from plan.md §9 — resolve during the sprint)

* In-tree YAML parser shape (Producer leaning: ~30-line line-by-line for the fixed schema).
* Daily-notes title default = `format(today, dailyNotes.dateFormat)` (Producer leaning: yes).
* InputBox for `dailyNotes.openToday`? Default: no — one-key.
* Column for new note? Default: `Active`.
* `markstudio.templates.userFolder` default value: empty string → resolved to `<globalStorageUri>/templates`.
