# Sprint 7 — Progress Tracker (M5.1 Templates + M5.3 Daily Notes)

> Live tracker. Update after each phase so the sprint is recoverable if the chat overflows.
> Recovery: "Read [PROJECT_STATUS.md](../PROJECT_STATUS.md) and [docs/sprint-7/progress.md](progress.md). Continue from where it left off."
> Plan: [plan.md](plan.md). Brainstorm: [../research/phase-5-authoring-brainstorm.md](../research/phase-5-authoring-brainstorm.md).
> Goal: ship the Templates engine + Daily Notes — the foundation of Phase 5 — Authoring Workflows.

---

## Status: � Phase A (design) — COMPLETE · 🟡 Phase B (pure modules) — NEXT

| # | Phase / Task | State | Owner | Notes |
|---|---|---|---|---|
| **A** | **Design + ADR-0025 + `design/templates.md`** | ✅ Done | Remy / Sage | ADR-0025 appended to DECISIONS.md (+ index table fixed to include 0023/0024/0025); `docs/design/templates.md` written; plan + progress already on branch |
| 1 | `frontMatterParser.ts` (pure) | ⬜ Not started | Sage | ~30 LOC, fixed schema, in-tree |
| 2 | `variableExpander.ts` (pure) | ⬜ Not started | Sage | Allowlist closed; snippet `${N}` passes through |
| 3 | `dateFormatter.ts` (pure) | ⬜ Not started | Sage | `YYYY/MM/DD/HH/mm` via `Intl.DateTimeFormat` parts |
| 4 | `templateResolver.ts` (pure) | ⬜ Not started | Sage | Workspace > user, basename precedence |
| 5 | `TemplateService.ts` — watchers, scan, debounced rebuild, `onDidChangeTemplates`, `getTemplates/getTemplate/createFromTemplate/openOrCreateDailyNote` | ⬜ Not started | Sage | Mirrors `LinkIndexService` shape |
| 6 | `registerTemplates.ts` — three commands + QuickPick / InputBox + `vscode.openWith` route | ⬜ Not started | Sage + Milo | Milo: QuickPick item formatting (Codicon, description, detail) |
| 7 | `extension.ts` — wire `TemplateService` | ⬜ Not started | Sage | Singleton; pushed to `context.subscriptions` |
| 8 | `package.json` — three commands, five settings, three palette entries | ⬜ Not started | Sage | No new keybinding, no new view |
| 9 | Unit tests — parser / expander / formatter / resolver | ⬜ Not started | Ivy | Target +25 |
| 10 | Integration tests — `TemplateService` watcher round-trip, conflict policy, openExample idempotency | ⬜ Not started | Ivy | Target +5 |
| 11 | Exthost tests — command registration, `dailyNotes.openToday` create-then-open round-trip, opens in MarkStudio | ⬜ Not started | Ivy | Target +3 |
| 12 | Docs pass — ADR-0025, design doc, status/handoff/roadmap/todo/features/changelog/architecture | ⬜ Not started | Sage + Remy | Phase E |
| 13 | Manual F5 matrix (see plan.md §5.13) | ⬜ Not started | Ivy + human | Theme matrix (dark/light/HC) on QuickPick; opens-in-MarkStudio verified |

## Verification (local)

- `npm run lint` — pending
- `npm run typecheck` — pending
- `npm run typecheck:test` — pending
- `npm run build` — pending
- `npm test` — pending (baseline post-Sprint-6: 316 unit + 65 integration)
- `npm run test:exthost` — pending (baseline 13)

## Commits

_(none yet — first commit will be the plan; ADR-0025 + `design/templates.md` follow in Phase A)_

## Bundle sizes (running)

| Bundle | Baseline (post-Sprint-6) | After Sprint 7 | Delta |
|---|---|---|---|
| `dist/extension.js` | _to be measured_ | _pending_ | _pending_ |
| `dist/webview.js` | 2.0 MB | unchanged (target 0) | 0 |
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
